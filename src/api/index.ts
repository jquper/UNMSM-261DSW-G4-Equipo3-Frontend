import apiClient from './client';
import type { Appointment, Emergency, MedicalRecord, Prescription, BillingAccount, BillingTransaction, PaginatedResponse, Doctor, Specialty } from '@/types';

export const specialtiesApi = {
  findAll: async () => { const { data } = await apiClient.get('/specialties'); return data.data as Specialty[]; },
  create: async (payload: any) => { const { data } = await apiClient.post('/specialties', payload); return data.data; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/specialties/${id}`, payload); return data.data; },
};

export const doctorsApi = {
  findAll: async (specialtyId?: string) => { const { data } = await apiClient.get('/doctors', { params: { specialtyId } }); return data.data as Doctor[]; },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/doctors/${id}`); return data.data as Doctor; },
  create: async (payload: any) => { const { data } = await apiClient.post('/doctors', payload); return data.data; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/doctors/${id}`, payload); return data.data; },
  getSchedule: async (doctorId: string, date: string) => { const { data } = await apiClient.get(`/appointments/schedule/${doctorId}`, { params: { date } }); return data.data; },
};

export const appointmentsApi = {
  findAll: async (page = 1, limit = 20, filters?: any) => { const { data } = await apiClient.get('/appointments', { params: { page, limit, ...filters } }); return data.data as PaginatedResponse<Appointment>; },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/appointments/${id}`); return data.data as Appointment; },
  create: async (payload: any) => { const { data } = await apiClient.post('/appointments', payload); return data.data as Appointment; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/appointments/${id}`, payload); return data.data; },
};

export const emergenciesApi = {
  findAll: async (page = 1, limit = 20, filters?: any) => { const { data } = await apiClient.get('/emergencies', { params: { page, limit, ...filters } }); return data.data as PaginatedResponse<Emergency>; },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/emergencies/${id}`); return data.data as Emergency; },
  create: async (payload: any) => { const { data } = await apiClient.post('/emergencies', payload); return data.data as Emergency; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/emergencies/${id}`, payload); return data.data; },
  getActiveCount: async () => { const { data } = await apiClient.get('/emergencies/active/count'); return data.data; },
};

export const medicalRecordsApi = {
  findAll: async (page = 1, limit = 20, patientId?: string) => { const { data } = await apiClient.get('/medical-records', { params: { page, limit, patientId } }); return data.data as PaginatedResponse<MedicalRecord>; },
  findByPatient: async (patientId: string) => { const { data } = await apiClient.get(`/medical-records/patient/${patientId}`); return data.data as MedicalRecord[]; },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/medical-records/${id}`); return data.data as MedicalRecord; },
  create: async (payload: any) => { const { data } = await apiClient.post('/medical-records', payload); return data.data as MedicalRecord; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/medical-records/${id}`, payload); return data.data; },
};

export const prescriptionsApi = {
  findAll: async (page = 1, limit = 20, patientId?: string) => { const { data } = await apiClient.get('/prescriptions', { params: { page, limit, patientId } }); return data.data as PaginatedResponse<Prescription>; },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/prescriptions/${id}`); return data.data as Prescription; },
  create: async (payload: any) => { const { data } = await apiClient.post('/prescriptions', payload); return data.data as Prescription; },
  updateStatus: async (id: string, status: string) => { const { data } = await apiClient.patch(`/prescriptions/${id}/status`, { status }); return data.data; },
};

export const billingApi = {
  getAccount: async (patientId: string) => { const { data } = await apiClient.get(`/billing/account/${patientId}`); return data.data as BillingAccount; },
  getTransactions: async (patientId: string, page = 1, limit = 20, status?: string) => { const { data } = await apiClient.get(`/billing/transactions/${patientId}`, { params: { page, limit, status } }); return data.data as PaginatedResponse<BillingTransaction>; },
  getDebtors: async (page = 1, limit = 100) => { const { data } = await apiClient.get('/billing/debtors', { params: { page, limit } }); return data.data; },
  createTransaction: async (payload: any) => { const { data } = await apiClient.post('/billing/transactions', payload); return data.data; },
  payTransaction: async (id: string, receiptNumber?: string) => { const { data } = await apiClient.patch(`/billing/transactions/${id}/pay`, { receiptNumber }); return data.data; },
  payAll: async (patientId: string, payload?: { receiptNumber?: string; paymentMethod?: string }) => { const { data } = await apiClient.post(`/billing/pay-all/${patientId}`, payload ?? {}); return data.data; },
  getReceipt: async (receiptNumber: string) => { const { data } = await apiClient.get(`/billing/receipt/${receiptNumber}`); return data.data; },
};
