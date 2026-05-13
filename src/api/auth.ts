import apiClient from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data.data as { accessToken: string; refreshToken: string; user: any };
  },
  logout: () => apiClient.post('/auth/logout'),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  getSessions: async () => {
    const { data } = await apiClient.get('/auth/sessions');
    return data.data;
  },
  revokeSession: (sessionId: string) => apiClient.delete(`/auth/sessions/${sessionId}`),
  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },
};
