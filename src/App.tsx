import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import RoleGuard from '@/components/Auth/RoleGuard';
import Layout from '@/components/Layout/Layout';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import PatientsPage from '@/pages/patients/PatientsPage';
import TicketsPage from '@/pages/tickets/TicketsPage';
import AppointmentsPage from '@/pages/appointments/AppointmentsPage';
import EmergenciesPage from '@/pages/emergencies/EmergenciesPage';
import MedicalRecordsPage from '@/pages/medical-records/MedicalRecordsPage';
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage';
import BillingPage from '@/pages/billing/BillingPage';
import UsersPage from '@/pages/users/UsersPage';
import DoctorsPage from '@/pages/doctors/DoctorsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />

        {/* Todos los roles */}
        <Route path="patients" element={<PatientsPage />} />

        {/* Sin cashier */}
        <Route path="tickets" element={
          <RoleGuard roles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <TicketsPage />
          </RoleGuard>
        } />

        {/* Sin nurse y cashier */}
        <Route path="appointments" element={
          <RoleGuard roles={['admin', 'doctor', 'receptionist']}>
            <AppointmentsPage />
          </RoleGuard>
        } />

        {/* Sin cashier */}
        <Route path="emergencies" element={
          <RoleGuard roles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <EmergenciesPage />
          </RoleGuard>
        } />

        {/* Clínicos + farmacia (lectura) */}
        <Route path="medical-records" element={
          <RoleGuard roles={['admin', 'doctor', 'nurse', 'pharmacy_tech']}>
            <MedicalRecordsPage />
          </RoleGuard>
        } />

        {/* Clínicos + técnico de farmacia */}
        <Route path="prescriptions" element={
          <RoleGuard roles={['admin', 'doctor', 'nurse', 'pharmacy_tech']}>
            <PrescriptionsPage />
          </RoleGuard>
        } />

        {/* Solo admin y cajero */}
        <Route path="billing" element={
          <RoleGuard roles={['admin', 'cashier']}>
            <BillingPage />
          </RoleGuard>
        } />

        {/* Sin cashier */}
        <Route path="doctors" element={
          <RoleGuard roles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <DoctorsPage />
          </RoleGuard>
        } />

        {/* Solo admin */}
        <Route path="users" element={
          <RoleGuard roles={['admin']}>
            <UsersPage />
          </RoleGuard>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
