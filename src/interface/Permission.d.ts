export interface PermissionDTO {
  id?: string;
  name: string;
  description: string;
  route: string;
}

export interface PermissionUpdateDTO {
  name?: string;
  description?: string;
}
