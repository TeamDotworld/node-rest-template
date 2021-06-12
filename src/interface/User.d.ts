export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export interface TokenPayload {
  id: string;
  email: string;
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
  about: string;
  mobile: string | null;
  country_code: number | null;
  created_at: Date;
  updated_at: Date;
  avatar: string;
}

export interface UserCreateInputDTO {
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  password: string;
  about?: string;
  mobile?: string;
}

export interface UserFcmOutputDTO {
  id: string;
  first_name: string;
}

export interface UserUpdateDTO {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  password?: string;
  about?: string;
  blocked?: boolean;
  mobile?: string | null;
  roles: string[];
  devices?: string[];
}
