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
