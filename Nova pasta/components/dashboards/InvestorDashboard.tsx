import React, { useEffect, useMemo, useState } from 'react';
import { CashIcon } from '../icons/CashIcon';
import LibraryIcon from '../icons/LibraryIcon';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import {
  investorService,
  InvestorDemand,
  InvestorKpi,
  InvestorLiquidationForecast,
  InvestorMarketSignal,
  InvestorMovement,
  InvestorProject,
} from '../../services/investorService';

type PortfolioViewMode = 'UNIFIED' | 'SEGMENTED';

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }>; color: string }> = ({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className={`flex items-center text-sm font-bold ${color}`}>
      <Icon className="h-5 w-5 mr-2" />
      {title}
    </div>
    <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
  </div>
);

const iconMap: Record<InvestorKpi['icon'], React.FC<{ className?: string }>> = {
  library: LibraryIcon,
  cash: CashIcon,
  trend: TrendingUpIcon,
  briefcase: BriefcaseIcon,
};

const parseCurrency = (input: string): number => {
  const normalized = input.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const InvestorDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<PortfolioViewMode>('UNIFIED');
  const [kpis, setKpis] = useState<InvestorKpi[]>([]);
  const [projects, setProjects] = useState<InvestorProject[]>([]);
  const [marketSignals, setMarketSignals] = useState<InvestorMarketSignal[]>([]);
  const [demands, setDemands] = useState<InvestorDemand[]>([]);
  const [forecasts, setForecasts] = useState<InvestorLiquidationForecast[]>([]);
  const [movements, setMovements] = useState<InvestorMovement[]>([]);
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalNote, setCapitalNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [isSubmittingCapital, setIsSubmittingCapital] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [demandActionId, setDemandActionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  useEffect(() => {
    const loadInvestor = async () => {
      setIsLoading(true);
      setInitialLoadError(null);
      setActionError(null);
      try {
        const [loadedKpis, loadedProjects, loadedMarket, loadedDemands, loadedForecasts, loadedMovements] = await Promise.all([
          investorService.listKpis(),
          investorService.listProjects(),
          investorService.listMarketSignals(),
          investorService.listInvestmentDemands(),
          investorService.listLiquidationForecasts(),
          investorService.listMovements(),
        ]);
        setKpis(loadedKpis);
        setProjects(loadedProjects);
        setMarketSignals(loadedMarket);
        setDemands(loadedDemands);
        setForecasts(loadedForecasts);
        setMovements(loadedMovements);
      } catch {
        setInitialLoadError('Nao foi possivel carregar o portal do investidor.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvestor();
  }, []);

  const handleAllocateCapital = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = parseCurrency(capitalAmount);
    if (amount <= 0) {
      setActionError('Informe um valor valido para aporte.');
      return;
    }

    try {
      setIsSubmittingCapital(true);
      const movement = await investorService.allocateCapital({
        amount,
        description: capitalNote.trim() || undefined,
      });
      setMovements((prev) => [movement, ...prev]);
      setCapitalAmount('');
      setCapitalNote('');
      setActionError(null);
      setActionMessage(`Aporte registrado: ${formatCurrency(movement.amount)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel registrar o aporte.';
      setActionError(message);
    } finally {
      setIsSubmittingCapital(false);
    }
  };

  const handleRequestWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = parseCurrency(withdrawAmount);
    if (amount <= 0) {
      setActionError('Informe um valor valido para retirada.');
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      const movement = await investorService.requestWithdrawal({
        amount,
        description: withdrawNote.trim() || undefined,
      });
      setMovements((prev) => [movement, ...prev]);
      setWithdrawAmount('');
      setWithdrawNote('');
      setActionError(null);
      setActionMessage(`Solicitacao de retirada registrada: ${formatCurrency(movement.amount)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel solicitar retirada.';
      setActionError(message);
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleReviewDemand = async (demand: InvestorDemand, status: InvestorDemand['status']) => {
    try {
      setDemandActionId(demand.id);
      const updated = await investorService.reviewDemand(demand, status);
      setDemands((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionError(null);
      setActionMessage(`Demanda ${updated.id} atualizada para ${status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a demanda.';
      setActionError(message);
    } finally {
      setDemandActionId(null);
    }
  };

  const unifiedPortfolio = useMemo(
    () =>
      projects.reduce(
        (acc, item) => {
          const amount = parseCurrency(item.invested);
          return {
            invested: acc.invested + amount,
            active: acc.active + (item.status === 'Ativo' ? 1 : 0),
            closed: acc.closed + (item.status === 'Concluido' ? 1 : 0),
          };
        },
        { invested: 0, active: 0, closed: 0 }
      ),
    [projects]
  );

  const segmentedPortfolio = useMemo(
    () =>
      projects.reduce<Record<InvestorProject['portfolio'], { count: number; invested: number }>>(
        (acc, item) => {
          const amount = parseCurrency(item.invested);
          const current = acc[item.portfolio] ?? { count: 0, invested: 0 };
          acc[item.portfolio] = { count: current.count + 1, invested: current.invested + amount };
          return acc;
        },
        {
          'Credito Estruturado': { count: 0, invested: 0 },
          'Renda Variavel Agro': { count: 0, invested: 0 },
          Infraestrutura: { count: 0, invested: 0 },
        }
      ),
    [projects]
  );

  const totalForecast = useMemo(() => forecasts.reduce((sum, item) => sum + item.amount, 0), [forecasts]);
  const openDemandAmount = useMemo(
    () => demands.filter((item) => item.status !== 'Aprovada').reduce((sum, item) => sum + item.requestedAmount, 0),
    [demands]
  );

  if (isLoading) {
    return <LoadingSpinner text="Carregando investidor..." />;
  }

  if (initialLoadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{initialLoadError}</div>;
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
        <div className="lg:mr-auto">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal do Investidor</h2>
          <p className="text-slate-600">
            Plataforma para controle de investimentos, mercado, carteira, liquidacao e conta financeira integrada.
          </p>
          {actionMessage && (
            <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">{actionMessage}</p>
          )}
          {actionError && (
            <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{actionError}</p>
          )}
        </div>
        <div className="w-full lg:w-[460px] bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
          <form onSubmit={handleAllocateCapital} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={capitalAmount}
              onChange={(event) => setCapitalAmount(event.target.value)}
              placeholder="Aporte (R$)"
              className="md:col-span-1 p-2 border border-slate-300 rounded text-sm"
            />
            <input
              value={capitalNote}
              onChange={(event) => setCapitalNote(event.target.value)}
              placeholder="Descricao opcional"
              className="md:col-span-1 p-2 border border-slate-300 rounded text-sm"
            />
            <button
              type="submit"
              disabled={isSubmittingCapital}
              className="md:col-span-1 px-3 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmittingCapital ? 'Processando...' : 'Disponibilizar capital'}
            </button>
          </form>

          <form onSubmit={handleRequestWithdrawal} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="Retirada (R$)"
              className="md:col-span-1 p-2 border border-slate-300 rounded text-sm"
            />
            <input
              value={withdrawNote}
              onChange={(event) => setWithdrawNote(event.target.value)}
              placeholder="Descricao opcional"
              className="md:col-span-1 p-2 border border-slate-300 rounded text-sm"
            />
            <button
              type="submit"
              disabled={isSubmittingWithdrawal}
              className="md:col-span-1 px-3 py-2 bg-slate-700 text-white rounded text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmittingWithdrawal ? 'Processando...' : 'Solicitar retirada'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        {kpis.map((kpi) => {
          const Icon = iconMap[kpi.icon];
          return <KpiCard key={kpi.id} title={kpi.label} value={kpi.value} icon={Icon} color={kpi.color} />;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 xl:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <h3 className="text-xl font-bold text-slate-800 md:mr-auto">Carteira de Investimentos</h3>
            <div className="flex bg-slate-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('UNIFIED')}
                className={`px-3 py-1.5 text-xs font-bold rounded ${
                  viewMode === 'UNIFIED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Unificada
              </button>
              <button
                onClick={() => setViewMode('SEGMENTED')}
                className={`px-3 py-1.5 text-xs font-bold rounded ${
                  viewMode === 'SEGMENTED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Separada
              </button>
            </div>
          </div>

          {viewMode === 'UNIFIED' ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <p className="text-xs uppercase font-bold text-slate-500">Total Investido</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(unifiedPortfolio.invested)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <p className="text-xs uppercase font-bold text-slate-500">Projetos Ativos</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{unifiedPortfolio.active}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <p className="text-xs uppercase font-bold text-slate-500">Projetos Concluidos</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{unifiedPortfolio.closed}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Projeto</th>
                      <th className="text-left p-2">Carteira</th>
                      <th className="text-left p-2">Aporte</th>
                      <th className="text-left p-2">Retorno Prev.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-t border-slate-100">
                        <td className="p-2 font-semibold text-slate-700">{project.name}</td>
                        <td className="p-2">{project.portfolio}</td>
                        <td className="p-2">{project.invested}</td>
                        <td className="p-2">{project.expectedReturn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(segmentedPortfolio) as InvestorProject['portfolio'][]).map((segment) => (
                <div key={segment} className="border border-slate-200 rounded-lg p-4 flex items-center">
                  <div className="mr-auto">
                    <p className="font-semibold text-slate-800">{segment}</p>
                    <p className="text-xs text-slate-500">{segmentedPortfolio[segment].count} projetos</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(segmentedPortfolio[segment].invested)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Analise de Mercado</h3>
          <div className="space-y-3">
            {marketSignals.map((signal) => (
              <div key={signal.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-slate-800">{signal.market}</p>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      signal.trend === 'Alta'
                        ? 'bg-emerald-100 text-emerald-700'
                        : signal.trend === 'Baixa'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {signal.trend}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{signal.variation}</p>
                <p className="text-xs text-slate-600 mt-1">{signal.outlook}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Previsoes de Liquidacao</h3>
          <p className="text-sm text-slate-600 mb-3">Total previsto: {formatCurrency(totalForecast)}</p>
          <div className="space-y-3">
            {forecasts.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-3 flex items-center">
                <div className="mr-auto">
                  <p className="font-semibold text-slate-800">{item.asset}</p>
                  <p className="text-xs text-slate-500">Liquidacao prevista em {item.expectedDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-500">Confianca {item.confidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Demandas de Investimento (Tecnicos de Campo)</h3>
          <p className="text-sm text-slate-600 mb-3">Demandas abertas/em analise: {formatCurrency(openDemandAmount)}</p>
          <div className="space-y-3">
            {demands.map((demand) => (
              <div key={demand.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="mr-auto">
                    <p className="font-semibold text-slate-800">{demand.projectName}</p>
                    <p className="text-xs text-slate-500">{demand.technician} - {demand.stage}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold">{demand.status}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3">
                  <p className="text-sm font-bold text-slate-800 md:mr-auto">{formatCurrency(demand.requestedAmount)}</p>
                  <button
                    onClick={() => void handleReviewDemand(demand, 'Em Analise')}
                    disabled={demandActionId === demand.id}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-300 disabled:opacity-60"
                  >
                    Em analise
                  </button>
                  <button
                    onClick={() => void handleReviewDemand(demand, 'Aprovada')}
                    disabled={demandActionId === demand.id}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <LockClosedIcon className="h-5 w-5 text-blue-700 mr-2" />
          <h3 className="text-xl font-bold text-slate-800">Conta Vinculada Asaas e Movimentacoes Financeiras</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Todas as movimentacoes seguem trilha de auditoria com split e escrow conforme regras de liquidacao.
        </p>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Descricao</th>
                <th className="text-left p-3">Liquidacao</th>
                <th className="text-left p-3">Auditoria</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-t border-slate-100">
                  <td className="p-3">{movement.date}</td>
                  <td className="p-3">{movement.description}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold">{movement.settlement}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        movement.auditStatus === 'Validado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {movement.auditStatus}
                    </span>
                  </td>
                  <td className="p-3">{movement.direction}</td>
                  <td className="p-3 font-semibold">{formatCurrency(movement.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;
