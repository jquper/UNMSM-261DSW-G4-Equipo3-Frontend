import apiClient from './client';
import type {
  Appointment,
  Emergency,
  MedicalRecord,
  Prescription,
  BillingAccount,
  BillingTransaction,
  PaginatedResponse,
  Doctor,
  Specialty,
  PharmacyInventory,
  MedicationOrder,
  CashRegister,
  ReceiptSeries,
} from '@/types';

export const specialtiesApi = {
  findAll: async () => { const { data } = await apiClient.get('/specialties'); return data.data as Specialty[]; },
  create: async (payload: any) => { const { data } = await apiClient.post('/specialties', payload); return data.data; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/specialties/${id}`, payload); return data.data; },
};

export const doctorsApi = {
  findAll: async (filters?: { specialtyId?: string; availabilityStatus?: string; isAvailable?: boolean }) => {
    const { data } = await apiClient.get('/doctors', { params: filters });
    return data.data as Doctor[];
  },
  findOne: async (id: string) => { const { data } = await apiClient.get(`/doctors/${id}`); return data.data as Doctor; },
  create: async (payload: any) => { const { data } = await apiClient.post('/doctors', payload); return data.data; },
  update: async (id: string, payload: any) => { const { data } = await apiClient.patch(`/doctors/${id}`, payload); return data.data; },
  updateAvailability: async (id: string, payload: { availabilityStatus: string; isAvailable?: boolean }) => {
    const { data } = await apiClient.patch(`/doctors/${id}/availability`, payload);
    return data.data;
  },
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
  getTransactions: async (patientId: string, page = 1, limit = 100, status?: string, concept?: string) => {
    const { data } = await apiClient.get(`/billing/transactions/${patientId}`, { params: { page, limit, status, concept } });
    return data.data as PaginatedResponse<BillingTransaction>;
  },
  getDebtors: async (page = 1, limit = 100) => { const { data } = await apiClient.get('/billing/debtors', { params: { page, limit } }); return data.data; },
  createTransaction: async (payload: any) => { const { data } = await apiClient.post('/billing/transactions', payload); return data.data; },
  payTransaction: async (id: string, payload: { receiptNumber?: string; paymentMethod?: string; receiptType?: string; amountPaid?: string }) => {
    const { data } = await apiClient.patch(`/billing/transactions/${id}/pay`, payload);
    return data.data;
  },
  cancelTransaction: async (id: string, reason: string) => {
    const { data } = await apiClient.patch(`/billing/transactions/${id}/cancel`, { reason });
    return data.data;
  },
  payAll: async (patientId: string, payload: { receiptNumber?: string; paymentMethod?: string; receiptType?: string; amountPaid?: string }) => {
    const { data } = await apiClient.post(`/billing/pay-all/${patientId}`, payload ?? {});
    return data.data;
  },
  getReceipt: async (receiptNumber: string) => { const { data } = await apiClient.get(`/billing/receipt/${receiptNumber}`); return data.data; },
};

// ── Pharmacy ──────────────────────────────────────────────────────────────────

export const pharmacyApi = {
  // Inventory
  findAllInventory: async (page = 1, limit = 50, lowStock = false, search?: string) => {
    const { data } = await apiClient.get('/pharmacy/inventory', { params: { page, limit, lowStock, search } });
    return data.data as PaginatedResponse<PharmacyInventory>;
  },
  findOneInventory: async (id: string) => {
    const { data } = await apiClient.get(`/pharmacy/inventory/${id}`);
    return data.data as PharmacyInventory;
  },
  getLowStockAlerts: async () => {
    const { data } = await apiClient.get('/pharmacy/inventory/alerts');
    return data.data as PharmacyInventory[];
  },
  createInventoryItem: async (payload: any) => {
    const { data } = await apiClient.post('/pharmacy/inventory', payload);
    return data.data as PharmacyInventory;
  },
  updateInventoryItem: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/pharmacy/inventory/${id}`, payload);
    return data.data as PharmacyInventory;
  },
  adjustStock: async (id: string, quantity: number, reason?: string) => {
    const { data } = await apiClient.patch(`/pharmacy/inventory/${id}/adjust-stock`, { quantity, reason });
    return data.data as PharmacyInventory;
  },
  // Orders
  findAllOrders: async (page = 1, limit = 20, status?: string) => {
    const { data } = await apiClient.get('/pharmacy/orders', { params: { page, limit, status } });
    return data.data as PaginatedResponse<MedicationOrder>;
  },
  findOneOrder: async (id: string) => {
    const { data } = await apiClient.get(`/pharmacy/orders/${id}`);
    return data.data as MedicationOrder;
  },
  dispensePrescription: async (payload: { prescriptionId: string; items: { inventoryId: string; quantity: number }[]; notes?: string }) => {
    const { data } = await apiClient.post('/pharmacy/dispense', payload);
    return data.data;
  },
};

// ── Cash Register ─────────────────────────────────────────────────────────────

export const cashRegisterApi = {
  findAll: async (page = 1, limit = 20, status?: string) => {
    const { data } = await apiClient.get('/cash-register', { params: { page, limit, status } });
    return data.data as PaginatedResponse<CashRegister>;
  },
  findOne: async (id: string) => {
    const { data } = await apiClient.get(`/cash-register/${id}`);
    return data.data as CashRegister & { transactions: any[] };
  },
  getMyOpenRegister: async () => {
    const { data } = await apiClient.get('/cash-register/my-register');
    return data.data as CashRegister | null;
  },
  open: async (payload: { name: string; openingBalance?: string; notes?: string }) => {
    const { data } = await apiClient.post('/cash-register/open', payload);
    return data.data as CashRegister;
  },
  close: async (id: string, payload: { closingBalance: string; notes?: string }) => {
    const { data } = await apiClient.patch(`/cash-register/${id}/close`, payload);
    return data.data as CashRegister;
  },
  collect: async (payload: { transactionId: string; paymentMethod: string; receiptType: string; amountPaid: string }) => {
    const { data } = await apiClient.post('/cash-register/collect', payload);
    return data.data;
  },
  // Series
  findAllSeries: async () => {
    const { data } = await apiClient.get('/cash-register/series/list');
    return data.data as ReceiptSeries[];
  },
  createSeries: async (payload: { type: string; prefix: string; currentNumber?: number }) => {
    const { data } = await apiClient.post('/cash-register/series', payload);
    return data.data as ReceiptSeries;
  },
  updateSeries: async (id: string, payload: { prefix?: string; currentNumber?: number; isActive?: boolean }) => {
    const { data } = await apiClient.patch(`/cash-register/series/${id}`, payload);
    return data.data as ReceiptSeries;
  },
};
