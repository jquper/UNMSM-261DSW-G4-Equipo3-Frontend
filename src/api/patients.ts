import apiClient from './client';
import type { Patient, PaginatedResponse } from '@/types';

export const patientsApi = {
  findAll: async (page = 1, limit = 20, search?: string) => {
    const { data } = await apiClient.get('/patients', { params: { page, limit, search } });
    return data.data as PaginatedResponse<Patient>;
  },
  findOne: async (id: string) => {
    const { data } = await apiClient.get(`/patients/${id}`);
    return data.data as Patient;
  },
  getStats: async (id: string) => {
    const { data } = await apiClient.get(`/patients/${id}/stats`);
    return data.data;
  },
  create: async (payload: Partial<Patient>) => {
    const { data } = await apiClient.post('/patients', payload);
    return data.data as Patient;
  },
  update: async (id: string, payload: Partial<Patient>) => {
    const { data } = await apiClient.patch(`/patients/${id}`, payload);
    return data.data as Patient;
  },
};
