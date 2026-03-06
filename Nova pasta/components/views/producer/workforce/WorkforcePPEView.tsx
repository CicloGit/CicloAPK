import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner';
import { useToast } from '../../../../contexts/ToastContext';
import { workforceService } from '../../../../services/workforceService';
import { Employee, PPEOrder } from '../../../../types';

const today = () => new Date().toISOString().slice(0, 10);

const WorkforcePPEView: React.FC = () => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ppeOrders, setPpeOrders] = useState<PPEOrder[]>([]);
  const [ppeForm, setPpeForm] = useState({
    requesterId: '',
    items: '',
    date: today(),
    status: 'Solicitado' as PPEOrder['status'],
    conformityDoc: false,
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedEmployees, loadedPpe] = await Promise.all([
          workforceService.listEmployees(),
          workforceService.listPPEOrders(),
        ]);
        setEmployees(loadedEmployees);
        setPpeOrders(loadedPpe);
      } catch {
        setLoadError('Nao foi possivel carregar EPI.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  if (isLoading) return <LoadingSpinner text="Carregando EPI..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH - SST e EPI</h2>
        <p className="text-slate-600">Tela unica para registro de entrega e conformidade de EPI.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (event) => {
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
              setPpeForm((prev) => ({ ...prev, items: '', conformityDoc: false }));
              addToast({ type: 'success', title: 'EPI registrado', message: 'Entrega de EPI salva no backend.' });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao registrar EPI.',
              });
            }
          }}
        >
          <select
            className="p-2 border rounded bg-white"
            value={ppeForm.requesterId}
            onChange={(event) => setPpeForm((prev) => ({ ...prev, requesterId: event.target.value }))}
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
            className="p-2 border rounded md:col-span-2"
            placeholder="Itens de EPI"
            value={ppeForm.items}
            onChange={(event) => setPpeForm((prev) => ({ ...prev, items: event.target.value }))}
            required
          />
          <input
            type="date"
            className="p-2 border rounded"
            value={ppeForm.date}
            onChange={(event) => setPpeForm((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
          <select
            className="p-2 border rounded bg-white"
            value={ppeForm.status}
            onChange={(event) => setPpeForm((prev) => ({ ...prev, status: event.target.value as PPEOrder['status'] }))}
          >
            <option value="Solicitado">Solicitado</option>
            <option value="Entregue">Entregue</option>
          </select>
          <label className="md:col-span-4 inline-flex items-center gap-2 rounded border px-3 text-sm">
            <input
              type="checkbox"
              checked={ppeForm.conformityDoc}
              onChange={(event) => setPpeForm((prev) => ({ ...prev, conformityDoc: event.target.checked }))}
            />
            Ficha assinada
          </label>
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700" type="submit">
            Registrar EPI
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <div className="text-sm text-slate-700">
          Pendencias EPI: {ppeOrders.filter((entry) => entry.status === 'Solicitado').length}
        </div>
        {ppeOrders.map((entry) => (
          <div key={entry.id} className="rounded border p-2 text-sm flex items-center gap-2">
            <span className="font-semibold">{employees.find((item) => item.id === entry.requesterId)?.name ?? 'N/D'}</span>
            <span>{entry.items}</span>
            <span>{entry.date}</span>
            <span className="ml-auto">{entry.status}</span>
            <span className="text-xs text-slate-500">{entry.conformityDoc ? 'Ficha OK' : 'Sem ficha'}</span>
          </div>
        ))}
        {ppeOrders.length === 0 && <p className="text-sm text-slate-500">Nenhum registro de EPI.</p>}
      </section>
    </div>
  );
};

export default WorkforcePPEView;

