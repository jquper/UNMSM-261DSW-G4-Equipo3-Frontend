import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Stethoscope, Pencil, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { doctorsApi, specialtiesApi } from '@/api/index';
import apiClient from '@/api/client';
import type { Doctor, DoctorAvailabilityStatus } from '@/types';
import { useRole } from '@/hooks/useRole';

const AVAILABILITY_CONFIG: Record<DoctorAvailabilityStatus, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'bg-green-100 text-green-700' },
  busy: { label: 'Ocupado', className: 'bg-yellow-100 text-yellow-700' },
  off_duty: { label: 'Fuera de turno', className: 'bg-gray-100 text-gray-500' },
};

export default function DoctorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [availabilityDoctor, setAvailabilityDoctor] = useState<Doctor | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canManage = is('admin');
  const canChangeAvailability = is('admin', 'doctor', 'receptionist');

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', availabilityFilter],
    queryFn: () => doctorsApi.findAll(availabilityFilter ? { availabilityStatus: availabilityFilter } : undefined),
  });
  const { data: specialties } = useQuery({ queryKey: ['specialties'], queryFn: specialtiesApi.findAll });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => { const { data } = await apiClient.get('/users', { params: { limit: 200 } }); return data.data; },
    enabled: isCreateOpen,
  });

  const createForm = useForm<any>();
  const editForm = useForm<any>();
  const availabilityForm = useForm<{ availabilityStatus: DoctorAvailabilityStatus }>();

  const doctorUserIds = new Set((doctors ?? []).map((d: Doctor) => d.user.id));
  const availableUsers = (usersData?.data ?? []).filter((u: any) => u.role === 'doctor' && !doctorUserIds.has(u.id));

  const { mutate: createDoctor, isPending: isCreating } = useMutation({
    mutationFn: (payload: any) => doctorsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success('Médico registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar'),
  });

  const { mutate: updateDoctor, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => doctorsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setEditingDoctor(null);
      toast.success('Médico actualizado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const { mutate: updateAvailability, isPending: isUpdatingAvailability } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DoctorAvailabilityStatus }) =>
      doctorsApi.updateAvailability(id, { availabilityStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setAvailabilityDoctor(null);
      toast.success('Disponibilidad actualizada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar disponibilidad'),
  });

  const openEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    editForm.reset({
      specialtyId: doctor.specialty.id,
      consultationFee: doctor.consultationFee,
      isActive: doctor.isActive,
    });
  };

  const openAvailability = (doctor: Doctor) => {
    setAvailabilityDoctor(doctor);
    availabilityForm.reset({ availabilityStatus: doctor.availabilityStatus });
  };

  const columns = [
    { key: 'cmp', header: 'CMP', render: (r: Doctor) => r.cmp },
    { key: 'name', header: 'Nombre', render: (r: Doctor) => `Dr(a). ${r.user.lastName}, ${r.user.firstName}` },
    { key: 'email', header: 'Email', render: (r: Doctor) => r.user.email },
    { key: 'specialty', header: 'Especialidad', render: (r: Doctor) => <span className="badge" style={{ backgroundColor: r.specialty.color + '20', color: r.specialty.color }}>{r.specialty.name}</span> },
    { key: 'fee', header: 'Tarifa', render: (r: Doctor) => `S/. ${parseFloat(r.consultationFee).toFixed(2)}` },
    {
      key: 'availability', header: 'Disponibilidad',
      render: (r: Doctor) => {
        const cfg = AVAILABILITY_CONFIG[r.availabilityStatus] ?? AVAILABILITY_CONFIG.off_duty;
        return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
      },
    },
    { key: 'isActive', header: 'Estado', render: (r: Doctor) => <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span> },
    {
      key: 'actions', header: '',
      render: (r: Doctor) => (
        <div className="flex items-center gap-1">
          {canChangeAvailability && (
            <button
              onClick={() => openAvailability(r)}
              className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
              title="Cambiar disponibilidad"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}
          {canManage && (
            <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary-600" /> Médicos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Directorio del personal médico</p>
        </div>
        {canManage && (
          <button onClick={() => { createForm.reset(); setIsCreateOpen(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Médico
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Disponibilidad:</label>
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="input w-48 text-sm py-1.5"
        >
          <option value="">Todos</option>
          {Object.entries(AVAILABILITY_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        {availabilityFilter && (
          <button onClick={() => setAvailabilityFilter('')} className="text-xs text-gray-400 hover:text-gray-600">
            Limpiar filtro
          </button>
        )}
      </div>

      <div className="card">
        <Table columns={columns} data={doctors ?? []} loading={isLoading} emptyMessage="Sin médicos registrados" />
      </div>

      {/* Create Modal */}
      {canManage && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Registrar Médico" size="md">
          <form onSubmit={createForm.handleSubmit((d) => createDoctor(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (rol Médico) *</label>
              <select {...createForm.register('userId', { required: true })} className="input">
                <option value="">-- Seleccionar usuario --</option>
                {availableUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.lastName}, {u.firstName} — {u.email}</option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No hay usuarios con rol "Médico" sin perfil asignado. Crea primero un usuario con ese rol.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad *</label>
              <select {...createForm.register('specialtyId', { required: true })} className="input">
                <option value="">-- Seleccionar especialidad --</option>
                {specialties?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CMP *</label>
                <input {...createForm.register('cmp', { required: true })} className="input" placeholder="Número de colegiatura" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa de Consulta (S/.) *</label>
                <input type="number" step="0.01" min="0" {...createForm.register('consultationFee', { required: true })} className="input" placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isCreating} className="btn-primary">
                {isCreating ? 'Guardando...' : 'Registrar Médico'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {canManage && (
        <Modal isOpen={!!editingDoctor} onClose={() => setEditingDoctor(null)} title="Editar Médico" size="md">
          {editingDoctor && (
            <form onSubmit={editForm.handleSubmit((d) => updateDoctor({ id: editingDoctor.id, payload: d }))} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <p className="font-medium">{editingDoctor.user.lastName}, {editingDoctor.user.firstName}</p>
                <p className="text-gray-500">{editingDoctor.user.email} · CMP {editingDoctor.cmp}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad *</label>
                <select {...editForm.register('specialtyId', { required: true })} className="input">
                  <option value="">-- Seleccionar especialidad --</option>
                  {specialties?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa de Consulta (S/.) *</label>
                <input type="number" step="0.01" min="0" {...editForm.register('consultationFee', { required: true })} className="input" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" {...editForm.register('isActive')} className="rounded" />
                  Médico activo
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingDoctor(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isUpdating} className="btn-primary">
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Availability Modal */}
      <Modal
        isOpen={!!availabilityDoctor}
        onClose={() => setAvailabilityDoctor(null)}
        title="Cambiar Disponibilidad"
        size="sm"
      >
        {availabilityDoctor && (
          <form
            onSubmit={availabilityForm.handleSubmit((d) =>
              updateAvailability({ id: availabilityDoctor.id, status: d.availabilityStatus })
            )}
            className="space-y-4"
          >
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <p className="font-medium">Dr(a). {availabilityDoctor.user.lastName}, {availabilityDoctor.user.firstName}</p>
              <p className="text-gray-500">{availabilityDoctor.specialty.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de disponibilidad *</label>
              <div className="space-y-2">
                {(Object.entries(AVAILABILITY_CONFIG) as [DoctorAvailabilityStatus, { label: string; className: string }][]).map(([value, { label, className }]) => (
                  <label key={value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value={value}
                      {...availabilityForm.register('availabilityStatus')}
                      className="text-primary-600"
                    />
                    <span className={`badge ${className}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAvailabilityDoctor(null)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isUpdatingAvailability} className="btn-primary">
                {isUpdatingAvailability ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
