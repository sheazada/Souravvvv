import { apiClient } from '@/lib/api/client';
import type { CurrentUser } from '@/types/auth';
import type { ApiSuccess } from '@/types/api';

export type LoginPayload = {
  login: string;
  password: string;
};

export type LoginResponse = ApiSuccess<{
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
  expiresIn: string;
}>;

export const AuthApi = {
  login(payload: LoginPayload) {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  me() {
    return apiClient<ApiSuccess<CurrentUser>>('/auth/me');
  },
  permissions() {
    return apiClient<ApiSuccess<{ roles: string[]; permissions: string[] }>>(
      '/auth/my-permissions',
    );
  },
};
