export interface Department {
    id: number;
    name: string;
    code: string;
    parentId: number | null;
    status: number;
    sort: number;
    children?: Department[];
}

export interface DepartmentFormData {
    id?: number;
    name: string;
    code: string;
    parentId: number | null;
    status: number;
    sort: number;
}
