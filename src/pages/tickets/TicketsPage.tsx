import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Ticket, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { ticketsApi } from '@/api/tickets';
import { patientsApi } from '@/api/patients';
import type { TicketType as TT } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useRole } from '@/hooks/useRole';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  waiting: { label: 'En Espera', cls: 'bg-yellow-100 text-yellow-700' },
  called: { label: 'Llamado', cls: 'bg-blue-100 text-blue-700' },
  in_attention: { label: 'En Atención', cls: 'bg-purple-100 text-purple-700' },
  finished: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  no_show: { label: 'No Se Presentó', cls: 'bg-gray-100 text-gray-700' },
};

const PRIORITY_MAP: Record<string, { label: string; cls: string }> = {
  immediate: { label: 'Inmediato', cls: 'bg-black text-white' },
  very_urgent: { label: 'Muy Urgente', cls: 'bg-red-100 text-red-700' },
  urgent: { label: 'Urgente', cls: 'bg-orange-100 text-orange-700' },
  normal: { label: 'Normal', cls: 'bg-gray-100 text-gray-700' },
  non_urgent: { label: 'No Urgente', cls: 'bg-green-100 text-green-700' },
};

export default function TicketsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', type: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'nurse', 'receptionist');
  const canUpdateStatus = is('admin', 'nurse', 'receptionist');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', page, filters],
    queryFn: () => ticketsApi.findAll(page, 50, { status: filters.status || undefined, type: filters.type || undefined, date: filters.date || undefined }),
    refetchInterval: 15000,
  });

  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientsApi.findAll(1, 10, patientSearch),
    enabled: patientSearch.length > 2,
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const { mutate: createTicket, isPending } = useMutation({
    mutationFn: (d: any) => ticketsApi.create({ ...d, patientId: selectedPatientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setIsModalOpen(false);
      reset();
      setSelectedPatientId('');
      toast.success('Ticket creado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ticketsApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Estado actualizado'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'ticketNumber', header: 'N° Ticket', render: (r: any) => <span className="font-mono text-sm font-bold text-gray-900">{r.ticketNumber}</span> },
    { key: 'type', header: 'Tipo', render: (r: any) => <span className={`badge ${r.type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.type === 'emergency' ? 'Emergencia' : 'Consultorio'}</span> },
    { key: 'priority', header: 'Prioridad', render: (r: any) => <span className={`badge ${PRIORITY_MAP[r.priority]?.cls}`}>{PRIORITY_MAP[r.priority]?.label}</span> },
    { key: 'patient', header: 'Paciente', render: (r: any) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'status', header: 'Estado', render: (r: any) => <span className={`badge ${STATUS_MAP[r.status]?.cls}`}>{STATUS_MAP[r.status]?.label}</span> },
    { key: 'createdAt', header: 'Hora', render: (r: any) => format(new Date(r.createdAt), 'HH:mm') },
    {
      key: 'actions', header: 'Acciones',
      render: (r: any) => (
        <div className="flex gap-1">
          {canUpdateStatus && r.status === 'waiting' && <button onClick={() => updateStatus({ id: r.id, status: 'called' })} className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100">Llamar</button>}
          {canUpdateStatus && r.status === 'called' && <button onClick={() => updateStatus({ id: r.id, status: 'in_attention' })} className="btn btn-sm bg-purple-50 text-purple-700 hover:bg-purple-100">Atender</button>}
          {canUpdateStatus && r.status === 'in_attention' && <button onClick={() => updateStatus({ id: r.id, status: 'finished' })} className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100">Finalizar</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Ticket className="w-6 h-6 text-primary-600" /> Tickets de Atención</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cola de atención en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          {canCreate && <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Ticket</button>}
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))} className="input w-auto">
            <option value="">Todos los tipos</option>
            <option value="emergency">Emergencia</option>
            <option value="outpatient">Consultorio</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="input w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={filters.date} onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))} className="input w-auto" />
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={50} onPageChange={setPage} emptyMessage="No hay tickets" />
      </div>

      {canCreate && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Ticket de Atención">
        <form onSubmit={handleSubmit((d) => createTicket(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Paciente *</label>
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="input"
            />
            {patients?.data && patients.data.length > 0 && !selectedPatientId && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {patients.data.map((p: any) => (
                  <button key={p.id} type="button" onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.lastName}, ${p.firstName} - ${p.documentNumber}`); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{p.lastName}, {p.firstName}</span>
                    <span className="text-gray-500 ml-2">{p.documentType}: {p.documentNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atención *</label>
            <select {...register('type', { required: true })} className="input">
              <option value="emergency">Emergencia</option>
              <option value="outpatient">Consultorio Externo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select {...register('priority')} className="input">
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
              <option value="very_urgent">Muy Urgente</option>
              <option value="immediate">Inmediato</option>
              <option value="non_urgent">No Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Módulo / Consultorio</label>
            <input {...register('module')} className="input" placeholder="Ej: Consultorio 1, Emergencias" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Triaje</label>
            <textarea {...register('triageNotes')} rows={3} className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending || !selectedPatientId} className="btn-primary">
              {isPending ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
