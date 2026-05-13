import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

type Role = User['role'];

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as Role | undefined;

  const is = (...roles: Role[]): boolean => !!role && roles.includes(role);

  return {
    role,
    is,
    isAdmin: role === 'admin',
    isDoctor: role === 'doctor',
    isNurse: role === 'nurse',
    isReceptionist: role === 'receptionist',
    isCashier: role === 'cashier',
    isPharmacyTech: role === 'pharmacy_tech',
  };
}
