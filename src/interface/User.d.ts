export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export interface IUserLoginDTO {
  email: string;
  password: string;
}

export interface UserListDTO {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  username: string;
  about: string;
  phone_number: number | null;
  created_at: Date;
  updated_at: Date;
  avatar: string | null;
}

export interface UserCreateInputDTO {
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  username: string;
  password: string;
  about?: string;
  phone_number?: number | null;
}

export interface UserFcmOutputDTO {
  id: string;
  first_name: string;
}

export interface UserUpdateDTO {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  username?: string;
  password?: string;
  about?: string;
  blocked?: boolean;
  phone_number?: number | null;
  roles: string[];
  devices?: string[];
}
