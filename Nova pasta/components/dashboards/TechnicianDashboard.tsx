import React, { useEffect, useMemo, useState } from 'react';
import UsersIcon from '../icons/UsersIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { CashIcon } from '../icons/CashIcon';
import DigitalAccountView from '../shared/DigitalAccountView';
import LoadingSpinner from '../shared/LoadingSpinner';
import { financialService } from '../../services/financialService';
import { technicianService, TechnicianKpi, TechnicianReportItem } from '../../services/technicianService';
import { BankAccount, Transaction } from '../../types';

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{className?: string}> }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <Icon className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
    </div>
);

const TechnicianDashboard: React.FC = () => {
  const [showWallet, setShowWallet] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kpis, setKpis] = useState<TechnicianKpi[]>([]);
  const [reports, setReports] = useState<TechnicianReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const techAccount = useMemo(() => {
      return accounts.find((account) => account.userId === 'Técnico') || accounts[0] || null;
  }, [accounts]);

  const accountTransactions = useMemo(() => {
      if (!techAccount) {
          return [];
      }
      return transactions.filter((item) => item.accountId === techAccount.id);
  }, [transactions, techAccount]);

  useEffect(() => {
      const loadTechnician = async () => {
          setIsLoading(true);
          setLoadError(null);
          try {
              const [loadedAccounts, loadedTransactions, loadedKpis, loadedReports] = await Promise.all([
                  financialService.listBankAccounts(),
                  financialService.listTransactions(),
                  technicianService.listKpis(),
                  technicianService.listReports(),
              ]);
              setAccounts(loadedAccounts);
              setTransactions(loadedTransactions);
              setKpis(loadedKpis);
              setReports(loadedReports);
          } catch {
              setLoadError('Nao foi possivel carregar o painel do tecnico.');
          } finally {
              setIsLoading(false);
          }
      };

      void loadTechnician();
  }, []);

  if (isLoading) {
      return <LoadingSpinner text="Carregando tecnico..." />;
  }

  if (loadError) {
      return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  if (showWallet) {
      return (
          <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Minha Carteira Digital</h2>
              <p className="text-slate-600 mb-6">Gestao de recebimentos por servicos tecnicos e comissoes.</p>
              {techAccount ? (
                  <DigitalAccountView account={techAccount} transactions={accountTransactions} onBack={() => setShowWallet(false)} />
              ) : (
                  <div className="p-4 bg-slate-50 border rounded-md text-slate-600">Nenhuma conta digital encontrada.</div>
              )}
          </div>
      )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Tecnico</h2>
            <p className="text-slate-600">Gerencie seus produtores, projetos e relatorios de campo.</p>
          </div>
          <button 
            onClick={() => setShowWallet(true)}
            className="flex items-center px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 transition-colors"
          >
              <CashIcon className="h-6 w-6 mr-2" />
              <span>Ver Minha Conta (R$ {techAccount ? techAccount.balance.toFixed(2) : '0.00'})</span>
          </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* KPI Cards */}
        {kpis.map((kpi) => (
            <KpiCard key={kpi.id} title={kpi.label} value={kpi.value} icon={UsersIcon} />
        ))}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Acoes Rapidas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button className="p-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors">Cadastrar Animal</button>
                <button className="p-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors">Emitir Laudo Tecnico</button>
                <button className="p-3 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition-colors">Agendar Visita</button>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
             <h3 className="text-xl font-bold text-slate-800 mb-4">Relatorios Recentes</h3>
             <ul className="space-y-3">
                {reports.map((report) => (
                    <li key={report.id} className="text-sm"><span className="font-semibold text-slate-700">{report.title}</span> - {report.location} <span className="text-slate-500">({report.dateLabel})</span></li>
                ))}
             </ul>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
