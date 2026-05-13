import { Navigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import type { User } from '@/types';

interface RoleGuardProps {
  roles: User['role'][];
  children: React.ReactNode;
}

export default function RoleGuard({ roles, children }: RoleGuardProps) {
  const { is } = useRole();
  if (!is(...roles)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
