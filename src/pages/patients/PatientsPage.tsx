import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserSquare2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { patientsApi } from '@/api/patients';
import type { Patient } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

export default function PatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'receptionist');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => patientsApi.findAll(page, 20, search || undefined),
  });

  const createForm = useForm<Partial<Patient>>();
  const editForm = useForm<Partial<Patient>>();

  const { mutate: createPatient, isPending: isCreating } = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success('Paciente registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar'),
  });

  const { mutate: updatePatient, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Patient> }) =>
      patientsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingPatient(null);
      toast.success('Paciente actualizado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient);
    editForm.reset({
      documentType: patient.documentType,
      documentNumber: patient.documentNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      district: patient.district,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
    });
  };

  const columns = [
    { key: 'documentNumber', header: 'Documento', render: (r: Patient) => `${r.documentType}: ${r.documentNumber}` },
    { key: 'name', header: 'Nombre', render: (r: Patient) => `${r.lastName}, ${r.firstName}` },
    { key: 'birthDate', header: 'F. Nacimiento', render: (r: Patient) => r.birthDate ? format(new Date(r.birthDate + 'T00:00:00'), 'dd/MM/yyyy') : '-' },
    { key: 'gender', header: 'Género', render: (r: Patient) => r.gender === 'M' ? 'Masculino' : r.gender === 'F' ? 'Femenino' : 'Otro' },
    { key: 'phone', header: 'Teléfono', render: (r: Patient) => r.phone || '-' },
    { key: 'bloodType', header: 'Sangre', render: (r: Patient) => r.bloodType || '-' },
    {
      key: 'isActive', header: 'Estado',
      render: (r: Patient) => (
        <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {r.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r: Patient) => canCreate ? (
        <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ) : null,
    },
  ];

  const patientFormFields = (form: ReturnType<typeof useForm<Partial<Patient>>>) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
          <select {...form.register('documentType', { required: true })} className="input">
            <option value="DNI">DNI</option>
            <option value="CE">CE</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número Documento *</label>
          <input {...form.register('documentNumber', { required: true, minLength: 8 })} className={`input ${form.formState.errors.documentNumber ? 'input-error' : ''}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
          <input {...form.register('firstName', { required: true })} className={`input ${form.formState.errors.firstName ? 'input-error' : ''}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
          <input {...form.register('lastName', { required: true })} className={`input ${form.formState.errors.lastName ? 'input-error' : ''}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento *</label>
          <input type="date" {...form.register('birthDate', { required: true })} className={`input ${form.formState.errors.birthDate ? 'input-error' : ''}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Género *</label>
          <select {...form.register('gender', { required: true })} className="input">
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input {...form.register('phone')} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo Sanguíneo</label>
          <select {...form.register('bloodType')} className="input">
            <option value="">-- Seleccionar --</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input {...form.register('address')} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
          <textarea {...form.register('allergies')} rows={2} className="input resize-none" placeholder="Ej: Penicilina, Ibuprofeno" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones Crónicas</label>
          <textarea {...form.register('chronicConditions')} rows={2} className="input resize-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Emergencia</label>
          <input {...form.register('emergencyContactName')} className="input" placeholder="Nombre del contacto" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Emergencia</label>
          <input {...form.register('emergencyContactPhone')} className="input" />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><UserSquare2 className="w-6 h-6 text-primary-600" /> Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión del padrón de pacientes</p>
        </div>
        {canCreate && (
          <button onClick={() => { createForm.reset(); setIsCreateOpen(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Paciente
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
        </div>
        <Table
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          total={data?.total}
          page={page}
          limit={20}
          onPageChange={setPage}
          emptyMessage="No se encontraron pacientes"
        />
      </div>

      {/* Create Modal */}
      {canCreate && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Registrar Nuevo Paciente" size="lg">
          <form onSubmit={createForm.handleSubmit((d) => createPatient(d))} className="space-y-4">
            {patientFormFields(createForm)}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isCreating} className="btn-primary">
                {isCreating ? 'Guardando...' : 'Registrar Paciente'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {canCreate && (
        <Modal isOpen={!!editingPatient} onClose={() => setEditingPatient(null)} title="Editar Paciente" size="lg">
          <form onSubmit={editForm.handleSubmit((d) => updatePatient({ id: editingPatient!.id, payload: d }))} className="space-y-4">
            {patientFormFields(editForm)}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="rounded" />
                Paciente activo
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingPatient(null)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isUpdating} className="btn-primary">
                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
