import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Siren, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { emergenciesApi } from '@/api/index';
import type { Emergency } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-red-100 text-red-700' },
  in_treatment: { label: 'En Tratamiento', cls: 'bg-orange-100 text-orange-700' },
  observation: { label: 'Observación', cls: 'bg-yellow-100 text-yellow-700' },
  discharged: { label: 'Alta', cls: 'bg-green-100 text-green-700' },
  transferred: { label: 'Transferido', cls: 'bg-blue-100 text-blue-700' },
  deceased: { label: 'Fallecido', cls: 'bg-gray-900 text-white' },
};

const TRIAGE_COLORS: Record<number, string> = {
  1: 'bg-black text-white', 2: 'bg-red-100 text-red-800', 3: 'bg-orange-100 text-orange-800',
  4: 'bg-yellow-100 text-yellow-800', 5: 'bg-green-100 text-green-800',
};

export default function EmergenciesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canUpdateStatus = is('admin', 'doctor', 'nurse');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['emergencies', page, statusFilter],
    queryFn: () => emergenciesApi.findAll(page, 20, { status: statusFilter || undefined }),
    refetchInterval: 20000,
  });

  const { mutate: updateEmergency } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => emergenciesApi.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergencies'] }); toast.success('Actualizado'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const columns = [
    {
      key: 'triageLevel', header: 'Triage',
      render: (r: Emergency) => <span className={`badge ${TRIAGE_COLORS[r.triageLevel]}`}>T{r.triageLevel}</span>,
    },
    { key: 'patient', header: 'Paciente', render: (r: Emergency) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'chiefComplaint', header: 'Motivo', render: (r: Emergency) => <span className="truncate max-w-xs block" title={r.chiefComplaint}>{r.chiefComplaint}</span> },
    { key: 'bed', header: 'Cama', render: (r: Emergency) => r.bed || '-' },
    { key: 'status', header: 'Estado', render: (r: Emergency) => <span className={`badge ${STATUS_MAP[r.status]?.cls}`}>{STATUS_MAP[r.status]?.label}</span> },
    { key: 'arrivalTime', header: 'Ingreso', render: (r: Emergency) => format(new Date(r.arrivalTime), 'HH:mm dd/MM') },
    {
      key: 'actions', header: 'Acciones',
      render: (r: Emergency) => (
        <div className="flex gap-1">
          {canUpdateStatus && r.status === 'active' && <button onClick={() => updateEmergency({ id: r.id, payload: { status: 'in_treatment' } })} className="btn btn-sm bg-orange-50 text-orange-700 hover:bg-orange-100">En Trat.</button>}
          {canUpdateStatus && r.status === 'in_treatment' && <button onClick={() => updateEmergency({ id: r.id, payload: { status: 'observation' } })} className="btn btn-sm bg-yellow-50 text-yellow-700 hover:bg-yellow-100">Obs.</button>}
          {canUpdateStatus && (r.status === 'in_treatment' || r.status === 'observation') && (
            <button onClick={() => updateEmergency({ id: r.id, payload: { status: 'discharged' } })} className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100">Alta</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Siren className="w-6 h-6 text-red-500" /> Emergencias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de urgencias y emergencias</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Table
          columns={columns} data={data?.data ?? []} loading={isLoading}
          total={data?.total} page={page} limit={20} onPageChange={setPage}
          emptyMessage="No hay emergencias activas"
        />
      </div>
    </div>
  );
}
