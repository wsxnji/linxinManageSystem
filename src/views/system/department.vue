<template>
    <div>
        <TableSearch :query="query" :options="searchOpt" :search="handleSearch" />
        <div class="container">
            <TableCustom :columns="columns" :tableData="tableData" :total="page.total" 
                :delFunc="handleDelete" :page-change="changePage" :editFunc="handleEdit">
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="visible = true">新增</el-button>
                </template>
                <template #status="{ rows }">
                    <el-tag :type="rows.status === 1 ? 'success' : 'danger'">
                        {{ rows.status === 1 ? '正常' : '禁用' }}
                    </el-tag>
                </template>
                <template #operator="{ rows }">
                    <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(rows)">
                        编辑
                    </el-button>
                    <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(rows)">
                        删除
                    </el-button>
                </template>
            </TableCustom>
        </div>
        <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
                <el-form-item label="部门编号" prop="deptCode">
                    <el-input v-model="form.deptCode" :disabled="isEdit" placeholder="请输入部门编号" />
                </el-form-item>
                <el-form-item label="部门名称" prop="deptName">
                    <el-input v-model="form.deptName" placeholder="请输入部门名称" />
                </el-form-item>
                <el-form-item label="上级部门" prop="parentId">
                    <el-tree-select
                        v-model="form.parentId"
                        :data="deptTreeData"
                        :props="{ value: 'id', label: 'deptName', children: 'children' }"
                        value-key="id"
                        placeholder="请选择上级部门"
                        check-strictly
                        clearable
                        :render-after-expand="false"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="状态" prop="status">
                    <el-switch
                        v-model="form.status"
                        :active-value="1"
                        :inactive-value="0"
                        active-text="正常"
                        inactive-text="禁用"
                    />
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-input-number v-model="form.sort" :min="1" :max="999" controls-position="right" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="closeDialog">取消</el-button>
                <el-button type="primary" @click="saveForm(formRef)">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-department">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { CirclePlusFilled, Edit, Delete } from '@element-plus/icons-vue';
import { Department } from '@/types/department';
import { fetchDepartmentData } from '@/api';
import TableCustom from '@/components/table-custom.vue';
import TableSearch from '@/components/table-search.vue';

const query = reactive({
    name: '',
});
const searchOpt = ref([
    { type: 'input', label: '部门名称：', prop: 'name' }
])
const handleSearch = () => {
    changePage(1);
};

const columns = ref([
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'deptName', label: '部门名称' },
    { prop: 'deptCode', label: '部门编号' },
    { prop: 'status', label: '状态', width: 100 },
    { prop: 'sort', label: '排序', width: 100 },
    { prop: 'operator', label: '操作', width: 200 },
])

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
})

const tableData = ref<Department[]>([]);
const allDeptData = ref<Department[]>([]);

const getData = async () => {
    const res = await fetchDepartmentData()
    allDeptData.value = res.data.list;
    tableData.value = res.data.list;
    page.total = res.data.pageTotal;
};
getData();

const deptTreeData = computed(() => {
    const buildTree = (depts: Department[], parentId: number = 0): any[] => {
        return depts
            .filter(d => d.parentId === parentId)
            .map(d => ({
                ...d,
                children: buildTree(depts, d.id)
            }));
    };
    return buildTree(allDeptData.value);
});

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const visible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
    id: 0,
    deptCode: '',
    deptName: '',
    parentId: 0,
    status: 1,
    sort: 1
});

const rules: FormRules = {
    deptCode: [
        { required: true, message: '请输入部门编号', trigger: 'blur' }
    ],
    deptName: [
        { required: true, message: '请输入部门名称', trigger: 'blur' }
    ]
};

const handleEdit = (row: Department) => {
    Object.assign(form, {
        id: row.id,
        deptCode: row.deptCode,
        deptName: row.deptName,
        parentId: row.parentId || 0,
        status: row.status,
        sort: row.sort
    });
    isEdit.value = true;
    visible.value = true;
};

const checkDeptCodeUnique = (deptCode: string, excludeId?: number): boolean => {
    return !allDeptData.value.some(d => d.deptCode === deptCode && d.id !== excludeId);
};

const saveForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    await formEl.validate((valid) => {
        if (valid) {
            if (!isEdit.value && !checkDeptCodeUnique(form.deptCode)) {
                ElMessage.error('部门编号已存在，请更换');
                return;
            }
            if (isEdit.value && !checkDeptCodeUnique(form.deptCode, form.id)) {
                ElMessage.error('部门编号已存在，请更换');
                return;
            }
            if (isEdit.value) {
                const index = tableData.value.findIndex(d => d.id === form.id);
                if (index !== -1) {
                    tableData.value[index] = { ...form };
                }
                ElMessage.success('编辑成功');
            } else {
                const newDept: Department = {
                    id: Date.now(),
                    ...form,
                    createTime: new Date().toISOString().split('T')[0]
                };
                tableData.value.push(newDept);
                allDeptData.value.push(newDept);
                ElMessage.success('新增成功');
            }
            closeDialog();
            getData();
        }
    });
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    formRef.value?.resetFields();
    Object.assign(form, {
        id: 0,
        deptCode: '',
        deptName: '',
        parentId: 0,
        status: 1,
        sort: 1
    });
};

const handleDelete = (row: Department) => {
    ElMessageBox.confirm('确认删除该部门吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        const hasChildren = allDeptData.value.some(d => d.parentId === row.id);
        if (hasChildren) {
            ElMessage.error('该部门存在下级部门，无法删除');
            return;
        }
        tableData.value = tableData.value.filter(d => d.id !== row.id);
        allDeptData.value = allDeptData.value.filter(d => d.id !== row.id);
        ElMessage.success('删除成功');
    }).catch(() => {});
};
</script>

<style scoped></style>
