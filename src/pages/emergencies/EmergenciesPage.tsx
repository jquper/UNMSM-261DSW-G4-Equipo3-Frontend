import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Siren, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { emergenciesApi } from '@/api/index';
import { patientsApi } from '@/api/patients';
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

const TRIAGE_LABELS: Record<number, string> = {
  1: 'T1 - Reanimación',
  2: 'T2 - Emergencia',
  3: 'T3 - Urgencia',
  4: 'T4 - Menos urgente',
  5: 'T5 - No urgente',
};

export default function EmergenciesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'nurse', 'doctor');
  const canUpdateStatus = is('admin', 'doctor', 'nurse');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['emergencies', page, statusFilter],
    queryFn: () => emergenciesApi.findAll(page, 20, { status: statusFilter || undefined }),
    refetchInterval: 20000,
  });

  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientsApi.findAll(1, 10, patientSearch),
    enabled: patientSearch.length > 2,
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const { mutate: createEmergency, isPending: isCreating } = useMutation({
    mutationFn: (d: any) => emergenciesApi.create({ ...d, patientId: selectedPatientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencies'] });
      setIsCreateOpen(false);
      reset();
      setSelectedPatientId('');
      setPatientSearch('');
      toast.success('Emergencia registrada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar'),
  });

  const { mutate: updateEmergency } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => emergenciesApi.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergencies'] }); toast.success('Actualizado'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

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
          {canCreate && (
            <button onClick={() => { reset(); setIsCreateOpen(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Nueva Emergencia
            </button>
          )}
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

      {/* Create Modal */}
      {canCreate && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Registrar Emergencia" size="lg">
          <form onSubmit={handleSubmit((d) => createEmergency(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); }}
                className="input"
              />
              {patients?.data && patients.data.length > 0 && !selectedPatientId && (
                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {patients.data.map((p: any) => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.lastName}, ${p.firstName}`); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0">
                      <span className="font-medium">{p.lastName}, {p.firstName}</span>
                      <span className="text-gray-500"> — {p.documentNumber}</span>
                      {p.bloodType && <span className="ml-2 text-xs badge bg-red-50 text-red-700">{p.bloodType}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Triage *</label>
                <select {...register('triageLevel', { required: true, valueAsNumber: true })} className="input">
                  <option value="">-- Seleccionar --</option>
                  {Object.entries(TRIAGE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cama / Box</label>
                <input {...register('bed')} className="input" placeholder="Ej: Box 3, Sala A" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta *</label>
              <textarea {...register('chiefComplaint', { required: true })} rows={3} className="input resize-none" placeholder="Describe el motivo principal de la emergencia..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isCreating || !selectedPatientId} className="btn-primary">
                {isCreating ? 'Registrando...' : 'Registrar Emergencia'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
