export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  instagramConnected: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  isLogin: boolean;
  token: string;
  user: AuthUser;
}
