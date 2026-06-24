import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Search, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { medicalRecordsApi, doctorsApi } from '@/api/index';
import { patientsApi } from '@/api/patients';
import type { MedicalRecord } from '@/types';
import { format } from 'date-fns';
import { useRole } from '@/hooks/useRole';

export default function MedicalRecordsPage() {
  const [page, setPage] = useState(1);
  const [patientFilter, setPatientFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [viewRecord, setViewRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
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
            <button onClick={() => openEdit(r)} className="btn btn-sm bg-gray-50 text-gray-700 hover:bg-gray-100">
              <Pencil className="w-3.5 h-3.5" />
            </button>
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

      {/* Create Modal */}
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

      {/* Edit Modal */}
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

      {/* View Modal */}
      {viewRecord && (
        <Modal isOpen={!!viewRecord} onClose={() => setViewRecord(null)} title="Detalle Historia Clínica" size="lg">
          <div className="space-y-4 text-sm">
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
          </div>
        </Modal>
      )}
    </div>
  );
}
