export interface RoleCreateInput {
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface Permissions {
  permission_id: string;
}
