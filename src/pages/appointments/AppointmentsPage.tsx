import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { appointmentsApi, doctorsApi, specialtiesApi } from '@/api/index';
import { patientsApi } from '@/api/patients';
import type { Appointment } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Programada', cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmada', cls: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'En Curso', cls: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
  no_show: { label: 'No Asistió', cls: 'bg-gray-100 text-gray-700' },
};

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ date: format(new Date(), 'yyyy-MM-dd'), status: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'doctor', 'receptionist');
  const canUpdateStatus = is('admin', 'doctor');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, filters],
    queryFn: () => appointmentsApi.findAll(page, 20, { date: filters.date, status: filters.status || undefined }),
  });

  const { data: doctors } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsApi.findAll() });
  const { data: specialties } = useQuery({ queryKey: ['specialties'], queryFn: specialtiesApi.findAll });
  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientsApi.findAll(1, 10, patientSearch),
    enabled: patientSearch.length > 2,
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: (d: any) => appointmentsApi.create({ ...d, patientId: selectedPatientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsModalOpen(false); reset(); setSelectedPatientId('');
      toast.success('Cita programada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al programar cita'),
  });

  const { mutate: updateAppointment } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => appointmentsApi.update(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Cita actualizada'); },
  });

  const columns = [
    { key: 'appointmentTime', header: 'Hora', render: (r: Appointment) => r.appointmentTime?.substring(0, 5) },
    { key: 'patient', header: 'Paciente', render: (r: Appointment) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'specialty', header: 'Especialidad', render: (r: Appointment) => <span className="badge" style={{ backgroundColor: r.specialty.color + '20', color: r.specialty.color }}>{r.specialty.name}</span> },
    { key: 'reason', header: 'Motivo', render: (r: Appointment) => r.reason || '-' },
    { key: 'fee', header: 'Tarifa', render: (r: Appointment) => r.fee ? `S/. ${r.fee}` : '-' },
    { key: 'status', header: 'Estado', render: (r: Appointment) => <span className={`badge ${STATUS_MAP[r.status]?.cls}`}>{STATUS_MAP[r.status]?.label}</span> },
    {
      key: 'actions', header: 'Acciones',
      render: (r: Appointment) => (
        <div className="flex gap-1">
          {canUpdateStatus && r.status === 'scheduled' && <button onClick={() => updateAppointment({ id: r.id, payload: { status: 'in_progress' } })} className="btn btn-sm bg-purple-50 text-purple-700">Atender</button>}
          {canUpdateStatus && r.status === 'in_progress' && <button onClick={() => updateAppointment({ id: r.id, payload: { status: 'completed' } })} className="btn btn-sm bg-green-50 text-green-700">Completar</button>}
          {canUpdateStatus && (r.status === 'scheduled' || r.status === 'confirmed') && <button onClick={() => updateAppointment({ id: r.id, payload: { status: 'cancelled' } })} className="btn btn-sm bg-red-50 text-red-700">Cancelar</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Calendar className="w-6 h-6 text-primary-600" /> Citas Médicas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de consultas externas</p>
        </div>
        {canCreate && <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva Cita</button>}
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <input type="date" value={filters.date} onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))} className="input w-auto" />
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="input w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={20} onPageChange={setPage} emptyMessage="No hay citas programadas" />
      </div>

      {canCreate && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programar Nueva Cita" size="lg">
        <form onSubmit={handleSubmit((d) => createAppointment(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Paciente *</label>
            <input type="text" placeholder="Buscar por nombre o DNI..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); }} className="input" />
            {patients?.data && patients.data.length > 0 && !selectedPatientId && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {patients.data.map((p: any) => (
                  <button key={p.id} type="button" onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.lastName}, ${p.firstName}`); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0">
                    <span className="font-medium">{p.lastName}, {p.firstName}</span> <span className="text-gray-500">- {p.documentNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad *</label>
              <select {...register('specialtyId', { required: true })} className="input">
                <option value="">-- Seleccionar --</option>
                {specialties?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
              <select {...register('doctorId', { required: true })} className="input">
                <option value="">-- Seleccionar --</option>
                {doctors?.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.user.lastName}, {d.user.firstName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" {...register('appointmentDate', { required: true })} className="input" min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
              <input type="time" {...register('appointmentTime', { required: true })} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</label>
            <textarea {...register('reason')} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa (S/.)</label>
            <input type="number" step="0.01" {...register('fee')} className="input" placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending || !selectedPatientId} className="btn-primary">{isPending ? 'Programando...' : 'Programar Cita'}</button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
