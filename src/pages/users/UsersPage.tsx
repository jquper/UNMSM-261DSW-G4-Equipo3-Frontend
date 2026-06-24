import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, Pencil } from 'lucide-react';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => { const { data } = await apiClient.get('/users', { params: { page, limit: 20, search: search || undefined } }); return data.data; },
  });

  const createForm = useForm<any>();
  const editForm = useForm<any>();

  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: async (payload: any) => { const { data } = await apiClient.post('/users', payload); return data.data; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success('Usuario creado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await apiClient.patch(`/users/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('Usuario actualizado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const openEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const columns = [
    { key: 'name', header: 'Nombre', render: (r: User) => `${r.lastName}, ${r.firstName}` },
    { key: 'email', header: 'Email', render: (r: User) => r.email },
    { key: 'role', header: 'Rol', render: (r: User) => <span className={`badge ${ROLE_MAP[r.role]?.cls}`}>{ROLE_MAP[r.role]?.label}</span> },
    { key: 'lastLoginAt', header: 'Último Acceso', render: (r: User) => r.lastLoginAt ? format(new Date(r.lastLoginAt), 'dd/MM/yyyy HH:mm') : 'Nunca' },
    { key: 'isActive', header: 'Estado', render: (r: User) => <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span> },
    { key: 'createdAt', header: 'Creado', render: (r: User) => format(new Date(r.createdAt), 'dd/MM/yyyy') },
    {
      key: 'actions', header: '',
      render: (r: User) => (
        <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Users className="w-6 h-6 text-primary-600" /> Usuarios del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de acceso y permisos</p>
        </div>
        <button onClick={() => { createForm.reset(); setIsCreateOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="card">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar usuario..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-9" />
        </div>
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={20} onPageChange={setPage} emptyMessage="Sin usuarios" />
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Usuario" size="md">
        <form onSubmit={createForm.handleSubmit((d) => createUser(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
              <input {...createForm.register('firstName', { required: true })} className={`input ${createForm.formState.errors.firstName ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input {...createForm.register('lastName', { required: true })} className={`input ${createForm.formState.errors.lastName ? 'input-error' : ''}`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" {...createForm.register('email', { required: true })} className={`input ${createForm.formState.errors.email ? 'input-error' : ''}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
            <select {...createForm.register('role', { required: true })} className="input">
              {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
            <input type="password" {...createForm.register('password', { required: true, minLength: 8 })} className={`input ${createForm.formState.errors.password ? 'input-error' : ''}`} placeholder="Mínimo 8 caracteres, mayúsc., número y símbolo" />
            {createForm.formState.errors.password && <p className="text-xs text-red-600 mt-1">Contraseña inválida (mín. 8 chars, mayúsc., número y @$!%*?&)</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isCreating} className="btn-primary">{isCreating ? 'Creando...' : 'Crear Usuario'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuario" size="md">
        {editingUser && (
          <form onSubmit={editForm.handleSubmit((d) => updateUser({ id: editingUser.id, payload: d }))} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <p className="font-medium">{editingUser.email}</p>
              <p className="text-gray-500">Creado el {format(new Date(editingUser.createdAt), 'dd/MM/yyyy')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input {...editForm.register('firstName', { required: true })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input {...editForm.register('lastName', { required: true })} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select {...editForm.register('role', { required: true })} className="input">
                {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="rounded" />
                Usuario activo
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isUpdating} className="btn-primary">
                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
