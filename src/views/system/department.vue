<template>
    <div>
        <div class="container">
            <div class="table-toolbar">
                <div class="table-toolbar-left">
                    <el-button type="warning" :icon="CirclePlusFilled" @click="handleAdd">新增</el-button>
                </div>
            </div>
            <el-table class="mgb20" :data="tableData" row-key="id" :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" default-expand-all>
                <el-table-column prop="name" label="部门名称" min-width="200">
                    <template #default="{ row }">
                        <span>{{ row.name }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="code" label="部门编号" width="150" align="center" />
                <el-table-column prop="status" label="状态" width="100" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                            {{ row.status === 1 ? '正常' : '禁用' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="sort" label="排序值" width="100" align="center" />
                <el-table-column label="操作" width="200" align="center">
                    <template #default="{ row }">
                        <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(row)">
                            编辑
                        </el-button>
                        <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(row)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
        <el-dialog :title="isEdit ? '编辑部门' : '新增部门'" v-model="visible" width="600px" destroy-on-close
            :close-on-click-modal="false" @close="closeDialog">
            <el-form ref="formRef" :model="form" :rules="rules" :label-width="100">
                <el-form-item label="部门名称" prop="name">
                    <el-input v-model="form.name" placeholder="请输入部门名称" />
                </el-form-item>
                <el-form-item label="部门编号" prop="code">
                    <el-input v-model="form.code" placeholder="请输入部门编号" :disabled="isEdit" />
                </el-form-item>
                <el-form-item label="上级部门" prop="parentId">
                    <el-tree-select v-model="form.parentId" :data="departmentTree" :props="{ value: 'id', label: 'name', children: 'children' }"
                        check-strictly :render-after-expand="false" placeholder="请选择上级部门" clearable
                        :default-expand-all="true" style="width: 100%" />
                </el-form-item>
                <el-form-item label="状态" prop="status">
                    <el-radio-group v-model="form.status">
                        <el-radio :value="1">正常</el-radio>
                        <el-radio :value="0">禁用</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="排序值" prop="sort">
                    <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="closeDialog">取消</el-button>
                <el-button type="primary" @click="submitForm(formRef)">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="system-department">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { CirclePlusFilled, Edit, Delete } from '@element-plus/icons-vue';
import { Department, DepartmentFormData } from '@/types/department';
import { fetchDepartmentData } from '@/api';

const formRef = ref<FormInstance>();
const visible = ref(false);
const isEdit = ref(false);
const tableData = ref<Department[]>([]);
const departmentTree = ref<Department[]>([]);

const form = reactive<DepartmentFormData>({
    id: undefined,
    name: '',
    code: '',
    parentId: null,
    status: 1,
    sort: 1
});

const rules: FormRules = {
    name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
    code: [{ required: true, message: '请输入部门编号', trigger: 'blur' }],
};

const getData = async () => {
    const res = await fetchDepartmentData();
    tableData.value = res.data.list;
    departmentTree.value = [{ id: 0, name: '顶级部门', code: '', parentId: null, status: 1, sort: 0, children: res.data.list }];
};
getData();

const flattenTree = (data: Department[]): Department[] => {
    const result: Department[] = [];
    const traverse = (nodes: Department[]) => {
        nodes.forEach(node => {
            result.push({ ...node, children: undefined });
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        });
    };
    traverse(data);
    return result;
};

const allDepartments = computed(() => flattenTree(tableData.value));

const handleAdd = () => {
    Object.assign(form, {
        id: undefined,
        name: '',
        code: '',
        parentId: null,
        status: 1,
        sort: 1
    });
    isEdit.value = false;
    visible.value = true;
};

const handleEdit = (row: Department) => {
    Object.assign(form, {
        id: row.id,
        name: row.name,
        code: row.code,
        parentId: row.parentId,
        status: row.status,
        sort: row.sort
    });
    isEdit.value = true;
    visible.value = true;
};

const closeDialog = () => {
    visible.value = false;
    formRef.value?.resetFields();
};

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    await formEl.validate((valid) => {
        if (valid) {
            const allDepts = allDepartments.value;
            if (!isEdit.value) {
                const exists = allDepts.find(d => d.code === form.code);
                if (exists) {
                    ElMessage.warning('部门编号已存在');
                    return;
                }
            }
            const newId = isEdit.value ? form.id : Math.max(0, ...allDepts.map(d => d.id)) + 1;
            const newDept: Department = {
                id: newId,
                name: form.name,
                code: form.code,
                parentId: form.parentId === 0 ? null : form.parentId,
                status: form.status,
                sort: form.sort
            };
            
            if (isEdit.value) {
                updateDepartmentInTree(tableData.value, newDept);
                ElMessage.success('编辑成功');
            } else {
                if (newDept.parentId === null || newDept.parentId === 0) {
                    tableData.value.push({ ...newDept, children: [] });
                } else {
                    addDepartmentToParent(tableData.value, newDept.parentId, newDept);
                }
            }
            departmentTree.value = [{ id: 0, name: '顶级部门', code: '', parentId: null, status: 1, sort: 0, children: tableData.value }];
            closeDialog();
            ElMessage.success(isEdit.value ? '编辑成功' : '新增成功');
        }
    });
};

const updateDepartmentInTree = (data: Department[], updated: Department): boolean => {
    for (const dept of data) {
        if (dept.id === updated.id) {
            Object.assign(dept, updated);
            return true;
        }
        if (dept.children && updateDepartmentInTree(dept.children, updated)) {
            return true;
        }
    }
    return false;
};

const addDepartmentToParent = (data: Department[], parentId: number, newDept: Department): boolean => {
    for (const dept of data) {
        if (dept.id === parentId) {
            if (!dept.children) dept.children = [];
            dept.children.push(newDept);
            return true;
        }
        if (dept.children && addDepartmentToParent(dept.children, parentId, newDept)) {
            return true;
        }
    }
    return false;
};

const hasChildrenOrUsers = (dept: Department): boolean => {
    if (dept.children && dept.children.length > 0) {
        return true;
    }
    return false;
};

const handleDelete = (row: Department) => {
    if (hasChildrenOrUsers(row)) {
        ElMessage.warning('该部门下存在子部门，无法删除');
        return;
    }
    ElMessageBox.confirm('确定要删除该部门吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        deleteDepartmentFromTree(tableData.value, row.id);
        departmentTree.value = [{ id: 0, name: '顶级部门', code: '', parentId: null, status: 1, sort: 0, children: tableData.value }];
        ElMessage.success('删除成功');
    }).catch(() => {});
};

const deleteDepartmentFromTree = (data: Department[], id: number): boolean => {
    for (let i = 0; i < data.length; i++) {
        if (data[i].id === id) {
            data.splice(i, 1);
            return true;
        }
        if (data[i].children && deleteDepartmentFromTree(data[i].children, id)) {
            return true;
        }
    }
    return false;
};
</script>

<style scoped>
.container {
    padding: 20px;
}
.table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.table-toolbar-left {
    display: flex;
    gap: 10px;
}
.mgb20 {
    margin-bottom: 20px;
}
</style>
