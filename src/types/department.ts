export interface Department {
    id: number;
    deptName: string;
    deptCode: string;
    status: number;
    sort: number;
    parentId?: number;
    createTime?: string;
}
