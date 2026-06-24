import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Pencil, Pill, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { medicalRecordsApi, doctorsApi, prescriptionsApi, pharmacyApi } from '@/api/index';
import { patientsApi } from '@/api/patients';
import type { MedicalRecord } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

const RX_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activa',     cls: 'bg-green-100 text-green-700' },
  dispensed: { label: 'Dispensada', cls: 'bg-blue-100 text-blue-700' },
  expired:   { label: 'Vencida',    cls: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-700' },
};

const EMPTY_ITEM = {
  medication: '', genericName: '', dose: '', frequency: '',
  duration: '', quantity: 1, route: '', instructions: '',
};

// ── Medication search combobox ─────────────────────────────────────────────────

function MedSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (med: any) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const { data, isFetching } = useQuery({
    queryKey: ['pharmacy', 'search', query],
    queryFn: () => pharmacyApi.findAllInventory(1, 10, false, query),
    enabled: query.length >= 2,
  });

  const results = data?.data ?? [];

  const handleChange = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (med: any) => {
    setQuery(med.medicationName);
    onChange(med.medicationName);
    setOpen(false);
    onSelect(med);
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="input text-sm py-1.5 w-full"
        placeholder={placeholder ?? 'Buscar medicamento...'}
        required
      />
      {open && query.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {isFetching && (
            <p className="text-xs text-gray-400 px-3 py-2">Buscando...</p>
          )}
          {!isFetching && results.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2 italic">
              Sin resultados en inventario — puedes escribir el nombre manualmente.
            </p>
          )}
          {results.map((med: any) => (
            <button
              key={med.id}
              type="button"
              onMouseDown={() => handleSelect(med)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 border-b last:border-0"
            >
              <span className="font-medium text-gray-800">{med.medicationName}</span>
              {med.genericName && (
                <span className="text-gray-400 ml-1 text-xs">({med.genericName})</span>
              )}
              <span className="float-right text-xs text-gray-400">
                Stock: {med.stock} · S/. {parseFloat(med.unitPrice).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MedicalRecordsPage() {
  const [page, setPage] = useState(1);
  const [patientFilter, setPatientFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [viewRecord, setViewRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);

  // Prescription creation state
  const [rxRecord, setRxRecord] = useState<MedicalRecord | null>(null);
  const [rxItems, setRxItems] = useState([{ ...EMPTY_ITEM }]);
  const rxForm = useForm<{ prescriptionDate: string; notes: string }>({
    defaultValues: { prescriptionDate: new Date().toISOString().slice(0, 10) },
  });

  const queryClient = useQueryClient();
  const { is } = useRole();
  const canCreate = is('admin', 'doctor');

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', page, patientFilter],
    queryFn: () => medicalRecordsApi.findAll(page, 20, patientFilter || undefined),
  });

  const { data: doctors } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsApi.findAll() });
  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientsApi.findAll(1, 10, patientSearch),
    enabled: patientSearch.length > 2,
  });

  // Existing prescriptions for the viewed record (filtered by patient)
  const { data: rxForRecord } = useQuery({
    queryKey: ['prescriptions', 'for-record', viewRecord?.patient?.id],
    queryFn: () => prescriptionsApi.findAll(1, 50, (viewRecord as any).patient.id),
    enabled: !!viewRecord,
  });

  const createForm = useForm<any>();
  const editForm = useForm<any>();

  const { mutate: createRecord, isPending: isCreating } = useMutation({
    mutationFn: (d: any) => medicalRecordsApi.create({ ...d, patientId: selectedPatientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedPatientId('');
      toast.success('Historia clínica registrada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  });

  const { mutate: updateRecord, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => medicalRecordsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setEditingRecord(null);
      toast.success('Historia clínica actualizada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  });

  const { mutate: createRx, isPending: isCreatingRx } = useMutation({
    mutationFn: (d: { prescriptionDate: string; notes: string }) => {
      const validItems = rxItems.filter((i) => i.medication.trim());
      if (validItems.length === 0) throw new Error('Agrega al menos un medicamento');
      return prescriptionsApi.create({
        medicalRecordId: rxRecord!.id,
        patientId: (rxRecord as any).patient.id,
        doctorId: (rxRecord as any).doctor.id,
        prescriptionDate: d.prescriptionDate,
        notes: d.notes || undefined,
        items: validItems.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          genericName: i.genericName || undefined,
          route: i.route || undefined,
          instructions: i.instructions || undefined,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setRxRecord(null);
      setRxItems([{ ...EMPTY_ITEM }]);
      rxForm.reset({ prescriptionDate: new Date().toISOString().slice(0, 10) });
      toast.success('Receta registrada correctamente');
    },
    onError: (err: any) => toast.error(err?.message || err.response?.data?.message || 'Error al crear receta'),
  });

  const openEdit = (record: MedicalRecord) => {
    setEditingRecord(record);
    editForm.reset({
      diagnosis: record.diagnosis,
      diagnosisCie10: record.diagnosisCie10,
      anamnesis: record.anamnesis,
      physicalExam: record.physicalExam,
      treatment: record.treatment,
      indications: record.indications,
      labOrders: record.labOrders,
      imagingOrders: record.imagingOrders,
      followUpDate: record.followUpDate,
    });
  };

  const openRx = (record: MedicalRecord) => {
    setRxRecord(record);
    setRxItems([{ ...EMPTY_ITEM }]);
    rxForm.reset({ prescriptionDate: new Date().toISOString().slice(0, 10) });
  };

  const addRxItem = () => setRxItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeRxItem = (i: number) => setRxItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateRxItem = (i: number, field: string, value: any) =>
    setRxItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const columns = [
    { key: 'patient', header: 'Paciente', render: (r: MedicalRecord) => `${r.patient.lastName}, ${r.patient.firstName}` },
    { key: 'doctor', header: 'Médico', render: (r: MedicalRecord) => `CMP: ${r.doctor.cmp}` },
    { key: 'diagnosis', header: 'Diagnóstico', render: (r: MedicalRecord) => <span className="truncate max-w-xs block" title={r.diagnosis}>{r.diagnosis}</span> },
    { key: 'diagnosisCie10', header: 'CIE-10', render: (r: MedicalRecord) => r.diagnosisCie10 || '-' },
    { key: 'followUpDate', header: 'Seguimiento', render: (r: MedicalRecord) => r.followUpDate ? format(new Date(r.followUpDate + 'T00:00:00'), 'dd/MM/yyyy') : '-' },
    { key: 'createdAt', header: 'Fecha', render: (r: MedicalRecord) => format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm') },
    {
      key: 'actions', header: 'Acciones',
      render: (r: MedicalRecord) => (
        <div className="flex gap-1">
          <button onClick={() => setViewRecord(r)} className="btn btn-sm bg-blue-50 text-blue-700 hover:bg-blue-100">Detalle</button>
          {canCreate && (
            <>
              <button
                onClick={() => openRx(r)}
                className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"
                title="Nueva Receta"
              >
                <Pill className="w-3.5 h-3.5" /> Receta
              </button>
              <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const recordFields = (form: ReturnType<typeof useForm<any>>) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico *</label>
          <input {...form.register('diagnosis', { required: true })} className="input" placeholder="Diagnóstico principal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código CIE-10</label>
          <input {...form.register('diagnosisCie10')} className="input" placeholder="Ej: J06.9" maxLength={10} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Anamnesis</label>
        <textarea {...form.register('anamnesis')} rows={3} className="input resize-none" placeholder="Relato del paciente..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Examen Físico</label>
        <textarea {...form.register('physicalExam')} rows={3} className="input resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
          <textarea {...form.register('treatment')} rows={3} className="input resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Indicaciones</label>
          <textarea {...form.register('indications')} rows={3} className="input resize-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Órdenes de Laboratorio</label>
          <textarea {...form.register('labOrders')} rows={2} className="input resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Órdenes de Imagen</label>
          <textarea {...form.register('imagingOrders')} rows={2} className="input resize-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Seguimiento</label>
          <input type="date" {...form.register('followUpDate')} className="input" />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary-600" /> Historias Clínicas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro médico electrónico</p>
        </div>
        {canCreate && <button onClick={() => setIsCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva Historia</button>}
      </div>

      <div className="card">
        <Table columns={columns} data={data?.data ?? []} loading={isLoading} total={data?.total} page={page} limit={20} onPageChange={setPage} emptyMessage="Sin historias clínicas" />
      </div>

      {/* ── Create Medical Record Modal ─────────────────────────────────── */}
      {canCreate && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Registrar Historia Clínica" size="xl">
          <form onSubmit={createForm.handleSubmit((d) => createRecord(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <input type="text" placeholder="Buscar paciente..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); }} className="input" />
              {patients?.data && patients.data.length > 0 && !selectedPatientId && (
                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {patients.data.map((p: any) => (
                    <button key={p.id} type="button" onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.lastName}, ${p.firstName}`); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0">
                      {p.lastName}, {p.firstName} — {p.documentNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
              <select {...createForm.register('doctorId', { required: true })} className="input">
                <option value="">-- Seleccionar médico --</option>
                {doctors?.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.user.lastName}, {d.user.firstName} — CMP {d.cmp}</option>)}
              </select>
            </div>
            {recordFields(createForm)}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={isCreating || !selectedPatientId} className="btn-primary">{isCreating ? 'Guardando...' : 'Guardar Historia'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Medical Record Modal ───────────────────────────────────── */}
      {canCreate && (
        <Modal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} title="Editar Historia Clínica" size="xl">
          {editingRecord && (
            <form onSubmit={editForm.handleSubmit((d) => updateRecord({ id: editingRecord.id, payload: d }))} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <p className="font-medium">{editingRecord.patient.lastName}, {editingRecord.patient.firstName}</p>
                <p className="text-gray-500">CMP: {editingRecord.doctor.cmp} · {format(new Date(editingRecord.createdAt), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              {recordFields(editForm)}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingRecord(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isUpdating} className="btn-primary">{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ── View Medical Record Modal ───────────────────────────────────── */}
      {viewRecord && (
        <Modal isOpen={!!viewRecord} onClose={() => setViewRecord(null)} title="Detalle Historia Clínica" size="lg">
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="font-medium text-gray-500">Diagnóstico:</span><p className="mt-1">{viewRecord.diagnosis}</p></div>
              <div><span className="font-medium text-gray-500">CIE-10:</span><p className="mt-1">{viewRecord.diagnosisCie10 || '-'}</p></div>
            </div>
            {viewRecord.anamnesis && <div><span className="font-medium text-gray-500">Anamnesis:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.anamnesis}</p></div>}
            {viewRecord.physicalExam && <div><span className="font-medium text-gray-500">Examen Físico:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.physicalExam}</p></div>}
            {viewRecord.treatment && <div><span className="font-medium text-gray-500">Tratamiento:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.treatment}</p></div>}
            {viewRecord.indications && <div><span className="font-medium text-gray-500">Indicaciones:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.indications}</p></div>}
            {viewRecord.labOrders && <div><span className="font-medium text-gray-500">Órd. Laboratorio:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.labOrders}</p></div>}
            {viewRecord.imagingOrders && <div><span className="font-medium text-gray-500">Órd. Imagen:</span><p className="mt-1 whitespace-pre-wrap">{viewRecord.imagingOrders}</p></div>}

            {/* Prescriptions linked to this patient */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-green-600" />
                  Recetas del paciente
                </h3>
                {canCreate && (
                  <button
                    onClick={() => { setViewRecord(null); openRx(viewRecord); }}
                    className="btn btn-sm bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva Receta
                  </button>
                )}
              </div>

              {(rxForRecord?.data?.length ?? 0) === 0 ? (
                <p className="text-gray-400 text-xs italic">Sin recetas registradas para este paciente.</p>
              ) : (
                <div className="space-y-2">
                  {rxForRecord?.data?.map((rx: any) => (
                    <div key={rx.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                      <span className="text-gray-700">
                        {format(new Date(rx.prescriptionDate + 'T00:00:00'), 'dd/MM/yyyy')}
                      </span>
                      <span className={`badge ${RX_STATUS_MAP[rx.status]?.cls}`}>{RX_STATUS_MAP[rx.status]?.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Prescription Modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!rxRecord}
        onClose={() => { setRxRecord(null); setRxItems([{ ...EMPTY_ITEM }]); }}
        title="Nueva Receta Médica"
        size="xl"
      >
        {rxRecord && (
          <form onSubmit={rxForm.handleSubmit((d) => createRx(d))} className="space-y-5">
            {/* Patient / doctor info */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm space-y-0.5">
              <p className="font-semibold text-gray-800">
                Paciente: {(rxRecord as any).patient.lastName}, {(rxRecord as any).patient.firstName}
              </p>
              <p className="text-gray-500">
                Médico CMP: {(rxRecord as any).doctor.cmp} · HC: {rxRecord.diagnosis}
              </p>
            </div>

            {/* Date & notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de receta *</label>
                <input type="date" {...rxForm.register('prescriptionDate', { required: true })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas generales</label>
                <input {...rxForm.register('notes')} className="input" placeholder="Ej: Completar tratamiento completo" />
              </div>
            </div>

            {/* Medication items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Medicamentos *
                  <span className="ml-1 font-normal text-gray-400 text-xs">({rxItems.length} ítem{rxItems.length !== 1 ? 's' : ''})</span>
                </label>
                <button
                  type="button"
                  onClick={addRxItem}
                  className="btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              <div className="space-y-3">
                {rxItems.map((item, i) => (
                  <div key={i} className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Medicamento {i + 1}</span>
                      {rxItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxItem(i)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                          Medicamento *
                          <span className="ml-1 font-normal text-gray-400">(busca en inventario)</span>
                        </label>
                        <MedSearchInput
                          value={item.medication}
                          onChange={(v) => updateRxItem(i, 'medication', v)}
                          onSelect={(med) => {
                            setRxItems((prev) =>
                              prev.map((it, idx) =>
                                idx === i
                                  ? {
                                      ...it,
                                      medication: med.medicationName,
                                      genericName: med.genericName ?? '',
                                      dose: med.concentration ?? it.dose,
                                    }
                                  : it,
                              ),
                            );
                          }}
                          placeholder="Ej: Amoxicilina 500mg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Nombre genérico</label>
                        <input
                          value={item.genericName}
                          onChange={(e) => updateRxItem(i, 'genericName', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Se completa al seleccionar del inventario"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Dosis *</label>
                        <input
                          value={item.dose}
                          onChange={(e) => updateRxItem(i, 'dose', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="500mg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Frecuencia *</label>
                        <input
                          value={item.frequency}
                          onChange={(e) => updateRxItem(i, 'frequency', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Cada 8h"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Duración *</label>
                        <input
                          value={item.duration}
                          onChange={(e) => updateRxItem(i, 'duration', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="7 días"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Cantidad *</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateRxItem(i, 'quantity', e.target.value)}
                          className="input text-sm py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Vía de administración</label>
                        <input
                          value={item.route}
                          onChange={(e) => updateRxItem(i, 'route', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Oral, IM, EV..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Instrucciones adicionales</label>
                        <input
                          value={item.instructions}
                          onChange={(e) => updateRxItem(i, 'instructions', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Tomar con alimentos..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setRxRecord(null); setRxItems([{ ...EMPTY_ITEM }]); }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" disabled={isCreatingRx} className="btn-primary flex items-center gap-2">
                <Pill className="w-4 h-4" />
                {isCreatingRx ? 'Guardando...' : 'Emitir Receta'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
