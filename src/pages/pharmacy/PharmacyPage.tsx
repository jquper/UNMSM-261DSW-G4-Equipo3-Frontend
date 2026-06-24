import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical, Plus, Pencil, AlertTriangle, Package,
  ClipboardList, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { pharmacyApi, prescriptionsApi } from '@/api/index';
import type { PharmacyInventory, MedicationOrder } from '@/types';
import { useRole } from '@/hooks/useRole';

type Tab = 'inventory' | 'dispense' | 'orders';

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700' },
  ready:     { label: 'Listo',      cls: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Despachado', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Anulado',    cls: 'bg-red-100 text-red-700' },
};

function fmt(val: string | number) {
  return `S/. ${parseFloat(String(val)).toFixed(2)}`;
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const queryClient = useQueryClient();
  const { is } = useRole();
  const canManage = is('admin', 'pharmacy_tech');

  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PharmacyInventory | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<PharmacyInventory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy', 'inventory', lowStockOnly],
    queryFn: () => pharmacyApi.findAllInventory(1, 100, lowStockOnly),
  });

  const { data: alerts } = useQuery({
    queryKey: ['pharmacy', 'alerts'],
    queryFn: pharmacyApi.getLowStockAlerts,
  });

  const addForm = useForm<any>();
  const editForm = useForm<any>();
  const adjustForm = useForm<{ quantity: number; reason?: string }>();

  const { mutate: addItem, isPending: isAdding } = useMutation({
    mutationFn: (payload: any) => pharmacyApi.createInventoryItem({ ...payload, stock: Number(payload.stock), minStock: Number(payload.minStock || 5) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      setIsAddOpen(false);
      addForm.reset();
      toast.success('Medicamento agregado al inventario');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al agregar'),
  });

  const { mutate: updateItem, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => pharmacyApi.updateInventoryItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      setEditingItem(null);
      toast.success('Medicamento actualizado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const { mutate: adjustStock, isPending: isAdjusting } = useMutation({
    mutationFn: ({ id, quantity, reason }: { id: string; quantity: number; reason?: string }) =>
      pharmacyApi.adjustStock(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      setAdjustingItem(null);
      adjustForm.reset();
      toast.success('Stock ajustado');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al ajustar stock'),
  });

  const openEdit = (item: PharmacyInventory) => {
    setEditingItem(item);
    editForm.reset({ unitPrice: item.unitPrice, minStock: item.minStock, location: item.location, isActive: item.isActive });
  };

  const columns = [
    {
      key: 'medication', header: 'Medicamento',
      render: (r: PharmacyInventory) => (
        <div>
          <p className="font-medium text-gray-900">{r.medicationName}</p>
          {r.genericName && <p className="text-xs text-gray-500">{r.genericName}</p>}
          {r.presentation && <p className="text-xs text-gray-400">{r.presentation}{r.concentration ? ` · ${r.concentration}` : ''}</p>}
        </div>
      ),
    },
    {
      key: 'stock', header: 'Stock',
      render: (r: PharmacyInventory) => (
        <div className="text-center">
          <span className={`text-lg font-bold ${r.stock <= r.minStock ? 'text-red-600' : 'text-gray-900'}`}>{r.stock}</span>
          <p className="text-xs text-gray-400">mín. {r.minStock}</p>
          {r.stock <= r.minStock && <span className="text-xs text-red-500">⚠ Stock bajo</span>}
        </div>
      ),
    },
    { key: 'price', header: 'P. Unit.', render: (r: PharmacyInventory) => <span className="font-medium">{fmt(r.unitPrice)}</span> },
    {
      key: 'expiry', header: 'Vence',
      render: (r: PharmacyInventory) => r.expirationDate
        ? <span className="text-xs text-gray-600">{format(new Date(r.expirationDate + 'T12:00:00'), 'MM/yyyy', { locale: es })}</span>
        : <span className="text-xs text-gray-300">—</span>,
    },
    { key: 'location', header: 'Ubicación', render: (r: PharmacyInventory) => <span className="text-sm text-gray-600">{r.location ?? '—'}</span> },
    {
      key: 'status', header: 'Estado',
      render: (r: PharmacyInventory) => <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span>,
    },
    {
      key: 'actions', header: '',
      render: (r: PharmacyInventory) => canManage ? (
        <div className="flex gap-1 justify-end">
          <button onClick={() => setAdjustingItem(r)} className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100" title="Ajustar stock">
            <Package className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100" title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Low stock alerts banner */}
      {(alerts?.length ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-red-700 font-medium">
            {alerts!.length} medicamento{alerts!.length !== 1 ? 's' : ''} con stock bajo o agotado
          </span>
          <button onClick={() => setLowStockOnly(true)} className="ml-auto text-xs text-red-600 underline">
            Ver solo estos
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded"
            />
            Solo stock bajo
          </label>
          <span className="text-xs text-gray-400">({data?.total ?? 0} items)</span>
        </div>
        {canManage && (
          <button onClick={() => { addForm.reset(); setIsAddOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar Medicamento
          </button>
        )}
      </div>

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="Sin medicamentos en inventario" />
      </div>

      {/* Add Modal */}
      {canManage && (
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Agregar Medicamento" size="lg">
          <form onSubmit={addForm.handleSubmit((d) => addItem(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
                <input {...addForm.register('medicationName', { required: true })} className="input" placeholder="Ej: Paracetamol 500mg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre genérico</label>
                <input {...addForm.register('genericName')} className="input" placeholder="Ej: Acetaminofén" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
                <input {...addForm.register('presentation')} className="input" placeholder="Ej: Tabletas, Jarabe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concentración</label>
                <input {...addForm.register('concentration')} className="input" placeholder="Ej: 500mg, 250mg/5ml" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Laboratorio</label>
                <input {...addForm.register('laboratoryName')} className="input" placeholder="Ej: Genfar" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial *</label>
                <input type="number" min="0" {...addForm.register('stock', { required: true })} className="input" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input type="number" min="0" {...addForm.register('minStock')} className="input" defaultValue={5} placeholder="5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario (S/.) *</label>
                <input type="number" step="0.01" min="0" {...addForm.register('unitPrice', { required: true })} className="input" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <input type="date" {...addForm.register('expirationDate')} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de lote</label>
                <input {...addForm.register('lotNumber')} className="input" placeholder="Ej: LOT-2024-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación en almacén</label>
                <input {...addForm.register('location')} className="input" placeholder="Ej: Estante A-3" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isAdding} className="btn-primary">
                {isAdding ? 'Agregando...' : 'Agregar al Inventario'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {canManage && (
        <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Medicamento" size="md">
          {editingItem && (
            <form onSubmit={editForm.handleSubmit((d) => updateItem({ id: editingItem.id, payload: { ...d, minStock: Number(d.minStock) } }))} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-900">{editingItem.medicationName}</p>
                {editingItem.genericName && <p className="text-gray-500">{editingItem.genericName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario (S/.)</label>
                  <input type="number" step="0.01" min="0" {...editForm.register('unitPrice')} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input type="number" min="0" {...editForm.register('minStock')} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                  <input type="date" {...editForm.register('expirationDate')} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input {...editForm.register('location')} className="input" placeholder="Estante A-3" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" {...editForm.register('isActive')} className="rounded" />
                Activo
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingItem(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isUpdating} className="btn-primary">{isUpdating ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Adjust Stock Modal */}
      {canManage && (
        <Modal isOpen={!!adjustingItem} onClose={() => setAdjustingItem(null)} title="Ajustar Stock" size="sm">
          {adjustingItem && (
            <form onSubmit={adjustForm.handleSubmit((d) => adjustStock({ id: adjustingItem.id, quantity: Number(d.quantity), reason: d.reason }))} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{adjustingItem.medicationName}</p>
                <p className="text-gray-500">Stock actual: <strong>{adjustingItem.stock}</strong> unidades</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a ajustar
                  <span className="text-gray-400 font-normal ml-1">(+ para ingresar, − para retirar)</span>
                </label>
                <input
                  type="number"
                  {...adjustForm.register('quantity', { required: true, valueAsNumber: true })}
                  className="input"
                  placeholder="Ej: 50 o -10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <input {...adjustForm.register('reason')} className="input" placeholder="Ej: Ingreso de lote nuevo" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAdjustingItem(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isAdjusting} className="btn-primary">{isAdjusting ? 'Ajustando...' : 'Confirmar Ajuste'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Dispense Tab ─────────────────────────────────────────────────────────────

function DispenseTab() {
  const queryClient = useQueryClient();
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [dispenseItems, setDispenseItems] = useState<{ inventoryId: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');

  const { data: prescriptions } = useQuery({
    queryKey: ['prescriptions', 'active'],
    queryFn: () => prescriptionsApi.findAll(1, 50),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['pharmacy', 'inventory', false],
    queryFn: () => pharmacyApi.findAllInventory(1, 200, false),
  });

  const { mutate: dispense, isPending } = useMutation({
    mutationFn: () => pharmacyApi.dispensePrescription({
      prescriptionId: selectedPrescription.id,
      items: dispenseItems,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setSelectedPrescription(null);
      setDispenseItems([]);
      setNotes('');
      toast.success('Receta despachada correctamente. Se generó cargo en facturación.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al despachar'),
  });

  const activePrescriptions = (prescriptions?.data ?? []).filter((p: any) => p.status === 'active');
  const filtered = activePrescriptions.filter((p: any) => {
    if (!prescriptionSearch) return true;
    const q = prescriptionSearch.toLowerCase();
    return `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase().includes(q);
  });

  const inventory = inventoryData?.data ?? [];

  const updateDispenseItem = (inventoryId: string, quantity: number) => {
    setDispenseItems((prev) => {
      const exists = prev.findIndex((i) => i.inventoryId === inventoryId);
      if (quantity <= 0) return prev.filter((i) => i.inventoryId !== inventoryId);
      if (exists >= 0) return prev.map((i, idx) => idx === exists ? { ...i, quantity } : i);
      return [...prev, { inventoryId, quantity }];
    });
  };

  const getItemQuantity = (inventoryId: string) =>
    dispenseItems.find((i) => i.inventoryId === inventoryId)?.quantity ?? 0;

  const totalAmount = dispenseItems.reduce((sum, item) => {
    const inv = inventory.find((i) => i.id === item.inventoryId);
    return sum + (inv ? parseFloat(inv.unitPrice) * item.quantity : 0);
  }, 0);

  if (!selectedPrescription) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={prescriptionSearch}
            onChange={(e) => setPrescriptionSearch(e.target.value)}
            placeholder="Buscar receta por nombre de paciente..."
            className="input pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            {prescriptionSearch ? 'Sin resultados' : 'No hay recetas activas pendientes de despacho'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p: any) => (
              <div key={p.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {p.patient.lastName}, {p.patient.firstName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fecha: {format(new Date(p.prescriptionDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
                  </p>
                  {p.items?.length > 0 && (
                    <p className="text-xs text-gray-400">{p.items.length} medicamento{p.items.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPrescription(p)}
                  className="btn btn-sm btn-primary shrink-0"
                >
                  Despachar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedPrescription(null)} className="btn-secondary btn-sm">
          ← Volver
        </button>
        <div>
          <p className="font-semibold text-gray-900">
            Receta de {selectedPrescription.patient.lastName}, {selectedPrescription.patient.firstName}
          </p>
          <p className="text-xs text-gray-500">
            {format(new Date(selectedPrescription.prescriptionDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
          </p>
        </div>
      </div>

      {selectedPrescription.items?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Medicamentos de la receta</h3>
          <div className="space-y-3">
            {selectedPrescription.items.map((item: any) => (
              <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.medication}</p>
                    {item.genericName && <p className="text-xs text-gray-500">{item.genericName}</p>}
                    <p className="text-xs text-gray-400">{item.dose} · {item.frequency} · {item.duration} · Qty: {item.quantity}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Seleccionar del inventario:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {inventory
                      .filter((inv) => inv.isActive && inv.stock > 0)
                      .filter((inv) =>
                        inv.medicationName.toLowerCase().includes(item.medication.toLowerCase().split(' ')[0]) ||
                        (item.genericName && inv.genericName?.toLowerCase().includes(item.genericName.toLowerCase().split(' ')[0]))
                      )
                      .slice(0, 3)
                      .map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded p-2">
                          <div className="flex-1">
                            <span className="font-medium">{inv.medicationName}</span>
                            <span className="text-gray-400 ml-1">{inv.presentation}</span>
                            <span className="text-gray-500 ml-2">Stock: {inv.stock} · {fmt(inv.unitPrice)}/u</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={inv.stock}
                            value={getItemQuantity(inv.id)}
                            onChange={(e) => updateDispenseItem(inv.id, Number(e.target.value))}
                            className="w-16 input text-center text-xs py-1"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    {inventory.filter((inv) => inv.isActive && inv.stock > 0).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-primary-600 hover:underline">Ver todo el inventario</summary>
                        <div className="mt-2 space-y-1">
                          {inventory.filter((inv) => inv.isActive && inv.stock > 0).map((inv) => (
                            <div key={inv.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                              <div className="flex-1">
                                <span className="font-medium">{inv.medicationName}</span>
                                <span className="text-gray-400 ml-1">{inv.presentation}</span>
                                <span className="text-gray-500 ml-2">Stock: {inv.stock} · {fmt(inv.unitPrice)}</span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                max={inv.stock}
                                value={getItemQuantity(inv.id)}
                                onChange={(e) => updateDispenseItem(inv.id, Number(e.target.value))}
                                className="w-16 input text-center text-xs py-1"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes and summary */}
      <div className="card space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas de despacho (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input resize-none"
            rows={2}
            placeholder="Ej: Despachado parcialmente por falta de stock..."
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-600">
              {dispenseItems.length} item{dispenseItems.length !== 1 ? 's' : ''} seleccionado{dispenseItems.length !== 1 ? 's' : ''}
            </p>
            <p className="text-lg font-bold text-gray-900">Total: {fmt(totalAmount)}</p>
            <p className="text-xs text-gray-400">Se generará un cargo pendiente en facturación</p>
          </div>
          <button
            onClick={() => dispense()}
            disabled={isPending || dispenseItems.length === 0}
            className="btn-primary"
          >
            {isPending ? 'Despachando...' : 'Confirmar Despacho'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy', 'orders', statusFilter],
    queryFn: () => pharmacyApi.findAllOrders(1, 50, statusFilter || undefined),
  });

  const columns = [
    {
      key: 'prescription', header: 'Prescripción',
      render: (r: MedicationOrder) => <span className="font-mono text-xs text-gray-500">{r.prescriptionId.slice(0, 8)}…</span>,
    },
    {
      key: 'status', header: 'Estado',
      render: (r: MedicationOrder) => {
        const s = ORDER_STATUS[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
      },
    },
    { key: 'total', header: 'Total', render: (r: MedicationOrder) => <span className="font-semibold">{fmt(r.totalAmount)}</span> },
    {
      key: 'date', header: 'Fecha despacho',
      render: (r: MedicationOrder) => r.dispensedAt
        ? format(new Date(r.dispensedAt), 'dd/MM/yyyy HH:mm', { locale: es })
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'expand', header: '',
      render: (r: MedicationOrder) => (
        <button
          onClick={() => setExpandedOrder(expandedOrder === r.id ? null : r.id)}
          className="btn btn-sm bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          {expandedOrder === r.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="ready">Listo</option>
          <option value="delivered">Despachado</option>
          <option value="cancelled">Anulado</option>
        </select>
      </div>

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} emptyMessage="Sin órdenes de medicamentos" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PharmacyPage() {
  const [tab, setTab] = useState<Tab>('inventory');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'dispense', label: 'Despachar Receta', icon: FlaskConical },
    { id: 'orders', label: 'Historial de Órdenes', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <FlaskConical className="w-6 h-6 text-primary-600" />
          Farmacia
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Inventario de medicamentos y despacho de recetas</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
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

      {tab === 'inventory' && <InventoryTab />}
      {tab === 'dispense' && <DispenseTab />}
      {tab === 'orders' && <OrdersTab />}
    </div>
  );
}
