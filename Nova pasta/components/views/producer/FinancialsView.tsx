import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankAccount, Expense, ExpenseStatus, Receivable, ReceivableStatus, Transaction } from '../../../types';
import { CashIcon } from '../../icons/CashIcon';
import LibraryIcon from '../../icons/LibraryIcon';
import DigitalAccountView from '../../shared/DigitalAccountView';
import DocumentReportIcon from '../../icons/DocumentReportIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { financialService, financialSplitConfig } from '../../../services/financialService';
import { useApp } from '../../../contexts/AppContext';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const entityLabelMap: Record<string, string> = {
  'PROP-001-CPF': 'CPF: Produtor',
  'AGRO-LTDA-CNPJ': 'CNPJ: Agro Silva Ltda',
};

const StatusBadge: React.FC<{ status: ReceivableStatus | ExpenseStatus }> = ({ status }) => {
  const statusStyles: Record<string, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    EM_ESCROW: 'bg-blue-100 text-blue-800',
    LIQUIDADO: 'bg-green-100 text-green-800',
    ATRASADO: 'bg-red-100 text-red-800',
    A_PAGAR: 'bg-yellow-100 text-yellow-800',
    PAGO: 'bg-green-100 text-green-800',
  };

  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status.replace('_', ' ')}</span>;
};

const FinancialsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DigitalAccount' | 'Receivables' | 'Expenses' | 'Reports'>('DigitalAccount');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const handleTrackLiquidation = (id: string) => navigate(`/account-control/${id}`);

  useEffect(() => {
    const loadFinancialData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [loadedReceivables, loadedExpenses, loadedAccounts, loadedTransactions] = await Promise.all([
          financialService.listReceivables(),
          financialService.listExpenses(),
          financialService.listBankAccounts(),
          financialService.listTransactions(),
        ]);

        setReceivables(loadedReceivables);
        setExpenses(loadedExpenses);
        setAccounts(loadedAccounts);
        setTransactions(loadedTransactions);
      } catch {
        setLoadError('Nao foi possivel carregar o modulo financeiro.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFinancialData();
  }, []);

  const entities = useMemo(() => {
    const ids = new Set<string>();
    receivables.forEach((item) => ids.add(item.fiscalEntityId));
    expenses.forEach((item) => ids.add(item.fiscalEntityId));
    return [{ id: 'ALL', label: 'Todas as Entidades' }].concat(
      Array.from(ids).map((id) => ({
        id,
        label: entityLabelMap[id] ?? id,
      }))
    );
  }, [receivables, expenses]);

  const selectedAccount = useMemo(() => {
    if (accounts.length === 0) {
      return null;
    }

    const role = currentUser?.role ?? 'Produtor';
    const normalizedRole = normalize(role);

    return (
      accounts.find((account) => normalize(account.userId) === normalizedRole) ||
      accounts.find((account) => normalize(account.userId) === 'produtor') ||
      accounts[0]
    );
  }, [accounts, currentUser]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }
    return transactions.filter((item) => item.accountId === selectedAccount.id);
  }, [selectedAccount, transactions]);

  const filteredReceivables = receivables.filter((item) => selectedEntity === 'ALL' || item.fiscalEntityId === selectedEntity);
  const filteredExpenses = expenses.filter((item) => selectedEntity === 'ALL' || item.fiscalEntityId === selectedEntity);
  const totalToReceive = filteredReceivables.filter((item) => item.status !== 'LIQUIDADO').reduce((sum, item) => sum + item.value, 0);
  const totalToPay = filteredExpenses.filter((item) => item.status !== 'PAGO').reduce((sum, item) => sum + item.value, 0);
  const provisionedRevenue = filteredReceivables
    .filter((item) => item.status === 'PENDENTE' || item.status === 'EM_ESCROW')
    .reduce((sum, item) => sum + item.value, 0);
  const realizedRevenue = filteredReceivables.filter((item) => item.status === 'LIQUIDADO').reduce((sum, item) => sum + item.value, 0);
  const estimatedFees = (realizedRevenue + provisionedRevenue) * (financialSplitConfig.platformFeeRate + financialSplitConfig.logisticsRate);

  if (isLoading) {
    return <LoadingSpinner text="Carregando financeiro..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Meu Financeiro</h2>
          <p className="text-slate-600">Controle bancario e fluxo de caixa.</p>
        </div>
        <select value={selectedEntity} onChange={(event) => setSelectedEntity(event.target.value)} className="w-80 p-2 border rounded-md">
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="flex items-center text-lg font-semibold">
            <LibraryIcon className="h-6 w-6 mr-3" />
            Previsao de Recebiveis
          </h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalToReceive)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <h3 className="flex items-center text-lg font-semibold">
            <CashIcon className="h-6 w-6 mr-3" />
            Contas a Pagar (ERP)
          </h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalToPay)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('DigitalAccount')}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === 'DigitalAccount' ? 'bg-slate-800 text-white border-b-4 border-emerald-500' : 'hover:bg-slate-50'}`}
          >
            Conta Digital
          </button>
          <button
            onClick={() => setActiveTab('Receivables')}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === 'Receivables' ? 'bg-green-50 text-green-700 border-b-4 border-green-500' : 'hover:bg-slate-50'}`}
          >
            Entradas
          </button>
          <button
            onClick={() => setActiveTab('Expenses')}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === 'Expenses' ? 'bg-red-50 text-red-700 border-b-4 border-red-500' : 'hover:bg-slate-50'}`}
          >
            Saidas
          </button>
          <button
            onClick={() => setActiveTab('Reports')}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === 'Reports' ? 'bg-indigo-50 text-indigo-700 border-b-4 border-indigo-500' : 'hover:bg-slate-50'}`}
          >
            Relatorios
          </button>
        </div>

        <div>
          {activeTab === 'DigitalAccount' && (
            <div className="p-6">
              {selectedAccount ? (
                <DigitalAccountView account={selectedAccount} transactions={accountTransactions} />
              ) : (
                <div className="p-4 bg-slate-50 border rounded-md text-slate-600">Nenhuma conta digital encontrada.</div>
              )}
            </div>
          )}

          {activeTab === 'Receivables' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left">Origem</th>
                  <th className="text-left">Vencimento</th>
                  <th className="text-left">Valor</th>
                  <th className="text-left">Status</th>
                  <th className="text-right pr-6">Acao</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceivables.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold">{item.origin}</td>
                    <td>{item.dueDate}</td>
                    <td className="font-bold text-green-700">{formatCurrency(item.value)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="text-right pr-6">
                      {item.status === 'EM_ESCROW' && (
                        <button onClick={() => handleTrackLiquidation(item.id)} className="px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-full">
                          Acompanhar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'Expenses' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left">Descricao</th>
                  <th className="text-left">Vencimento</th>
                  <th className="text-left">Valor</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold">{item.description}</td>
                    <td>{item.dueDate}</td>
                    <td className="font-bold text-red-700">{formatCurrency(item.value)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'Reports' && (
            <div className="p-8 space-y-8">
              <h3 className="text-xl font-bold flex items-center">
                <DocumentReportIcon className="h-6 w-6 mr-2 text-indigo-600" />
                Demonstrativo Consolidado
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="border p-5 rounded-lg">
                  <h4 className="text-sm font-bold uppercase mb-4">Receita</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Aprovisionado (Escrow)</span>
                      <span className="font-bold text-blue-600">{formatCurrency(provisionedRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Realizado (Liquidado)</span>
                      <span className="font-bold text-green-600">{formatCurrency(realizedRevenue)}</span>
                    </div>
                  </div>
                </div>
                <div className="border p-5 rounded-lg bg-slate-50">
                  <h4 className="text-sm font-bold uppercase mb-4">Custos</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Taxas + Logistica (Estimado)</span>
                      <span className="font-bold text-red-500">-{formatCurrency(estimatedFees)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialsView;
