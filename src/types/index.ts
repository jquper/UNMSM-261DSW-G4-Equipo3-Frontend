export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'cashier' | 'pharmacy_tech';
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  documentType: 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F' | 'OTRO';
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

export type DoctorAvailabilityStatus = 'available' | 'busy' | 'off_duty';

export interface Doctor {
  id: string;
  cmp: string;
  consultationFee: string;
  schedule?: Record<string, any>;
  isActive: boolean;
  isAvailable: boolean;
  availabilityStatus: DoctorAvailabilityStatus;
  user: { id: string; firstName: string; lastName: string; email: string };
  specialty: { id: string; name: string; color: string };
}

export type TicketType = 'emergency' | 'outpatient';
export type TicketPriority = 'immediate' | 'very_urgent' | 'urgent' | 'normal' | 'non_urgent';
export type TicketStatus = 'waiting' | 'called' | 'in_attention' | 'finished' | 'cancelled' | 'no_show';

export interface Ticket {
  id: string;
  ticketNumber: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  triageNotes?: string;
  module?: string;
  createdAt: string;
  calledAt?: string;
  attendedAt?: string;
  finishedAt?: string;
  patient: { id: string; firstName: string; lastName: string; documentNumber: string };
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  fee?: string;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; documentNumber: string };
  doctor: { id: string; cmp: string };
  specialty: { id: string; name: string; color: string };
}

export type EmergencyStatus = 'active' | 'in_treatment' | 'observation' | 'discharged' | 'transferred' | 'deceased';

export interface Emergency {
  id: string;
  triageLevel: 1 | 2 | 3 | 4 | 5;
  chiefComplaint: string;
  vitalSigns?: Record<string, any>;
  status: EmergencyStatus;
  bed?: string;
  arrivalTime: string;
  dischargeTime?: string;
  patient: { id: string; firstName: string; lastName: string; birthDate: string; bloodType?: string };
}

export interface MedicalRecord {
  id: string;
  diagnosis: string;
  diagnosisCie10?: string;
  anamnesis?: string;
  physicalExam?: string;
  treatment?: string;
  indications?: string;
  labOrders?: string;
  imagingOrders?: string;
  followUpDate?: string;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string };
  doctor: { id: string; cmp: string };
}

export interface Prescription {
  id: string;
  prescriptionDate: string;
  status: 'active' | 'dispensed' | 'expired' | 'cancelled';
  notes?: string;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string };
  doctor: { id: string; cmp: string };
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  genericName?: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export type TransactionConcept = 'emergencia' | 'cita' | 'medicina' | 'otro';
export type PaymentMethod = 'cash' | 'card' | 'electronic_wallet' | 'transfer';
export type ReceiptType = 'boleta' | 'factura';

export interface BillingAccount {
  id: string;
  patientId: string;
  balance: string;
  totalCharged: string;
  totalPaid: string;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  type: 'charge' | 'payment' | 'refund';
  concept: TransactionConcept;
  amount: string;
  description: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: PaymentMethod;
  receiptType?: ReceiptType;
  receiptNumber?: string;
  amountPaid?: string;
  change?: string;
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

// ── Pharmacy ──────────────────────────────────────────────────────────────────

export interface PharmacyInventory {
  id: string;
  medicationName: string;
  genericName?: string;
  presentation?: string;
  concentration?: string;
  laboratoryName?: string;
  stock: number;
  minStock: number;
  unitPrice: string;
  expirationDate?: string;
  lotNumber?: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MedicationOrderStatus = 'pending' | 'ready' | 'delivered' | 'cancelled';

export interface MedicationOrderItem {
  id: string;
  inventoryId?: string;
  medicationName: string;
  requestedQuantity: number;
  dispensedQuantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface MedicationOrder {
  id: string;
  prescriptionId: string;
  patientId: string;
  dispensedBy?: string;
  status: MedicationOrderStatus;
  notes?: string;
  totalAmount: string;
  dispensedAt?: string;
  createdAt: string;
  items?: MedicationOrderItem[];
}

// ── Cash Register ─────────────────────────────────────────────────────────────

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister {
  id: string;
  name: string;
  status: CashRegisterStatus;
  openingBalance: string;
  closingBalance?: string;
  expectedBalance?: string;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  assignedUser: { id: string; firstName: string; lastName: string };
}

export type ReceiptSeriesType = 'boleta' | 'factura';

export interface ReceiptSeries {
  id: string;
  type: ReceiptSeriesType;
  prefix: string;
  currentNumber: number;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
