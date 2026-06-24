import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, Lock, Unlock, Receipt, List,
  ChevronRight, AlertCircle, CheckCircle, Search, UserCheck, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { cashRegisterApi, billingApi } from '@/api/index';
import apiClient from '@/api/client';
import type { CashRegister, ReceiptSeries } from '@/types';
import { useRole } from '@/hooks/useRole';

type Tab = 'my-register' | 'history' | 'series';

function fmt(val: string | number) {
  return `S/. ${parseFloat(String(val || 0)).toFixed(2)}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  electronic_wallet: 'Yape / Plin',
  transfer: 'Transferencia',
};

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
};

// ─── My Register Tab ──────────────────────────────────────────────────────────

function MyRegisterTab() {
  const queryClient = useQueryClient();
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [collectResult, setCollectResult] = useState<any>(null);

  // DNI search state
  const [dniInput, setDniInput] = useState('');
  const [searchDni, setSearchDni] = useState('');
  const [foundPatient, setFoundPatient] = useState<any>(null);

  const openForm = useForm<{ name: string; openingBalance: string; notes: string }>();
  const closeForm = useForm<{ closingBalance: string; notes: string }>();
  const collectForm = useForm<{ transactionId: string; paymentMethod: string; receiptType: string; amountPaid: string }>();

  const amountPaid = collectForm.watch('amountPaid');
  const transactionId = collectForm.watch('transactionId');

  const { data: myRegister, isLoading } = useQuery({
    queryKey: ['cash-register', 'my'],
    queryFn: cashRegisterApi.getMyOpenRegister,
    refetchInterval: 30000,
  });

  // Search patient by document number
  const { isFetching: isSearching } = useQuery({
    queryKey: ['patients', 'by-doc', searchDni],
    queryFn: async () => {
      const { data } = await apiClient.get('/patients', {
        params: { documentNumber: searchDni, limit: 1 },
      });
      const list = data.data?.data ?? [];
      const patient = list[0] ?? null;
      setFoundPatient(patient);
      if (!patient) toast.error(`No se encontró paciente con documento "${searchDni}"`);
      return patient;
    },
    enabled: searchDni.length >= 7,
  });

  // Load pending transactions for the found patient
  const { data: txData, isFetching: isLoadingTx } = useQuery({
    queryKey: ['billing', 'transactions', foundPatient?.id, 'pending'],
    queryFn: () => billingApi.getTransactions(foundPatient!.id, 1, 50, 'pending'),
    enabled: !!foundPatient?.id,
  });

  const pendingTransactions = txData?.data ?? [];
  const selectedTx = pendingTransactions.find((t: any) => t.id === transactionId);
  const change = selectedTx && amountPaid
    ? parseFloat(amountPaid) - parseFloat(selectedTx.amount)
    : null;

  const handleSearch = () => {
    const dni = dniInput.trim();
    if (!dni) return;
    setFoundPatient(null);
    collectForm.reset();
    setSearchDni(dni);
  };

  const handleClearPatient = () => {
    setDniInput('');
    setSearchDni('');
    setFoundPatient(null);
    collectForm.reset();
  };

  const { mutate: openRegister, isPending: isOpening } = useMutation({
    mutationFn: (d: any) => cashRegisterApi.open({ ...d, openingBalance: d.openingBalance || '0' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      setIsOpenModalOpen(false);
      openForm.reset();
      toast.success('Caja abierta');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al abrir caja'),
  });

  const { mutate: closeRegister, isPending: isClosing } = useMutation({
    mutationFn: (d: any) => cashRegisterApi.close(myRegister!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      setIsCloseModalOpen(false);
      closeForm.reset();
      toast.success('Caja cerrada correctamente');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al cerrar caja'),
  });

  const { mutate: collectPayment, isPending: isCollecting } = useMutation({
    mutationFn: (d: any) =>
      cashRegisterApi.collect({
        transactionId: d.transactionId,
        paymentMethod: d.paymentMethod,
        receiptType: d.receiptType,
        amountPaid: d.amountPaid,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setCollectResult(data);
      collectForm.reset();
      toast.success(`Cobro registrado · Vuelto: ${fmt(data.change ?? 0)}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al cobrar'),
  });

  if (isLoading) {
    return <p className="text-center text-sm text-gray-400 py-12">Cargando...</p>;
  }

  if (!myRegister) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="p-4 bg-gray-100 rounded-full">
          <Unlock className="w-10 h-10 text-gray-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No tienes una caja abierta</h3>
          <p className="text-sm text-gray-500 mt-1">Abre una sesión de caja para comenzar a cobrar</p>
        </div>
        <button onClick={() => setIsOpenModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Unlock className="w-4 h-4" /> Abrir Caja
        </button>

        <Modal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} title="Abrir Sesión de Caja" size="sm">
          <form onSubmit={openForm.handleSubmit((d) => openRegister(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la caja *</label>
              <input {...openForm.register('name', { required: true })} className="input" placeholder="Ej: Caja 01 - Turno Mañana" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo de apertura (S/.)</label>
              <input type="number" step="0.01" min="0" {...openForm.register('openingBalance')} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input {...openForm.register('notes')} className="input" placeholder="Ej: Turno mañana - Cajero Juan" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsOpenModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isOpening} className="btn-primary">
                {isOpening ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Register header */}
      <div className="card border-2 border-green-200 bg-green-50">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{myRegister.name}</h2>
              <p className="text-sm text-gray-500">
                Apertura: {format(new Date(myRegister.openedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                {' · '} Saldo inicial: {fmt(myRegister.openingBalance)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="btn flex items-center gap-2 bg-red-50 text-red-700 hover:bg-red-100"
          >
            <Lock className="w-4 h-4" /> Cerrar Caja
          </button>
        </div>
      </div>

      {/* Collect payment */}
      <div className="card space-y-5">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-600" />
          Cobrar Transacción
        </h3>

        {/* Success result */}
        {collectResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
            <p className="font-semibold text-green-800 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Cobro registrado
            </p>
            <p>Comprobante: <strong className="font-mono">{collectResult.receiptNumber}</strong></p>
            <p>
              Recibido: <strong>{fmt(collectResult.amountPaid)}</strong>
              {' · '}
              Vuelto: <strong className="text-green-700">{fmt(collectResult.change ?? 0)}</strong>
            </p>
            <button
              onClick={() => { setCollectResult(null); handleClearPatient(); }}
              className="text-xs text-green-600 underline mt-2"
            >
              Nuevo cobro
            </button>
          </div>
        )}

        {/* Step 1: DNI search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar paciente por DNI / N° de documento *
          </label>

          {!foundPatient ? (
            <div className="flex gap-2">
              <input
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input flex-1"
                placeholder="Ej: 12345678"
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !dniInput.trim()}
                className="btn btn-primary flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4" />
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          ) : (
            /* Patient found card */
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-100 rounded-full">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {foundPatient.lastName}, {foundPatient.firstName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {foundPatient.documentType}: {foundPatient.documentNumber}
                    {foundPatient.phone ? ` · ${foundPatient.phone}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearPatient}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-blue-100"
                title="Cambiar paciente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Transaction select (only when patient found) */}
        {foundPatient && (
          <>
            {isLoadingTx ? (
              <p className="text-sm text-gray-400">Cargando transacciones pendientes...</p>
            ) : pendingTransactions.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Este paciente no tiene transacciones pendientes de cobro.
              </div>
            ) : (
              <form onSubmit={collectForm.handleSubmit((d) => collectPayment(d))} className="space-y-4">
                {/* Transaction select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transacción a cobrar *
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      ({pendingTransactions.length} pendiente{pendingTransactions.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <select
                    {...collectForm.register('transactionId', { required: true })}
                    className="input"
                  >
                    <option value="">-- Seleccionar --</option>
                    {pendingTransactions.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.description} · {fmt(t.amount)}
                      </option>
                    ))}
                  </select>
                  {selectedTx && (
                    <p className="text-xs text-gray-500 mt-1">
                      Monto a cobrar: <strong className="text-gray-800">{fmt(selectedTx.amount)}</strong>
                    </p>
                  )}
                </div>

                {/* Payment details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago *</label>
                    <select {...collectForm.register('paymentMethod', { required: true })} className="input">
                      <option value="">-- Seleccionar --</option>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de comprobante *</label>
                    <select {...collectForm.register('receiptType', { required: true })} className="input">
                      <option value="">-- Seleccionar --</option>
                      {Object.entries(RECEIPT_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount paid + change */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido (S/.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...collectForm.register('amountPaid', { required: true })}
                    className="input"
                    placeholder={selectedTx ? parseFloat(selectedTx.amount).toFixed(2) : '0.00'}
                  />
                  {selectedTx && amountPaid && (
                    <div className={`mt-1.5 text-sm font-semibold ${(change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(change ?? 0) >= 0
                        ? `Vuelto: ${fmt(change ?? 0)}`
                        : `⚠ Monto insuficiente — faltan ${fmt(Math.abs(change ?? 0))}`}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isCollecting || !selectedTx || (change !== null && change < 0)}
                    className="btn-primary"
                  >
                    {isCollecting ? 'Procesando...' : `Registrar Cobro ${selectedTx ? fmt(selectedTx.amount) : ''}`}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Close modal */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Cerrar Sesión de Caja" size="sm">
        <form onSubmit={closeForm.handleSubmit((d) => closeRegister(d))} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <p className="flex items-center gap-2 text-amber-700 font-medium">
              <AlertCircle className="w-4 h-4" /> Esta acción cierra la sesión de caja
            </p>
            <p className="text-amber-600 mt-1">
              Saldo de apertura: <strong>{fmt(myRegister.openingBalance)}</strong>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saldo físico al cierre (S/.) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...closeForm.register('closingBalance', { required: true })}
              className="input"
              placeholder="Efectivo contado en caja"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas de cierre</label>
            <textarea {...closeForm.register('notes')} className="input resize-none" rows={2} placeholder="Sin incidencias..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsCloseModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isClosing} className="btn bg-red-600 text-white hover:bg-red-700">
              {isClosing ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cash-register', 'history', statusFilter],
    queryFn: () => cashRegisterApi.findAll(1, 50, statusFilter || undefined),
  });

  const { data: registerDetail } = useQuery({
    queryKey: ['cash-register', 'detail', selectedRegister],
    queryFn: () => cashRegisterApi.findOne(selectedRegister!),
    enabled: !!selectedRegister,
  });

  const columns = [
    { key: 'name', header: 'Caja', render: (r: CashRegister) => <span className="font-medium">{r.name}</span> },
    {
      key: 'cashier', header: 'Cajero',
      render: (r: CashRegister) => `${r.assignedUser.lastName}, ${r.assignedUser.firstName}`,
    },
    {
      key: 'status', header: 'Estado',
      render: (r: CashRegister) => (
        <span className={`badge ${r.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {r.status === 'open' ? 'Abierta' : 'Cerrada'}
        </span>
      ),
    },
    {
      key: 'balance', header: 'Saldo apertura / cierre',
      render: (r: CashRegister) => (
        <div className="text-sm">
          <span className="text-gray-600">{fmt(r.openingBalance)}</span>
          {r.closingBalance && (
            <>
              {' → '}
              <span className="font-medium">{fmt(r.closingBalance)}</span>
              {r.expectedBalance && (
                <span className={`ml-1 text-xs ${parseFloat(r.closingBalance) >= parseFloat(r.expectedBalance) ? 'text-green-600' : 'text-red-600'}`}>
                  (esp. {fmt(r.expectedBalance)})
                </span>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'openedAt', header: 'Apertura',
      render: (r: CashRegister) => format(new Date(r.openedAt), 'dd/MM/yy HH:mm', { locale: es }),
    },
    {
      key: 'actions', header: '',
      render: (r: CashRegister) => (
        <button
          onClick={() => setSelectedRegister(r.id === selectedRegister ? null : r.id)}
          className="btn btn-sm bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Todas</option>
          <option value="open">Abiertas</option>
          <option value="closed">Cerradas</option>
        </select>
      </div>

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="Sin sesiones de caja" />
      </div>

      {selectedRegister && registerDetail && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-800">Transacciones de la sesión</h3>
          {(registerDetail as any).transactions?.length === 0 ? (
            <p className="text-sm text-gray-400">Sin transacciones cobradas en esta sesión</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 font-medium">Descripción</th>
                    <th className="pb-2 font-medium">Comprobante</th>
                    <th className="pb-2 font-medium">Método</th>
                    <th className="pb-2 font-medium text-right">Monto</th>
                    <th className="pb-2 font-medium text-right">Recibido</th>
                    <th className="pb-2 font-medium text-right">Vuelto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(registerDetail as any).transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td className="py-2 text-gray-700 max-w-xs truncate">{t.description}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">{t.receiptNumber ?? '—'}</td>
                      <td className="py-2 text-xs text-gray-500">{PAYMENT_METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod ?? '—'}</td>
                      <td className="py-2 text-right font-semibold">{fmt(t.amount)}</td>
                      <td className="py-2 text-right text-gray-600">{t.amountPaid ? fmt(t.amountPaid) : '—'}</td>
                      <td className="py-2 text-right text-green-600">{t.change ? fmt(t.change) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Series Tab ───────────────────────────────────────────────────────────────

function SeriesTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ReceiptSeries | null>(null);

  const { data: series, isLoading } = useQuery({
    queryKey: ['cash-register', 'series'],
    queryFn: cashRegisterApi.findAllSeries,
  });

  const createForm = useForm<{ type: string; prefix: string; currentNumber: number }>();
  const editForm = useForm<{ prefix: string; currentNumber: number; isActive: boolean }>();

  const { mutate: createSeries, isPending: isCreating } = useMutation({
    mutationFn: (d: any) => cashRegisterApi.createSeries({ ...d, currentNumber: Number(d.currentNumber || 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register', 'series'] });
      setIsCreateOpen(false);
      createForm.reset();
      toast.success('Serie creada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al crear serie'),
  });

  const { mutate: updateSeries, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      cashRegisterApi.updateSeries(id, { ...payload, currentNumber: Number(payload.currentNumber) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register', 'series'] });
      setEditingSeries(null);
      toast.success('Serie actualizada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const openEdit = (s: ReceiptSeries) => {
    setEditingSeries(s);
    editForm.reset({ prefix: s.prefix, currentNumber: s.currentNumber, isActive: s.isActive });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { createForm.reset(); setIsCreateOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Serie
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
      ) : (series?.length ?? 0) === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Sin series configuradas</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Prefijo</th>
                <th className="pb-2 font-medium">N° Actual</th>
                <th className="pb-2 font-medium">Próximo comprobante</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {series!.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 font-medium capitalize">{s.type}</td>
                  <td className="py-3 font-mono">{s.prefix}</td>
                  <td className="py-3">{s.currentNumber}</td>
                  <td className="py-3 font-mono text-primary-600">
                    {s.prefix}-{String(s.currentNumber + 1).padStart(8, '0')}
                  </td>
                  <td className="py-3">
                    <span className={`badge ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => openEdit(s)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
                      <Receipt className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nueva Serie de Comprobante" size="sm">
        <form onSubmit={createForm.handleSubmit((d) => createSeries(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select {...createForm.register('type', { required: true })} className="input">
              <option value="">-- Seleccionar --</option>
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo *</label>
            <input {...createForm.register('prefix', { required: true })} className="input font-mono" placeholder="Ej: B001, F001" maxLength={10} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° inicial</label>
            <input type="number" min="0" {...createForm.register('currentNumber')} className="input" defaultValue={0} />
            <p className="text-xs text-gray-400 mt-1">El primer comprobante emitido tendrá este número + 1</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isCreating} className="btn-primary">{isCreating ? 'Creando...' : 'Crear Serie'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingSeries} onClose={() => setEditingSeries(null)} title="Editar Serie" size="sm">
        {editingSeries && (
          <form onSubmit={editForm.handleSubmit((d) => updateSeries({ id: editingSeries.id, payload: d }))} className="space-y-4">
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-700">
              Tipo: <strong className="capitalize">{editingSeries.type}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo</label>
              <input {...editForm.register('prefix')} className="input font-mono" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° actual</label>
              <input type="number" min="0" {...editForm.register('currentNumber')} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" {...editForm.register('isActive')} className="rounded" />
              Activa
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingSeries(null)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isUpdating} className="btn-primary">{isUpdating ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CashRegisterPage() {
  const { is } = useRole();
  const isAdmin = is('admin');
  const [tab, setTab] = useState<Tab>('my-register');

  const tabs: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: 'my-register', label: 'Mi Caja', icon: DollarSign },
    { id: 'history', label: 'Historial de Sesiones', icon: List, adminOnly: true },
    { id: 'series', label: 'Series de Comprobantes', icon: Receipt, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <DollarSign className="w-6 h-6 text-primary-600" />
          Caja Registradora
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Apertura, cierre y cobro de transacciones</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'my-register' && <MyRegisterTab />}
      {tab === 'history' && isAdmin && <HistoryTab />}
      {tab === 'series' && isAdmin && <SeriesTab />}
    </div>
  );
}
