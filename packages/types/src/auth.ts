export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDto {
  email: string;
  name: string;
  pin: string;
  currency?: string;
}

export interface LoginDto {
  email: string;
  pin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshDto {
  refreshToken: string;
}
