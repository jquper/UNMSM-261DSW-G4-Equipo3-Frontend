import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserSquare2, Ticket, Calendar,
  Siren, FileText, Pill, CreditCard, Stethoscope,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRole } from '@/hooks/useRole';
import type { User } from '@/types';
import clsx from 'clsx';

type Role = User['role'];

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tickets', icon: Ticket, label: 'Tickets', roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/emergencies', icon: Siren, label: 'Emergencias', roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/appointments', icon: Calendar, label: 'Citas', roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/patients', icon: UserSquare2, label: 'Pacientes' },
  { to: '/medical-records', icon: FileText, label: 'Historias Clínicas', roles: ['admin', 'doctor', 'nurse', 'pharmacy_tech'] },
  { to: '/prescriptions', icon: Pill, label: 'Recetas', roles: ['admin', 'doctor', 'nurse', 'pharmacy_tech'] },
  { to: '/billing', icon: CreditCard, label: 'Facturación', roles: ['admin', 'cashier'] },
  { to: '/doctors', icon: Stethoscope, label: 'Médicos', roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/users', icon: Users, label: 'Usuarios', roles: ['admin'] },
];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  nurse: 'Enfermero/a',
  receptionist: 'Recepcionista',
  cashier: 'Cajero/a',
  pharmacy_tech: 'Técnico de Farmacia',
};

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const { is } = useRole();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Clínica</p>
            <p className="text-xs text-gray-500">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label, exact, roles }) => {
          if (roles && !is(...roles)) return null;
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
