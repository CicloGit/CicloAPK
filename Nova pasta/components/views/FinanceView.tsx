import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { BankAccount, Expense, Receivable, Transaction } from '../../types';
import { financialService } from '../../services/financialService';

const formatCurrency = (value: number) => {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
};

const FinanceView: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadFinance = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [acc, recv, exp, tx] = await Promise.all([
          financialService.listBankAccounts(),
          financialService.listReceivables(),
          financialService.listExpenses(),
          financialService.listTransactions(),
        ]);
        setAccounts(acc);
        setReceivables(recv);
        setExpenses(exp);
        setTransactions(tx);
      } catch {
        setLoadError('Nao foi possivel carregar o modulo financeiro.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFinance();
  }, []);

  const totalBalance = useMemo(() => accounts.reduce((sum, item) => sum + item.balance, 0), [accounts]);
  const totalBlocked = useMemo(() => accounts.reduce((sum, item) => sum + item.blockedBalance, 0), [accounts]);
  const totalReceivables = useMemo(
    () => receivables.filter(item => item.status !== 'LIQUIDADO').reduce((sum, item) => sum + item.value, 0),
    [receivables]
  );
  const totalExpenses = useMemo(
    () => expenses.filter(item => item.status !== 'PAGO').reduce((sum, item) => sum + item.value, 0),
    [expenses]
  );

  if (isLoading) {
    return <LoadingSpinner text="Carregando financeiro..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Modulo Financeiro</h2>
      <p className="text-slate-600 mb-8">Visao consolidada de contas, recebiveis, despesas e transacoes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Saldo Disponivel</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Saldo Bloqueado</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalBlocked)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Recebiveis em Aberto</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalReceivables)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <p className="text-xs text-slate-500 uppercase font-semibold">Despesas em Aberto</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Contas Bancarias</h3>
          <div className="space-y-4">
            {accounts.map(account => (
              <div key={account.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{account.holderName}</p>
                    <p className="text-xs text-slate-500">{account.agency}/{account.accountNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(account.balance)}</p>
                    <p className="text-xs text-slate-400">Bloqueado: {formatCurrency(account.blockedBalance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Recebiveis</h3>
          <div className="space-y-3">
            {receivables.slice(0, 6).map(item => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-700">{item.origin}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>{item.dueDate}</span>
                  <span className="font-semibold">{formatCurrency(item.value)}</span>
                </div>
                <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-800 mb-4">Despesas</h3>
          <div className="space-y-3">
            {expenses.slice(0, 6).map(item => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-700">{item.description}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>{item.dueDate}</span>
                  <span className="font-semibold">{formatCurrency(item.value)}</span>
                </div>
                <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h3 className="font-bold text-slate-800 mb-4">Transacoes Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-4 py-3">Descricao</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 8).map(item => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.accountId}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceView;
