import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner';
import { useToast } from '../../../../contexts/ToastContext';
import { useApp } from '../../../../contexts/AppContext';
import { operatorAccessService } from '../../../../services/operatorAccessService';
import { propertyService } from '../../../../services/propertyService';
import { OperatorAccessAuthorization } from '../../../../types';

const WorkforceOperatorAccessView: React.FC = () => {
  const { addToast } = useToast();
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operatorAuthorizations, setOperatorAuthorizations] = useState<OperatorAccessAuthorization[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<Array<{ id: string; name: string; registrationNumber: string }>>([]);
  const [operatorForm, setOperatorForm] = useState({
    operatorName: '',
    operatorIdentifier: '',
    propertyId: '',
    propertyRegistrationNumber: '',
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedOperatorAuth, workspace] = await Promise.all([
          operatorAccessService.listAuthorizations(),
          propertyService.loadWorkspace(),
        ]);
        setOperatorAuthorizations(loadedOperatorAuth);

        const property = workspace.property;
        const options =
          property?.id && property?.name
            ? [{ id: property.id, name: property.name, registrationNumber: String(property.carNumber ?? '').toUpperCase() }]
            : [];
        setPropertyOptions(options);
        setOperatorForm((prev) => ({
          ...prev,
          propertyId: prev.propertyId || options[0]?.id || '',
          propertyRegistrationNumber: prev.propertyRegistrationNumber || options[0]?.registrationNumber || '',
        }));
      } catch {
        setLoadError('Nao foi possivel carregar autorizacoes de operador.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  if (isLoading) return <LoadingSpinner text="Carregando autorizacoes..." />;
  if (loadError) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{loadError}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">RH - Autorizacao de Operador</h2>
        <p className="text-slate-600">Tela unica para vincular e cancelar acesso de operador por propriedade.</p>
      </header>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">Fluxo interligado RH + Portal Externo</p>
        <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs">
          <li>Autorize o operador nesta tela com CPF + inscricao da propriedade (CAR/IE).</li>
          <li>No portal de login, o operador deve usar perfil <strong>OPERADOR</strong> e clicar em <strong>Criar Conta</strong>.</li>
          <li>No primeiro acesso ele informa CPF + CAR/IE e define a propria senha.</li>
          <li>Depois disso, entra normalmente com CPF + senha criada.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <form
          className="grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const property = propertyOptions.find((item) => item.id === operatorForm.propertyId);
            if (!property) return;
            try {
              const registrationToUse =
                operatorForm.propertyRegistrationNumber.trim() || property.registrationNumber.trim();
              if (!registrationToUse) {
                addToast({
                  type: 'error',
                  title: 'Inscricao obrigatoria',
                  message: 'Informe o CAR/IE da propriedade para liberar o acesso externo do operador.',
                });
                return;
              }

              const created = await operatorAccessService.createAuthorization({
                operatorName: operatorForm.operatorName,
                operatorIdentifier: operatorForm.operatorIdentifier,
                propertyId: property.id,
                propertyName: property.name,
                propertyRegistrationNumber: registrationToUse,
                producerName: currentUser?.name || 'Produtor',
              });
              setOperatorAuthorizations((prev) => [created, ...prev]);
              setOperatorForm((prev) => ({ ...prev, operatorName: '', operatorIdentifier: '' }));
              addToast({ type: 'success', title: 'Operador autorizado', message: 'Vinculo salvo no backend.' });
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Falha',
                message: error instanceof Error ? error.message : 'Erro ao autorizar operador.',
              });
            }
          }}
        >
          <select
            className="p-2 border rounded bg-white"
            value={operatorForm.propertyId}
            onChange={(event) => {
              const nextPropertyId = event.target.value;
              const matchedProperty = propertyOptions.find((item) => item.id === nextPropertyId);
              setOperatorForm((prev) => ({
                ...prev,
                propertyId: nextPropertyId,
                propertyRegistrationNumber: matchedProperty?.registrationNumber || prev.propertyRegistrationNumber,
              }));
            }}
            required
          >
            <option value="">Propriedade</option>
            {propertyOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            className="p-2 border rounded"
            placeholder="Inscricao da Propriedade (CAR/IE)"
            value={operatorForm.propertyRegistrationNumber}
            onChange={(event) =>
              setOperatorForm((prev) => ({ ...prev, propertyRegistrationNumber: event.target.value.toUpperCase() }))
            }
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="Nome do operador"
            value={operatorForm.operatorName}
            onChange={(event) => setOperatorForm((prev) => ({ ...prev, operatorName: event.target.value }))}
            required
          />
          <input
            className="p-2 border rounded"
            placeholder="CPF do operador"
            value={operatorForm.operatorIdentifier}
            onChange={(event) => setOperatorForm((prev) => ({ ...prev, operatorIdentifier: event.target.value }))}
            required
          />
          <button className="px-3 py-2 rounded bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700" type="submit">
            Autorizar operador
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        {operatorAuthorizations.map((authorization) => (
          <div key={authorization.id} className="rounded border p-2 text-sm flex items-start gap-2">
            <div>
              <p className="font-semibold">{authorization.operatorName}</p>
              <p className="text-xs text-slate-600">
                {authorization.propertyName} | CAR/IE: {authorization.propertyRegistrationNumber}
              </p>
            </div>
            <span className="ml-auto">{authorization.status}</span>
            {authorization.status === 'ATIVO' && (
              <button
                className="text-red-600 hover:underline"
                onClick={async () => {
                  try {
                    await operatorAccessService.cancelAuthorization(authorization.id);
                    setOperatorAuthorizations((prev) =>
                      prev.map((item) => (item.id === authorization.id ? { ...item, status: 'CANCELADO' } : item))
                    );
                    addToast({ type: 'success', title: 'Autorizacao cancelada', message: 'Acesso bloqueado.' });
                  } catch (error) {
                    addToast({
                      type: 'error',
                      title: 'Falha',
                      message: error instanceof Error ? error.message : 'Erro ao cancelar autorizacao.',
                    });
                  }
                }}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>
        ))}
        {operatorAuthorizations.length === 0 && <p className="text-sm text-slate-500">Nenhuma autorizacao encontrada.</p>}
      </section>
    </div>
  );
};

export default WorkforceOperatorAccessView;
