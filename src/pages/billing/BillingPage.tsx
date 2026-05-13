import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { billingApi } from '@/api/index';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pagado', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

export default function BillingPage() {
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState('');
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canPay = is('admin', 'cashier');

  const { data: debtors, isLoading } = useQuery({
    queryKey: ['billing', 'debtors', page],
    queryFn: () => billingApi.getDebtors(page, 20),
  });

  const { data: transactions } = useQuery({
    queryKey: ['billing', 'transactions', selectedPatient?.patient?.id],
    queryFn: () => billingApi.getTransactions(selectedPatient.patient.id, 1, 50),
    enabled: !!selectedPatient,
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const { mutate: payTransaction, isPending } = useMutation({
    mutationFn: ({ id, receiptNumber }: { id: string; receiptNumber?: string }) => billingApi.payTransaction(id, receiptNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setIsPayModalOpen(false); reset();
      toast.success('Pago registrado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const debtorColumns = [
    { key: 'patient', header: 'Paciente', render: (r: any) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'documentNumber', header: 'Documento', render: (r: any) => r.patient.documentNumber },
    { key: 'phone', header: 'Teléfono', render: (r: any) => r.patient.phone || '-' },
    { key: 'balance', header: 'Saldo Deuda', render: (r: any) => <span className="font-bold text-red-600">S/. {parseFloat(r.account.balance).toFixed(2)}</span> },
    { key: 'totalCharged', header: 'Total Cargado', render: (r: any) => `S/. ${parseFloat(r.account.totalCharged).toFixed(2)}` },
    { key: 'totalPaid', header: 'Total Pagado', render: (r: any) => `S/. ${parseFloat(r.account.totalPaid).toFixed(2)}` },
    {
      key: 'actions', header: 'Detalle',
      render: (r: any) => <button onClick={() => setSelectedPatient(r)} className="btn btn-sm bg-blue-50 text-blue-700">Ver Movimientos</button>,
    },
  ];

  const txColumns = [
    { key: 'type', header: 'Tipo', render: (r: any) => <span className={`badge ${r.type === 'charge' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.type === 'charge' ? 'Cargo' : r.type === 'payment' ? 'Pago' : 'Devolución'}</span> },
    { key: 'description', header: 'Descripción', render: (r: any) => <span className="truncate max-w-xs block">{r.description}</span> },
    { key: 'amount', header: 'Monto', render: (r: any) => `S/. ${parseFloat(r.amount).toFixed(2)}` },
    { key: 'status', header: 'Estado', render: (r: any) => <span className={`badge ${STATUS_MAP[r.status]?.cls}`}>{STATUS_MAP[r.status]?.label}</span> },
    { key: 'createdAt', header: 'Fecha', render: (r: any) => format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm') },
    {
      key: 'actions', header: 'Pagar',
      render: (r: any) => canPay && r.status === 'pending' && r.type === 'charge' ? (
        <button onClick={() => { setSelectedTxId(r.id); setIsPayModalOpen(true); }} className="btn btn-sm bg-green-50 text-green-700">Registrar Pago</button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary-600" /> Facturación y Deudas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de cuentas y cobros por paciente</p>
      </div>

      {!selectedPatient ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Pacientes con saldo pendiente</span>
          </div>
          <Table columns={debtorColumns} data={debtors ?? []} loading={isLoading} emptyMessage="No hay deudores pendientes" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedPatient(null)} className="btn-secondary">← Volver</button>
            <div>
              <h2>{selectedPatient.patient.lastName}, {selectedPatient.patient.firstName}</h2>
              <p className="text-sm text-gray-500">Saldo: <span className="font-bold text-red-600">S/. {parseFloat(selectedPatient.account.balance).toFixed(2)}</span></p>
            </div>
          </div>
          <div className="card">
            <Table columns={txColumns} data={transactions?.data ?? []} emptyMessage="Sin movimientos" />
          </div>
        </div>
      )}

      {canPay && <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Registrar Pago" size="sm">
        <form onSubmit={handleSubmit((d) => payTransaction({ id: selectedTxId, receiptNumber: d.receiptNumber }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Recibo (opcional)</label>
            <input {...register('receiptNumber')} className="input" placeholder="Ej: REC-2026-001" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-success">{isPending ? 'Procesando...' : 'Confirmar Pago'}</button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
