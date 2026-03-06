import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import { workforceService, WorkforceShiftConfig } from '../../../services/workforceService';
import { operatorAccessService } from '../../../services/operatorAccessService';
import { propertyService } from '../../../services/propertyService';
import { useApp } from '../../../contexts/AppContext';
import { Employee, OperatorAccessAuthorization, PayrollEntry, PPEOrder, TimeRecord } from '../../../types';

const defaultShiftConfig: WorkforceShiftConfig = {
  entryTime: '07:00',
  exitTime: '17:00',
  lunchDuration: '60',
  tolerance: '10',
};

const today = () => new Date().toISOString().slice(0, 10);

const WorkforceView: React.FC = () => {
  const { addToast } = useToast();
  const { currentUser } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [ppeOrders, setPpeOrders] = useState<PPEOrder[]>([]);
  const [operatorAuthorizations, setOperatorAuthorizations] = useState<OperatorAccessAuthorization[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<Array<{ id: string; name: string; registrationNumber: string }>>([]);
  const [shiftConfig, setShiftConfig] = useState<WorkforceShiftConfig>(defaultShiftConfig);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    type: 'CLT' as Employee['type'],
    status: 'Ativo' as Employee['status'],
    monthlySalary: '',
  });
  const [timeForm, setTimeForm] = useState({
    employeeId: '',
    date: today(),
    hours: '',
    activity: '',
    status: 'Pendente' as TimeRecord['status'],
  });
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    period: '',
    amount: '',
    dueDate: today(),
    status: 'Pendente' as PayrollEntry['status'],
  });
  const [ppeForm, setPpeForm] = useState({
    requesterId: '',
    items: '',
    date: today(),
    status: 'Solicitado' as PPEOrder['status'],
    conformityDoc: false,
  });
  const [operatorForm, setOperatorForm] = useState({
    operatorName: '',
    operatorIdentifier: '',
    propertyId: '',
  });

  const employeeById = useMemo(
    () => employees.reduce<Record<string, Employee>>((acc, item) => ({ ...acc, [item.id]: item }), {}),
    [employees]
  );

  const payrollSummary = useMemo(() => {
    const pending = payroll.filter((x) => x.status === 'Pendente').reduce((sum, x) => sum + x.amount, 0);
    const paid = payroll.filter((x) => x.status === 'Pago').reduce((sum, x) => sum + x.amount, 0);
    return { pending, paid, total: pending + paid };
  }, [payroll]);

  const loadAll = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedEmployees, loadedTime, loadedPayroll, loadedPpe, loadedOperatorAuth, loadedShift, workspace] = await Promise.all([
        workforceService.listEmployees(),
        workforceService.listTimeRecords(),
        workforceService.listPayrollEntries(),
        workforceService.listPPEOrders(),
        operatorAccessService.listAuthorizations(),
        workforceService.getShiftConfig(),
        propertyService.loadWorkspace(),
      ]);
      setEmployees(loadedEmployees);
      setTimeRecords(loadedTime);
      setPayroll(loadedPayroll);
      setPpeOrders(loadedPpe);
      setOperatorAuthorizations(loadedOperatorAuth);
      setShiftConfig(loadedShift ?? defaultShiftConfig);

      const property = workspace.property;
      const options =
        property?.id && property?.name
          ? [{ id: property.id, name: property.name, registrationNumber: String(property.carNumber ?? '').toUpperCase() }]
          : [];
      setPropertyOptions(options);
      setOperatorForm((prev) => ({ ...prev, propertyId: prev.propertyId || options[0]?.id || '' }));
    } catch {
      setLoadError('Nao foi possivel carregar modulo RH.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) return <LoadingSpinner text="Carregando RH..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH do Produtor (sem mocks)</h2>
        <p className="text-slate-600">Todas as acoes desta tela gravam/consultam backend Firebase.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">1) Colaboradores</h3>
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const created = await workforceService.createEmployee({
                name: employeeForm.name,
                role: employeeForm.role,
                type: employeeForm.type,
                status: employeeForm.status,
                monthlySalary: employeeForm.monthlySalary ? Number(employeeForm.monthlySalary) : undefined,
              });
              setEmployees((prev) => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
              setEmployeeForm({ name: '', role: '', type: 'CLT', status: 'Ativo', monthlySalary: '' });
              addToast({ type: 'success', title: 'Colaborador criado', message: 'Cadastro salvo no backend.' });
            } catch (error) {
              addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao criar colaborador.' });
            }
          }}
        >
          <input className="p-2 border rounded" placeholder="Nome" value={employeeForm.name} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))} required />
          <input className="p-2 border rounded" placeholder="Funcao" value={employeeForm.role} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))} required />
          <select className="p-2 border rounded bg-white" value={employeeForm.type} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, type: e.target.value as Employee['type'] }))}><option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Temporário">Temporario</option></select>
          <input className="p-2 border rounded" placeholder="Salario mensal" value={employeeForm.monthlySalary} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, monthlySalary: e.target.value }))} />
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">Cadastrar</button>
        </form>
        <div className="text-sm text-slate-700">Total: {employees.length}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">2) Ponto e turno</h3>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={async (event) => {
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
            addToast({ type: 'success', title: 'Ponto registrado', message: 'Lancamento salvo no backend.' });
          } catch (error) {
            addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao registrar ponto.' });
          }
        }}>
          <select className="p-2 border rounded bg-white" value={timeForm.employeeId} onChange={(e) => setTimeForm((prev) => ({ ...prev, employeeId: e.target.value }))} required><option value="">Colaborador</option>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input type="date" className="p-2 border rounded" value={timeForm.date} onChange={(e) => setTimeForm((prev) => ({ ...prev, date: e.target.value }))} required />
          <input className="p-2 border rounded" placeholder="Horas" value={timeForm.hours} onChange={(e) => setTimeForm((prev) => ({ ...prev, hours: e.target.value }))} required />
          <input className="p-2 border rounded" placeholder="Atividade" value={timeForm.activity} onChange={(e) => setTimeForm((prev) => ({ ...prev, activity: e.target.value }))} required />
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">Registrar</button>
        </form>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input type="time" className="p-2 border rounded" value={shiftConfig.entryTime} onChange={(e) => setShiftConfig((prev) => ({ ...prev, entryTime: e.target.value }))} />
          <input type="time" className="p-2 border rounded" value={shiftConfig.exitTime} onChange={(e) => setShiftConfig((prev) => ({ ...prev, exitTime: e.target.value }))} />
          <input type="number" className="p-2 border rounded" value={shiftConfig.lunchDuration} onChange={(e) => setShiftConfig((prev) => ({ ...prev, lunchDuration: e.target.value }))} />
          <input type="number" className="p-2 border rounded" value={shiftConfig.tolerance} onChange={(e) => setShiftConfig((prev) => ({ ...prev, tolerance: e.target.value }))} />
        </div>
        <button className="px-3 py-2 rounded bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700" onClick={async () => {
          try {
            await workforceService.saveShiftConfig(shiftConfig);
            addToast({ type: 'success', title: 'Turno salvo', message: 'Regras de turno persistidas no backend.' });
          } catch (error) {
            addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao salvar turno.' });
          }
        }}>Salvar turno</button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">3) Folha</h3>
        <div className="text-sm text-slate-700">Pendente: {formatCurrency(payrollSummary.pending)} | Pago: {formatCurrency(payrollSummary.paid)} | Total: {formatCurrency(payrollSummary.total)}</div>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={async (event) => {
          event.preventDefault();
          try {
            const created = await workforceService.createPayrollEntry({
              employeeId: payrollForm.employeeId,
              period: payrollForm.period,
              amount: Number(payrollForm.amount),
              dueDate: payrollForm.dueDate,
              status: payrollForm.status,
            });
            setPayroll((prev) => [created, ...prev]);
            addToast({ type: 'success', title: 'Folha lancada', message: 'Registro salvo no backend.' });
          } catch (error) {
            addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao lancar folha.' });
          }
        }}>
          <select className="p-2 border rounded bg-white" value={payrollForm.employeeId} onChange={(e) => setPayrollForm((prev) => ({ ...prev, employeeId: e.target.value }))} required><option value="">Colaborador</option>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input className="p-2 border rounded" placeholder="Periodo" value={payrollForm.period} onChange={(e) => setPayrollForm((prev) => ({ ...prev, period: e.target.value }))} required />
          <input className="p-2 border rounded" placeholder="Valor" value={payrollForm.amount} onChange={(e) => setPayrollForm((prev) => ({ ...prev, amount: e.target.value }))} required />
          <input type="date" className="p-2 border rounded" value={payrollForm.dueDate} onChange={(e) => setPayrollForm((prev) => ({ ...prev, dueDate: e.target.value }))} required />
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">Lancar</button>
        </form>
        <div className="space-y-2">
          {payroll.map((x) => (
            <div key={x.id} className="rounded border p-2 text-sm flex items-center gap-2">
              <span className="font-semibold">{employeeById[x.employeeId]?.name ?? 'N/D'}</span>
              <span>{x.period}</span>
              <span>{formatCurrency(x.amount)}</span>
              <span className="ml-auto">{x.status}</span>
              {x.status === 'Pendente' && <button className="text-indigo-700 hover:underline" onClick={async () => {
                await workforceService.updatePayrollStatus(x.id, 'Pago');
                setPayroll((prev) => prev.map((item) => item.id === x.id ? { ...item, status: 'Pago' } : item));
              }}>Pagar</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">4) SST e EPI</h3>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={async (event) => {
          event.preventDefault();
          try {
            const created = await workforceService.createPPEOrder({
              requesterId: ppeForm.requesterId,
              items: ppeForm.items,
              date: ppeForm.date,
              status: ppeForm.status,
              conformityDoc: ppeForm.conformityDoc,
            });
            setPpeOrders((prev) => [created, ...prev]);
            addToast({ type: 'success', title: 'EPI registrado', message: 'Entrega de EPI salva no backend.' });
          } catch (error) {
            addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao registrar EPI.' });
          }
        }}>
          <select className="p-2 border rounded bg-white" value={ppeForm.requesterId} onChange={(e) => setPpeForm((prev) => ({ ...prev, requesterId: e.target.value }))} required><option value="">Colaborador</option>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input className="p-2 border rounded md:col-span-2" placeholder="Itens de EPI" value={ppeForm.items} onChange={(e) => setPpeForm((prev) => ({ ...prev, items: e.target.value }))} required />
          <input type="date" className="p-2 border rounded" value={ppeForm.date} onChange={(e) => setPpeForm((prev) => ({ ...prev, date: e.target.value }))} required />
          <label className="inline-flex items-center gap-2 rounded border px-3 text-sm"><input type="checkbox" checked={ppeForm.conformityDoc} onChange={(e) => setPpeForm((prev) => ({ ...prev, conformityDoc: e.target.checked }))} />Ficha assinada</label>
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">Registrar EPI</button>
        </form>
        <div className="text-sm text-slate-700">Pendencias EPI: {ppeOrders.filter((x) => x.status === 'Solicitado').length}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800">5) Autorizacao de operador por propriedade</h3>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2" onSubmit={async (event) => {
          event.preventDefault();
          const property = propertyOptions.find((x) => x.id === operatorForm.propertyId);
          if (!property) return;
          try {
            const created = await operatorAccessService.createAuthorization({
              operatorName: operatorForm.operatorName,
              operatorIdentifier: operatorForm.operatorIdentifier,
              propertyId: property.id,
              propertyName: property.name,
              propertyRegistrationNumber: property.registrationNumber,
              producerName: currentUser?.name || 'Produtor',
            });
            setOperatorAuthorizations((prev) => [created, ...prev]);
            setOperatorForm((prev) => ({ ...prev, operatorName: '', operatorIdentifier: '' }));
            addToast({ type: 'success', title: 'Operador autorizado', message: 'Vinculo salvo no backend.' });
          } catch (error) {
            addToast({ type: 'error', title: 'Falha', message: error instanceof Error ? error.message : 'Erro ao autorizar operador.' });
          }
        }}>
          <select className="p-2 border rounded bg-white" value={operatorForm.propertyId} onChange={(e) => setOperatorForm((prev) => ({ ...prev, propertyId: e.target.value }))} required><option value="">Propriedade</option>{propertyOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input className="p-2 border rounded" placeholder="Nome do operador" value={operatorForm.operatorName} onChange={(e) => setOperatorForm((prev) => ({ ...prev, operatorName: e.target.value }))} required />
          <input className="p-2 border rounded" placeholder="CPF do operador" value={operatorForm.operatorIdentifier} onChange={(e) => setOperatorForm((prev) => ({ ...prev, operatorIdentifier: e.target.value }))} required />
          <button className="px-3 py-2 rounded bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700" type="submit">Autorizar</button>
        </form>
        <div className="space-y-2">
          {operatorAuthorizations.map((x) => (
            <div key={x.id} className="rounded border p-2 text-sm flex items-center gap-2">
              <span className="font-semibold">{x.operatorName}</span>
              <span>{x.propertyName}</span>
              <span className="ml-auto">{x.status}</span>
              {x.status === 'ATIVO' && <button className="text-red-600 hover:underline" onClick={async () => {
                await operatorAccessService.cancelAuthorization(x.id);
                setOperatorAuthorizations((prev) => prev.map((item) => item.id === x.id ? { ...item, status: 'CANCELADO' } : item));
              }}>Cancelar</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WorkforceView;
