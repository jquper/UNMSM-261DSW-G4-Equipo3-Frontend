import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Search, ArrowLeft, Receipt, Printer, AlertCircle, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import { billingApi } from '@/api/index';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRole } from '@/hooks/useRole';

const REF_TYPE_LABEL: Record<string, string> = {
  appointment: 'Consulta',
  prescription: 'Medicamentos',
  emergency: 'Emergencia',
};

function fmt(amount: string | number) {
  return `S/. ${parseFloat(String(amount)).toFixed(2)}`;
}

function ReceiptDocument({ receipt }: { receipt: any }) {
  return (
    <div id="receipt-printable" className="font-mono text-sm text-gray-800 p-4">
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-3">
        <p className="text-lg font-bold uppercase tracking-widest">Clínica UNMSM</p>
        <p className="text-xs text-gray-500">Comprobante de Pago</p>
      </div>

      <div className="mb-3 space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">N° Comprobante:</span>
          <span className="font-bold">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fecha:</span>
          <span>{receipt.paidAt ? format(new Date(receipt.paidAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}</span>
        </div>
      </div>

      <div className="border border-gray-300 rounded p-2 mb-3 text-xs space-y-0.5">
        <p className="font-semibold text-gray-700">Paciente</p>
        <p>{receipt.patient.lastName}, {receipt.patient.firstName}</p>
        <p className="text-gray-500">DNI/Doc: {receipt.patient.documentNumber}</p>
        {receipt.patient.phone && <p className="text-gray-500">Tel: {receipt.patient.phone}</p>}
      </div>

      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="text-left py-1">Descripción</th>
            <th className="text-right py-1">Monto</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item: any) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-1 pr-2">
                <span className="text-gray-500">[{REF_TYPE_LABEL[item.referenceType] ?? item.referenceType ?? 'Manual'}]</span>{' '}
                {item.description}
              </td>
              <td className="py-1 text-right whitespace-nowrap">{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-800">
            <td className="py-2 font-bold">TOTAL PAGADO</td>
            <td className="py-2 text-right font-bold text-lg">{fmt(receipt.total)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-center text-xs text-gray-400 mt-4 border-t pt-2">
        Gracias por su pago · {format(new Date(), 'dd/MM/yyyy', { locale: es })}
      </p>
    </div>
  );
}

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canPay = is('admin', 'cashier');

  const { data: debtors = [], isLoading } = useQuery({
    queryKey: ['billing', 'debtors'],
    queryFn: () => billingApi.getDebtors(1, 100),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['billing', 'transactions', selectedDebtor?.patient?.id],
    queryFn: () => billingApi.getTransactions(selectedDebtor.patient.id, 1, 100),
    enabled: !!selectedDebtor,
  });

  const { register, handleSubmit, reset } = useForm<{ receiptNumber: string; paymentMethod: string }>();

  const { mutate: payAll, isPending: isPaying } = useMutation({
    mutationFn: (d: { receiptNumber: string; paymentMethod: string }) =>
      billingApi.payAll(selectedDebtor.patient.id, { receiptNumber: d.receiptNumber || undefined }),
    onSuccess: (data) => {
      setReceipt(data);
      setIsPayModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      toast.success('Cobro registrado correctamente');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar el cobro'),
  });

  const handlePrint = () => {
    const el = document.getElementById('receipt-printable');
    if (!el) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Comprobante ${receipt?.receiptNumber ?? ''}</title><meta charset="utf-8"/><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Courier New',monospace;font-size:12px;color:#111;padding:16px;width:320px;}table{width:100%;border-collapse:collapse;}th,td{padding:4px 0;}.text-center{text-align:center;}.text-right{text-align:right;}.font-bold{font-weight:bold;}.text-gray-500{color:#666;}.text-lg{font-size:14px;}.uppercase{text-transform:uppercase;}.border-b-2{border-bottom:2px solid #111;}.border-b{border-bottom:1px solid #eee;}.border-t-2{border-top:2px solid #111;}.border{border:1px solid #ccc;}.rounded{border-radius:4px;}.p-2{padding:8px;}.pb-3{padding-bottom:12px;}.mb-3{margin-bottom:12px;}.mt-4{margin-top:16px;}.pt-2{padding-top:8px;}.py-1{padding-top:4px;padding-bottom:4px;}.pr-2{padding-right:8px;}.whitespace-nowrap{white-space:nowrap;}.tracking-widest{letter-spacing:4px;}.space-y-05>*+*{margin-top:2px;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const filtered = Array.isArray(debtors)
    ? debtors.filter((d: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          `${d.patient.firstName} ${d.patient.lastName}`.toLowerCase().includes(q) ||
          d.patient.documentNumber.includes(q)
        );
      })
    : [];

  const pendingTx = txData?.data?.filter((t: any) => t.status === 'pending') ?? [];
  const paidTx = txData?.data?.filter((t: any) => t.status === 'paid') ?? [];
  const pendingTotal = pendingTx.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const totalDeuda = Array.isArray(debtors)
    ? debtors.reduce((sum: number, d: any) => sum + parseFloat(d.account.balance), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <CreditCard className="w-6 h-6 text-primary-600" />
          Caja / Facturación
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de cobros y comprobantes por paciente</p>
      </div>

      {!selectedDebtor ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="card flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pacientes con deuda</p>
                <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : filtered.length}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total pendiente</p>
                <p className="text-2xl font-bold text-orange-600">{isLoading ? '...' : fmt(totalDeuda)}</p>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700">Pacientes con saldo pendiente</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o documento..."
                className="input pl-9"
              />
            </div>

            {isLoading ? (
              <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                {search ? 'Sin resultados para la búsqueda' : 'No hay pacientes con saldo pendiente'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="pb-2 font-medium">Paciente</th>
                      <th className="pb-2 font-medium">Documento</th>
                      <th className="pb-2 font-medium text-right">Cargado</th>
                      <th className="pb-2 font-medium text-right">Pagado</th>
                      <th className="pb-2 font-medium text-right">Saldo</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((d: any) => (
                      <tr key={d.patient.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-900">{d.patient.lastName}, {d.patient.firstName}</td>
                        <td className="py-3 text-gray-600">{d.patient.documentNumber}</td>
                        <td className="py-3 text-right text-gray-600">{fmt(d.account.totalCharged)}</td>
                        <td className="py-3 text-right text-gray-600">{fmt(d.account.totalPaid)}</td>
                        <td className="py-3 text-right font-bold text-red-600">{fmt(d.account.balance)}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => { setSelectedDebtor(d); setReceipt(null); }}
                            className="btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100"
                          >
                            Ver cuenta
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setSelectedDebtor(null); setReceipt(null); }}
            className="btn-secondary flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="card">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedDebtor.patient.lastName}, {selectedDebtor.patient.firstName}
                </h2>
                <p className="text-sm text-gray-500">Doc: {selectedDebtor.patient.documentNumber}</p>
                {selectedDebtor.patient.phone && (
                  <p className="text-sm text-gray-500">Tel: {selectedDebtor.patient.phone}</p>
                )}
              </div>
              <div className="flex gap-6 text-sm text-right">
                <div>
                  <p className="text-gray-400 text-xs uppercase">Total cargado</p>
                  <p className="font-semibold text-gray-700">{fmt(selectedDebtor.account.totalCharged)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Total pagado</p>
                  <p className="font-semibold text-gray-700">{fmt(selectedDebtor.account.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase">Saldo pendiente</p>
                  <p className="text-xl font-bold text-red-600">{fmt(selectedDebtor.account.balance)}</p>
                </div>
              </div>
            </div>

            {canPay && pendingTx.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Cobrar todo ({fmt(pendingTotal)})
                </button>
              </div>
            )}
          </div>

          {txLoading ? (
            <p className="text-center text-sm text-gray-400 py-6">Cargando movimientos...</p>
          ) : (
            <>
              {pendingTx.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                    Cargos pendientes de cobro
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="pb-2 font-medium">Tipo</th>
                        <th className="pb-2 font-medium">Descripción</th>
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingTx.map((t: any) => (
                        <tr key={t.id}>
                          <td className="py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {REF_TYPE_LABEL[t.referenceType] ?? 'Manual'}
                            </span>
                          </td>
                          <td className="py-2 text-gray-700 max-w-xs truncate">{t.description}</td>
                          <td className="py-2 text-gray-500 text-xs whitespace-nowrap">
                            {format(new Date(t.createdAt), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-2 text-right font-semibold text-gray-800">{fmt(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={3} className="pt-2 font-semibold text-gray-700">Total pendiente</td>
                        <td className="pt-2 text-right font-bold text-red-600 text-base">{fmt(pendingTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {paidTx.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    Historial de pagos
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="pb-2 font-medium">Descripción</th>
                        <th className="pb-2 font-medium">Comprobante</th>
                        <th className="pb-2 font-medium">Fecha pago</th>
                        <th className="pb-2 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paidTx.map((t: any) => (
                        <tr key={t.id} className="text-gray-600">
                          <td className="py-2 max-w-xs truncate">{t.description}</td>
                          <td className="py-2 text-xs font-mono text-gray-500">{t.receiptNumber ?? '-'}</td>
                          <td className="py-2 text-xs whitespace-nowrap">
                            {t.paidAt ? format(new Date(t.paidAt), 'dd/MM/yyyy HH:mm') : '-'}
                          </td>
                          <td className="py-2 text-right text-green-700 font-medium">{fmt(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pendingTx.length === 0 && paidTx.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Sin movimientos registrados</p>
              )}
            </>
          )}

          {receipt && (
            <div className="card border-2 border-green-200 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Comprobante generado
                </h3>
                <button
                  onClick={handlePrint}
                  className="btn btn-sm bg-white border border-green-300 text-green-700 hover:bg-green-100 flex items-center gap-1"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
              <ReceiptDocument receipt={receipt} />
            </div>
          )}
        </div>
      )}

      {canPay && (
        <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Registrar Cobro" size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-gray-700">
                {selectedDebtor?.patient?.lastName}, {selectedDebtor?.patient?.firstName}
              </p>
              <div className="flex justify-between text-gray-500">
                <span>
                  {pendingTx.length} cargo{pendingTx.length !== 1 ? 's' : ''} pendiente{pendingTx.length !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-red-600">{fmt(pendingTotal)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit((d) => payAll(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° Recibo{' '}
                  <span className="text-gray-400 font-normal text-xs">(se genera automáticamente si se deja vacío)</span>
                </label>
                <input {...register('receiptNumber')} className="input" placeholder="Ej: REC-2026-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select {...register('paymentMethod')} className="input">
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="yape">Yape / Plin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={isPaying} className="btn btn-primary">
                  {isPaying ? 'Procesando...' : `Confirmar cobro ${fmt(pendingTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
