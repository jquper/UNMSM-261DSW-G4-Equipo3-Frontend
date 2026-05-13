import { useQuery } from '@tanstack/react-query';
import { Stethoscope } from 'lucide-react';
import Table from '@/components/ui/Table';
import { doctorsApi, specialtiesApi } from '@/api/index';
import type { Doctor } from '@/types';

export default function DoctorsPage() {
  const { data: doctors, isLoading } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsApi.findAll() });

  const columns = [
    { key: 'cmp', header: 'CMP', render: (r: Doctor) => r.cmp },
    { key: 'name', header: 'Nombre', render: (r: Doctor) => `Dr(a). ${r.user.lastName}, ${r.user.firstName}` },
    { key: 'email', header: 'Email', render: (r: Doctor) => r.user.email },
    { key: 'specialty', header: 'Especialidad', render: (r: Doctor) => <span className="badge" style={{ backgroundColor: r.specialty.color + '20', color: r.specialty.color }}>{r.specialty.name}</span> },
    { key: 'fee', header: 'Tarifa', render: (r: Doctor) => `S/. ${parseFloat(r.consultationFee).toFixed(2)}` },
    { key: 'isActive', header: 'Estado', render: (r: Doctor) => <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary-600" /> Médicos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Directorio del personal médico</p>
      </div>
      <div className="card">
        <Table columns={columns} data={doctors ?? []} loading={isLoading} emptyMessage="Sin médicos registrados" />
      </div>
    </div>
  );
}
