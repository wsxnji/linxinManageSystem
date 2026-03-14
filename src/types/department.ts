export interface Department {
    id: number;
    deptCode: string;
    deptName: string;
    parentId: number | null;
    status: string;
    sort: number;
    children?: Department[];
}
