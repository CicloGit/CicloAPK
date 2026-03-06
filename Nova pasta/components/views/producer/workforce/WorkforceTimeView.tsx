import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner';
import { useToast } from '../../../../contexts/ToastContext';
import { workforceService, WorkforceShiftConfig } from '../../../../services/workforceService';
import { Employee, TimeRecord } from '../../../../types';

const defaultShiftConfig: WorkforceShiftConfig = {
  entryTime: '07:00',
  exitTime: '17:00',
  lunchDuration: '60',
  tolerance: '10',
};

const today = () => new Date().toISOString().slice(0, 10);

const WorkforceTimeView: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [shiftConfig, setShiftConfig] = useState<WorkforceShiftConfig>(defaultShiftConfig);
  const [timeForm, setTimeForm] = useState({
    employeeId: '',
    date: today(),
    hours: '',
    activity: '',
    status: 'Pendente' as TimeRecord['status'],
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedEmployees, loadedTime, loadedShift] = await Promise.all([
          workforceService.listEmployees(),
          workforceService.listTimeRecords(),
          workforceService.getShiftConfig(),
        ]);
        setEmployees(loadedEmployees);
        setTimeRecords(loadedTime);
        setShiftConfig(loadedShift ?? defaultShiftConfig);
      } catch {
        setLoadError('Nao foi possivel carregar ponto e turno.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const employeeById = useMemo(
    () => employees.reduce<Record<string, Employee>>((acc, item) => ({ ...acc, [item.id]: item }), {}),
    [employees]
  );

  if (isLoading) return <LoadingSpinner text="Carregando ponto e turno..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH - Ponto e Turno</h2>
        <p className="text-slate-600">Tela unica para registro de ponto e configuracao de turno.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">Registrar ponto</h3>
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const created = await workforceService.createTimeRecord({
                employeeId: timeForm.employeeId,
                date: timeForm.date,
                hours: Number(timeForm.hours),
                activity: timeForm.activity,
                status: timeForm.status,
              });
              setTimeRecords((prev) => [created, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
              setTimeForm((prev) => ({ ...prev, hours: '', activity: '' }));
              addToast({ type: 'success', title: 'Ponto registrado', message: 'Lancamento salvo no backend.' });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao registrar ponto.',
              });
            }
          }}
        >
          <select
            className="p-2 border rounded bg-white"
            value={timeForm.employeeId}
            onChange={(event) => setTimeForm((prev) => ({ ...prev, employeeId: event.target.value }))}
            required
          >
            <option value="">Colaborador</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="p-2 border rounded"
            value={timeForm.date}
            onChange={(event) => setTimeForm((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="Horas"
            value={timeForm.hours}
            onChange={(event) => setTimeForm((prev) => ({ ...prev, hours: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="Atividade"
            value={timeForm.activity}
            onChange={(event) => setTimeForm((prev) => ({ ...prev, activity: event.target.value }))}
            required
          />
          <select
            className="p-2 border rounded bg-white"
            value={timeForm.status}
            onChange={(event) => setTimeForm((prev) => ({ ...prev, status: event.target.value as TimeRecord['status'] }))}
          >
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
          <button className="md:col-span-5 px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">
            Registrar ponto
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">Configuracao de turno</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            type="time"
            className="p-2 border rounded"
            value={shiftConfig.entryTime}
            onChange={(event) => setShiftConfig((prev) => ({ ...prev, entryTime: event.target.value }))}
          />
          <input
            type="time"
            className="p-2 border rounded"
            value={shiftConfig.exitTime}
            onChange={(event) => setShiftConfig((prev) => ({ ...prev, exitTime: event.target.value }))}
          />
          <input
            type="number"
            className="p-2 border rounded"
            value={shiftConfig.lunchDuration}
            onChange={(event) => setShiftConfig((prev) => ({ ...prev, lunchDuration: event.target.value }))}
          />
          <input
            type="number"
            className="p-2 border rounded"
            value={shiftConfig.tolerance}
            onChange={(event) => setShiftConfig((prev) => ({ ...prev, tolerance: event.target.value }))}
          />
        </div>
        <button
          className="px-3 py-2 rounded bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700"
          onClick={async () => {
            try {
              await workforceService.saveShiftConfig(shiftConfig);
              addToast({ type: 'success', title: 'Turno salvo', message: 'Regras de turno persistidas no backend.' });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao salvar turno.',
              });
            }
          }}
          type="button"
        >
          Salvar turno
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-bold text-slate-800">Lancamentos recentes</h3>
        {timeRecords.map((record) => (
          <div key={record.id} className="rounded border p-2 text-sm flex items-center gap-2">
            <span className="font-semibold">{employeeById[record.employeeId]?.name ?? 'N/D'}</span>
            <span>{record.date}</span>
            <span>{record.hours}h</span>
            <span>{record.activity}</span>
            <span className="ml-auto">{record.status}</span>
          </div>
        ))}
        {timeRecords.length === 0 && <p className="text-sm text-slate-500">Nenhum ponto registrado.</p>}
      </section>
    </div>
  );
};

export default WorkforceTimeView;

