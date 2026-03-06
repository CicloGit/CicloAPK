import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner';
import { useToast } from '../../../../contexts/ToastContext';
import { workforceService } from '../../../../services/workforceService';
import { Employee } from '../../../../types';

const WorkforceEmployeesView: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    type: 'CLT' as Employee['type'],
    status: 'Ativo' as Employee['status'],
    monthlySalary: '',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const loaded = await workforceService.listEmployees();
        setEmployees(loaded);
      } catch {
        setLoadError('Nao foi possivel carregar colaboradores.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  if (isLoading) return <LoadingSpinner text="Carregando colaboradores..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH - Colaboradores</h2>
        <p className="text-slate-600">Tela unica para cadastro e consulta de colaboradores.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
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
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao criar colaborador.',
              });
            }
          }}
        >
          <input
            className="p-2 border rounded"
            placeholder="Nome"
            value={employeeForm.name}
            onChange={(event) => setEmployeeForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="Funcao"
            value={employeeForm.role}
            onChange={(event) => setEmployeeForm((prev) => ({ ...prev, role: event.target.value }))}
            required
          />
          <select
            className="p-2 border rounded bg-white"
            value={employeeForm.type}
            onChange={(event) =>
              setEmployeeForm((prev) => ({ ...prev, type: event.target.value as Employee['type'] }))
            }
          >
            <option value="CLT">CLT</option>
            <option value="PJ">PJ</option>
            <option value="TemporÃ¡rio">Temporario</option>
          </select>
          <select
            className="p-2 border rounded bg-white"
            value={employeeForm.status}
            onChange={(event) =>
              setEmployeeForm((prev) => ({ ...prev, status: event.target.value as Employee['status'] }))
            }
          >
            <option value="Ativo">Ativo</option>
            <option value="FÃ©rias">Ferias</option>
            <option value="Afastado">Afastado</option>
          </select>
          <input
            className="p-2 border rounded"
            placeholder="Salario mensal"
            value={employeeForm.monthlySalary}
            onChange={(event) => setEmployeeForm((prev) => ({ ...prev, monthlySalary: event.target.value }))}
          />
          <button
            className="md:col-span-5 px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            type="submit"
          >
            Cadastrar colaborador
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-slate-700">Total de colaboradores: {employees.length}</div>
        <div className="space-y-2">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded border p-2 text-sm flex items-center gap-2">
              <span className="font-semibold">{employee.name}</span>
              <span>{employee.role}</span>
              <span>{employee.type}</span>
              <span className="ml-auto">{employee.status}</span>
            </div>
          ))}
          {employees.length === 0 && <p className="text-sm text-slate-500">Nenhum colaborador cadastrado.</p>}
        </div>
      </section>
    </div>
  );
};

export default WorkforceEmployeesView;

