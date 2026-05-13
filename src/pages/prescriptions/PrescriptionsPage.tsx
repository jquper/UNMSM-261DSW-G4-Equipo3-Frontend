import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pill } from 'lucide-react';
import toast from 'react-hot-toast';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { prescriptionsApi } from '@/api/index';
import type { Prescription } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activa', cls: 'bg-green-100 text-green-700' },
  dispensed: { label: 'Dispensada', cls: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Vencida', cls: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
};

export default function PrescriptionsPage() {
  const [page, setPage] = useState(1);
  const [viewPrescription, setViewPrescription] = useState<any>(null);
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canDispense = is('admin', 'nurse', 'pharmacy_tech');

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptions', page],
    queryFn: () => prescriptionsApi.findAll(page, 20),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => prescriptionsApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prescriptions'] }); toast.success('Estado actualizado'); },
  });

  const { data: detail } = useQuery({
    queryKey: ['prescription', viewPrescription?.id],
    queryFn: () => prescriptionsApi.findOne(viewPrescription.id),
    enabled: !!viewPrescription?.id,
  });

  const columns = [
    { key: 'prescriptionDate', header: 'Fecha', render: (r: Prescription) => format(new Date(r.prescriptionDate + 'T00:00:00'), 'dd/MM/yyyy') },
    { key: 'patient', header: 'Paciente', render: (r: Prescription) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'doctor', header: 'Médico CMP', render: (r: Prescription) => r.doctor.cmp },
    { key: 'status', header: 'Estado', render: (r: Prescription) => <span className={`badge ${STATUS_MAP[r.status]?.cls}`}>{STATUS_MAP[r.status]?.label}</span> },
    {
      key: 'actions', header: 'Acciones',
      render: (r: Prescription) => (
        <div className="flex gap-1">
          <button onClick={() => setViewPrescription(r)} className="btn btn-sm bg-blue-50 text-blue-700">Ver</button>
          {canDispense && r.status === 'active' && <button onClick={() => updateStatus({ id: r.id, status: 'dispensed' })} className="btn btn-sm bg-green-50 text-green-700">Dispensar</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2"><Pill className="w-6 h-6 text-primary-600" /> Recetas Médicas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de prescripciones</p>
      </div>

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={20} onPageChange={setPage} emptyMessage="Sin recetas" />
      </div>

      {viewPrescription && (
        <Modal isOpen={!!viewPrescription} onClose={() => setViewPrescription(null)} title="Detalle de Receta">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Paciente:</span> <span className="font-medium">{detail?.patient?.firstName} {detail?.patient?.lastName}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{detail?.prescriptionDate && format(new Date(detail.prescriptionDate + 'T00:00:00'), 'dd/MM/yyyy')}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={`badge ${detail?.status ? STATUS_MAP[detail.status]?.cls : ''}`}>{detail?.status ? STATUS_MAP[detail.status]?.label : ''}</span></div>
            </div>
            {detail?.notes && <div className="text-sm"><span className="text-gray-500">Notas:</span> <p className="mt-1">{detail.notes}</p></div>}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Medicamentos</h3>
              <div className="space-y-3">
                {detail?.items?.map((item: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="font-medium text-gray-900">{item.medication}</div>
                    {item.genericName && <div className="text-xs text-gray-500">({item.genericName})</div>}
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <span>Dosis: {item.dose}</span>
                      <span>Frecuencia: {item.frequency}</span>
                      <span>Duración: {item.duration}</span>
                      <span>Cantidad: {item.quantity}</span>
                      {item.route && <span>Vía: {item.route}</span>}
                    </div>
                    {item.instructions && <div className="mt-1 text-xs text-gray-500 italic">{item.instructions}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
