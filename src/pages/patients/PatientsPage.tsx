import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserSquare2 } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'receptionist');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => patientsApi.findAll(page, 20, search || undefined),
  });

  const { mutate: createPatient, isPending } = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsModalOpen(false);
      toast.success('Paciente registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Patient>>();

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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><UserSquare2 className="w-6 h-6 text-primary-600" /> Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión del padrón de pacientes</p>
        </div>
        {canCreate && (
          <button onClick={() => { reset(); setIsModalOpen(true); }} className="btn-primary">
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

      {canCreate && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Paciente" size="lg">
        <form onSubmit={handleSubmit((d) => createPatient(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
              <select {...register('documentType', { required: true })} className="input">
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Documento *</label>
              <input {...register('documentNumber', { required: true, minLength: 8 })} className={`input ${errors.documentNumber ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
              <input {...register('firstName', { required: true })} className={`input ${errors.firstName ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input {...register('lastName', { required: true })} className={`input ${errors.lastName ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento *</label>
              <input type="date" {...register('birthDate', { required: true })} className={`input ${errors.birthDate ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Género *</label>
              <select {...register('gender', { required: true })} className="input">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input {...register('phone')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo Sanguíneo</label>
              <select {...register('bloodType')} className="input">
                <option value="">-- Seleccionar --</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input {...register('address')} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
              <textarea {...register('allergies')} rows={2} className="input resize-none" placeholder="Ej: Penicilina, Ibuprofeno" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones Crónicas</label>
              <textarea {...register('chronicConditions')} rows={2} className="input resize-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Emergencia</label>
              <input {...register('emergencyContactName')} className="input" placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Emergencia</label>
              <input {...register('emergencyContactPhone')} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Guardando...' : 'Registrar Paciente'}
            </button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
