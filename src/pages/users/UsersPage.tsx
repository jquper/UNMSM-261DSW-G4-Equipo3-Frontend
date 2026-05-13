import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import apiClient from '@/api/client';
import type { User } from '@/types';
import { format } from 'date-fns';

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Administrador', cls: 'bg-purple-100 text-purple-700' },
  doctor: { label: 'Médico', cls: 'bg-blue-100 text-blue-700' },
  nurse: { label: 'Enfermero/a', cls: 'bg-teal-100 text-teal-700' },
  receptionist: { label: 'Recepcionista', cls: 'bg-yellow-100 text-yellow-700' },
  cashier: { label: 'Cajero/a', cls: 'bg-orange-100 text-orange-700' },
  pharmacy_tech: { label: 'Técnico de Farmacia', cls: 'bg-green-100 text-green-700' },
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => { const { data } = await apiClient.get('/users', { params: { page, limit: 20, search: search || undefined } }); return data.data; },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  const { mutate: createUser, isPending } = useMutation({
    mutationFn: async (payload: any) => { const { data } = await apiClient.post('/users', payload); return data.data; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false); reset();
      toast.success('Usuario creado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'name', header: 'Nombre', render: (r: User) => `${r.lastName}, ${r.firstName}` },
    { key: 'email', header: 'Email', render: (r: User) => r.email },
    { key: 'role', header: 'Rol', render: (r: User) => <span className={`badge ${ROLE_MAP[r.role]?.cls}`}>{ROLE_MAP[r.role]?.label}</span> },
    { key: 'lastLoginAt', header: 'Último Acceso', render: (r: User) => r.lastLoginAt ? format(new Date(r.lastLoginAt), 'dd/MM/yyyy HH:mm') : 'Nunca' },
    { key: 'isActive', header: 'Estado', render: (r: User) => <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span> },
    { key: 'createdAt', header: 'Creado', render: (r: User) => format(new Date(r.createdAt), 'dd/MM/yyyy') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Users className="w-6 h-6 text-primary-600" /> Usuarios del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de acceso y permisos</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Usuario</button>
      </div>

      <div className="card">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar usuario..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" />
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={20} onPageChange={setPage} emptyMessage="Sin usuarios" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Usuario" size="md">
        <form onSubmit={handleSubmit((d) => createUser(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
              <input {...register('firstName', { required: true })} className={`input ${errors.firstName ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input {...register('lastName', { required: true })} className={`input ${errors.lastName ? 'input-error' : ''}`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" {...register('email', { required: true })} className={`input ${errors.email ? 'input-error' : ''}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
            <select {...register('role', { required: true })} className="input">
              {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
            <input type="password" {...register('password', { required: true, minLength: 8 })} className={`input ${errors.password ? 'input-error' : ''}`} placeholder="Mínimo 8 caracteres, mayúsc., número y símbolo" />
            {errors.password && <p className="text-xs text-red-600 mt-1">Contraseña inválida (mín. 8 chars, mayúsc., número y @$!%*?&)</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Creando...' : 'Crear Usuario'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
