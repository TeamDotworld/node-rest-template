export interface PermissionDTO {
  id?: string;
  name: string;
  description: string;
}

export interface PermissionUpdateDTO {
  name?: string;
  description?: string;
}
