export type AuthUser = {
  id: string;
  name: string;
  email: string;
  birthDate: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type CurrentUserResponse = {
  user: AuthUser;
};

export type UpdateProfileRequest = {
  name: string;
  birthDate?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  birthDate: string;
};
