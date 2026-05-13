import { useQuery } from '@tanstack/react-query';
import { Ticket, Siren, TrendingUp, CreditCard, AlertCircle, Pill, DollarSign, Clock } from 'lucide-react';
import { ticketsApi } from '@/api/tickets';
import { emergenciesApi, billingApi, prescriptionsApi } from '@/api/index';
import { useAuthStore } from '@/store/authStore';
import { useRole } from '@/hooks/useRole';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const TRIAGE_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Resucitación', cls: 'bg-black text-white' },
  2: { label: 'Emergencia', cls: 'bg-red-100 text-red-800' },
  3: { label: 'Urgente', cls: 'bg-orange-100 text-orange-800' },
  4: { label: 'Menos Urgente', cls: 'bg-yellow-100 text-yellow-800' },
  5: { label: 'No Urgente', cls: 'bg-green-100 text-green-800' },
};

function CashierDashboard() {
  const { data: debtors, isLoading: loadingDebtors } = useQuery({
    queryKey: ['billing', 'debtors', 1],
    queryFn: () => billingApi.getDebtors(1, 50),
    refetchInterval: 30000,
  });

  const { data: prescriptions, isLoading: loadingRx } = useQuery({
    queryKey: ['prescriptions', 1],
    queryFn: () => prescriptionsApi.findAll(1, 50),
    refetchInterval: 30000,
  });

  const debtorList: any[] = Array.isArray(debtors) ? debtors : (debtors as any)?.data ?? [];
  const rxList: any[] = (prescriptions as any)?.data ?? [];
  const activeRx = rxList.filter((r: any) => r.status === 'active');

  const totalDebt = debtorList.reduce((acc: number, d: any) => acc + parseFloat(d.account?.balance ?? '0'), 0);
  const totalDebtors = debtorList.length;

  const stats = [
    {
      label: 'Pacientes con Deuda',
      value: totalDebtors,
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-200',
    },
    {
      label: 'Deuda Total Pendiente',
      value: `S/. ${totalDebt.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-orange-50 text-orange-600',
      border: 'border-orange-200',
    },
    {
      label: 'Recetas por Dispensar',
      value: activeRx.length,
      icon: Pill,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`card border ${border} flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top deudores */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            Pacientes con Saldo Pendiente
          </h2>
          <Link to="/billing" className="text-sm text-primary-600 hover:underline font-medium">
            Ver todos →
          </Link>
        </div>
        {loadingDebtors ? (
          <p className="text-gray-400 text-sm text-center py-8">Cargando...</p>
        ) : debtorList.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No hay deudores pendientes</p>
        ) : (
          <div className="space-y-2">
            {debtorList.slice(0, 8).map((d: any) => (
              <div key={d.account?.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {d.patient?.lastName}, {d.patient?.firstName}
                  </p>
                  <p className="text-xs text-gray-500">{d.patient?.documentNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">
                    S/. {parseFloat(d.account?.balance ?? '0').toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Cargado: S/. {parseFloat(d.account?.totalCharged ?? '0').toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recetas activas por dispensar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-500" />
            Recetas Activas por Dispensar
          </h2>
          <Link to="/prescriptions" className="text-sm text-primary-600 hover:underline font-medium">
            Ver todas →
          </Link>
        </div>
        {loadingRx ? (
          <p className="text-gray-400 text-sm text-center py-8">Cargando...</p>
        ) : activeRx.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No hay recetas pendientes</p>
        ) : (
          <div className="space-y-2">
            {activeRx.slice(0, 6).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.patient?.lastName}, {r.patient?.firstName}
                  </p>
                  <p className="text-xs text-gray-500">CMP: {r.doctor?.cmp}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {r.prescriptionDate ? format(new Date(r.prescriptionDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicDashboard() {
  const { data: ticketStats } = useQuery({
    queryKey: ['tickets', 'stats', 'today'],
    queryFn: ticketsApi.getTodayStats,
    refetchInterval: 30000,
  });

  const { data: emergenciesData } = useQuery({
    queryKey: ['emergencies', 'active'],
    queryFn: () => emergenciesApi.findAll(1, 10, { status: 'active' }),
    refetchInterval: 30000,
  });

  const waitingTickets = ticketStats?.filter((s: any) => s.status === 'waiting').reduce((acc: number, s: any) => acc + Number(s.total), 0) ?? 0;
  const todayTotal = ticketStats?.reduce((acc: number, s: any) => acc + Number(s.total), 0) ?? 0;
  const activeEmergencies = emergenciesData?.total ?? 0;

  const stats = [
    { label: 'Tickets en Espera', value: waitingTickets, icon: Ticket, color: 'bg-yellow-50 text-yellow-600', border: 'border-yellow-200' },
    { label: 'Total Tickets Hoy', value: todayTotal, icon: TrendingUp, color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
    { label: 'Emergencias Activas', value: activeEmergencies, icon: Siren, color: 'bg-red-50 text-red-600', border: 'border-red-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`card border ${border} flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Emergencies */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Siren className="w-5 h-5 text-red-500" />
            Emergencias Activas
          </h2>
          <span className="badge bg-red-100 text-red-700">{activeEmergencies} activas</span>
        </div>
        {emergenciesData?.data.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No hay emergencias activas</p>
        ) : (
          <div className="space-y-3">
            {emergenciesData?.data.map((em: any) => (
              <div key={em.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className={`badge ${TRIAGE_LABELS[em.triageLevel]?.cls}`}>
                  T{em.triageLevel} - {TRIAGE_LABELS[em.triageLevel]?.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {em.patient.firstName} {em.patient.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{em.chiefComplaint}</p>
                </div>
                {em.bed && (
                  <span className="text-xs text-gray-500 font-medium">Cama {em.bed}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket stats by type */}
      {ticketStats && ticketStats.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-500" />
            Estadísticas de Tickets Hoy
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ticketStats.map((stat: any) => (
              <div key={`${stat.status}-${stat.type}`} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <p className="text-lg font-bold text-gray-900">{stat.total}</p>
                <p className="text-xs text-gray-500 capitalize">{stat.status.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400 capitalize">{stat.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { isCashier } = useRole();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.firstName}
        </h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {isCashier ? <CashierDashboard /> : <ClinicDashboard />}
    </div>
  );
}
