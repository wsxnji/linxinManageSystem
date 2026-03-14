<template>
    <div>
        <div class="container">
            <TableCustom :columns="columns" :tableData="tableData" :total="page.total" :delFunc="handleDelete"
                :page-change="changePage" :editFunc="handleEdit">
                <template #toolbarBtn>
                    <el-button type="warning" :icon="CirclePlusFilled" @click="visible = true">新增</el-button>
                </template>
            </TableCustom>
        </div>
        <el-dialog :title="isEdit ? '编辑' : '新增'" v-model="visible" width="700px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
                <el-form-item label="部门编号" prop="deptCode">
                    <el-input v-model="form.deptCode" :disabled="isEdit" placeholder="请输入部门编号" clearable></el-input>
                </el-form-item>
                <el-form-item label="部门名称" prop="deptName">
                    <el-input v-model="form.deptName" placeholder="请输入部门名称" clearable></el-input>
                </el-form-item>
                <el-form-item label="上级部门" prop="parentId">
                    <el-tree-select v-model="form.parentId" :data="departmentTree" :props="treeProps" placeholder="请选择上级部门"
                        clearable check-strictly :render-after-expand="false" />
                </el-form-item>
                <el-form-item label="状态" prop="status">
                    <el-select v-model="form.status" placeholder="请选择状态" clearable>
                        <el-option label="正常" value="normal"></el-option>
                        <el-option label="禁用" value="disabled"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-input-number v-model="form.sort" :min="1" controls-position="right"></el-input-number>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="saveEdit(formRef)">保 存</el-button>
                </el-form-item>
            </el-form>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-department">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { CirclePlusFilled } from '@element-plus/icons-vue';
import { Department } from '@/types/department';
import { fetchDepartmentData } from '@/api';
import TableCustom from '@/components/table-custom.vue';

const formRef = ref<FormInstance>();

const query = reactive({
    name: '',
});

let columns = ref([
    { type: 'index', label: '序号', width: 55, align: 'center' },
    { prop: 'deptName', label: '部门名称' },
    { prop: 'deptCode', label: '部门编号' },
    { prop: 'status', label: '状态', formatter: (value: string) => value === 'normal' ? '正常' : '禁用' },
    { prop: 'sort', label: '排序' },
    { prop: 'operator', label: '操作', width: 250 },
])

const page = reactive({
    index: 1,
    size: 10,
    total: 0,
})
const tableData = ref<Department[]>([]);
const allDepartments = ref<Department[]>([]);

const getData = async () => {
    const res = await fetchDepartmentData()
    tableData.value = res.data.list;
    allDepartments.value = res.data.list;
    page.total = res.data.pageTotal;
};

const changePage = (val: number) => {
    page.index = val;
    getData();
};

const treeProps = {
    value: 'id',
    label: 'deptName',
    children: 'children'
};

const departmentTree = computed(() => {
    const buildTree = (data: Department[], parentId: number | null = null, excludeId?: number): Department[] => {
        return data
            .filter(item => item.parentId === parentId && (!excludeId || item.id !== excludeId))
            .map(item => ({
                ...item,
                children: buildTree(data, item.id, excludeId)
            }));
    };
    return buildTree(allDepartments.value, null, isEdit.value && form.id > 0 ? form.id : undefined);
});

const rules: FormRules = {
    deptCode: [{ required: true, message: '部门编号不能为空', trigger: 'blur' }],
    deptName: [{ required: true, message: '部门名称不能为空', trigger: 'blur' }],
    status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
    sort: [{ required: true, message: '排序不能为空', trigger: 'blur' }],
};

const visible = ref(false);
const isEdit = ref(false);
const form = reactive({
    id: 0,
    deptCode: '',
    deptName: '',
    parentId: null as number | null,
    status: 'normal',
    sort: 1,
});

const handleEdit = (row: Department) => {
    form.id = row.id;
    form.deptCode = row.deptCode;
    form.deptName = row.deptName;
    form.parentId = row.parentId;
    form.status = row.status;
    form.sort = row.sort;
    isEdit.value = true;
    visible.value = true;
};

const saveEdit = (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    formEl.validate(valid => {
        if (!valid) return false;
        
        if (!isEdit.value) {
            const isCodeExists = allDepartments.value.some(dept => dept.deptCode === form.deptCode);
            if (isCodeExists) {
                ElMessage.error('部门编号已存在，请使用其他编号');
                return;
            }
        }

        if (isEdit.value) {
            const index = tableData.value.findIndex(item => item.id === form.id!);
            if (index !== -1) {
                tableData.value[index] = { ...tableData.value[index], ...form } as Department;
            }
            ElMessage.success('编辑成功');
        } else {
            const newId = Math.max(...allDepartments.value.map(d => d.id), 0) + 1;
            tableData.value.push({
                id: newId,
                deptCode: form.deptCode!,
                deptName: form.deptName!,
                parentId: form.parentId || null,
                status: form.status!,
                sort: form.sort!,
            } as Department);
            allDepartments.value.push({
                id: newId,
                deptCode: form.deptCode!,
                deptName: form.deptName!,
                parentId: form.parentId || null,
                status: form.status!,
                sort: form.sort!,
            } as Department);
            ElMessage.success('新增成功');
        }
        closeDialog();
    });
};

const closeDialog = () => {
    visible.value = false;
    isEdit.value = false;
    formRef.value?.resetFields();
    form.id = 0;
    form.deptCode = '';
    form.deptName = '';
    form.parentId = null;
    form.status = 'normal';
    form.sort = 1;
};

const handleDelete = (row: Department) => {
    ElMessageBox.confirm('确认删除该部门吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        const index = tableData.value.findIndex(item => item.id === row.id);
        if (index !== -1) {
            tableData.value.splice(index, 1);
            const allIndex = allDepartments.value.findIndex(item => item.id === row.id);
            if (allIndex !== -1) {
                allDepartments.value.splice(allIndex, 1);
            }
        }
        ElMessage.success('删除成功');
    }).catch(() => {
        ElMessage.info('已取消删除');
    });
};

onMounted(() => {
    getData();
});
</script>

<style scoped></style>
