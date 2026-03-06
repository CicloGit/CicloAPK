import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner';
import { useToast } from '../../../../contexts/ToastContext';
import { workforceService } from '../../../../services/workforceService';
import { Employee, PayrollEntry } from '../../../../types';

const today = () => new Date().toISOString().slice(0, 10);

const WorkforcePayrollView: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    period: '',
    amount: '',
    dueDate: today(),
    status: 'Pendente' as PayrollEntry['status'],
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedEmployees, loadedPayroll] = await Promise.all([
          workforceService.listEmployees(),
          workforceService.listPayrollEntries(),
        ]);
        setEmployees(loadedEmployees);
        setPayroll(loadedPayroll);
      } catch {
        setLoadError('Nao foi possivel carregar folha de pagamento.');
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

  const payrollSummary = useMemo(() => {
    const pending = payroll.filter((entry) => entry.status === 'Pendente').reduce((sum, entry) => sum + entry.amount, 0);
    const paid = payroll.filter((entry) => entry.status === 'Pago').reduce((sum, entry) => sum + entry.amount, 0);
    return { pending, paid, total: pending + paid };
  }, [payroll]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) return <LoadingSpinner text="Carregando folha..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH - Folha</h2>
        <p className="text-slate-600">Tela unica para lancamento e pagamento da folha.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm text-slate-700">
          Pendente: {formatCurrency(payrollSummary.pending)} | Pago: {formatCurrency(payrollSummary.paid)} | Total:{' '}
          {formatCurrency(payrollSummary.total)}
        </div>
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (event) => {
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
              setPayrollForm((prev) => ({ ...prev, period: '', amount: '' }));
              addToast({ type: 'success', title: 'Folha lancada', message: 'Registro salvo no backend.' });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao lancar folha.',
              });
            }
          }}
        >
          <select
            className="p-2 border rounded bg-white"
            value={payrollForm.employeeId}
            onChange={(event) => setPayrollForm((prev) => ({ ...prev, employeeId: event.target.value }))}
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
            className="p-2 border rounded"
            placeholder="Periodo"
            value={payrollForm.period}
            onChange={(event) => setPayrollForm((prev) => ({ ...prev, period: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="Valor"
            value={payrollForm.amount}
            onChange={(event) => setPayrollForm((prev) => ({ ...prev, amount: event.target.value }))}
            required
          />
          <input
            type="date"
            className="p-2 border rounded"
            value={payrollForm.dueDate}
            onChange={(event) => setPayrollForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            required
          />
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">
            Lancar folha
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-bold text-slate-800">Lancamentos</h3>
        {payroll.map((entry) => (
          <div key={entry.id} className="rounded border p-2 text-sm flex items-center gap-2">
            <span className="font-semibold">{employeeById[entry.employeeId]?.name ?? 'N/D'}</span>
            <span>{entry.period}</span>
            <span>{formatCurrency(entry.amount)}</span>
            <span className="ml-auto">{entry.status}</span>
            {entry.status === 'Pendente' && (
              <button
                className="text-indigo-700 hover:underline"
                onClick={async () => {
                  try {
                    await workforceService.updatePayrollStatus(entry.id, 'Pago');
                    setPayroll((prev) =>
                      prev.map((item) => (item.id === entry.id ? { ...item, status: 'Pago' } : item))
                    );
                    addToast({ type: 'success', title: 'Pagamento confirmado', message: 'Folha atualizada.' });
                  } catch (error) {
                    addToast({
                      type: 'error',
                      title: 'Falha',
                      message: error instanceof Error ? error.message : 'Erro ao pagar folha.',
                    });
                  }
                }}
                type="button"
              >
                Pagar
              </button>
            )}
          </div>
        ))}
        {payroll.length === 0 && <p className="text-sm text-slate-500">Nenhuma folha lancada.</p>}
      </section>
    </div>
  );
};

export default WorkforcePayrollView;

