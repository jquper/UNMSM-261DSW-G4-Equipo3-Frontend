import apiClient from './client';
import type { Ticket, PaginatedResponse } from '@/types';

export const ticketsApi = {
  findAll: async (page = 1, limit = 50, filters?: { status?: string; type?: string; date?: string }) => {
    const { data } = await apiClient.get('/tickets', { params: { page, limit, ...filters } });
    return data.data as PaginatedResponse<Ticket>;
  },
  findOne: async (id: string) => {
    const { data } = await apiClient.get(`/tickets/${id}`);
    return data.data as Ticket;
  },
  getTodayStats: async () => {
    const { data } = await apiClient.get('/tickets/stats/today');
    return data.data;
  },
  create: async (payload: { patientId: string; type: string; priority?: string; triageNotes?: string; module?: string }) => {
    const { data } = await apiClient.post('/tickets', payload);
    return data.data as Ticket;
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const { data } = await apiClient.patch(`/tickets/${id}/status`, { status, notes });
    return data.data as Ticket;
  },
};
