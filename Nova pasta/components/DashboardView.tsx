
import React from 'react';
import { operations, dataDictionaryEntities } from '../constants';
import { CashIcon } from './icons/CashIcon';
import { CubeIcon } from './icons/CubeIcon';
import { TagIcon } from './icons/TagIcon';

// Helper icons for the dashboard widgets
const ProjectIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const CreditIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const ActionIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const ActivityIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;


const DashboardView: React.FC = () => {
    // Mock data from constants
    const limitUtilizado = 75000;
    const limiteVigente = 200000;
    const progress = (limitUtilizado / limiteVigente) * 100;

    const quickActions = [
        operations.find(op => op.operation === "Solicitar Compra"),
        operations.find(op => op.operation === "Cadastro de Animais"),
        operations.find(op => op.operation === "Escalar venda de Lote"),
    ].filter(Boolean);

    const recentActivity = [
        { ...operations[2], time: "2h atrás", user: "João (Estoquista)" }, // Entrada Estoque
        { ...operations[1], time: "8h atrás", user: "Maria (Produtora)" }, // Solicitar Compra
        { ...operations[0], time: "2d atrás", user: "Pedro (Técnico)" },   // Montar Projeto
    ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Produtor</h2>
      <p className="text-slate-600 mb-8">Bem-vindo! Aqui está um resumo das suas atividades e projetos.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Project Summary Card */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2 xl:col-span-3">
            <div className="flex items-center text-indigo-700 mb-4">
                <ProjectIcon />
                <h3 className="text-xl font-bold ml-3">Projeto: Safra de Soja 2024</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-slate-500">Status</p><p className="text-lg font-bold text-slate-800">EM ANDAMENTO</p></div>
                <div><p className="text-xs text-slate-500">Volume Produção</p><p className="text-lg font-bold text-slate-800">5.000 sacas</p></div>
                <div><p className="text-xs text-slate-500">Prazo Venda</p><p className="text-lg font-bold text-slate-800">Dez/2024</p></div>
                <div><p className="text-xs text-slate-500">Preço Alvo</p><p className="text-lg font-bold text-slate-800">R$ 130/saca</p></div>
            </div>
        </div>

        {/* Finance Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center text-green-700 mb-4"><CashIcon className="h-6 w-6" /><h3 className="text-xl font-bold ml-3">Resumo Financeiro</h3></div>
            <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">A Receber</span><span className="font-bold text-green-600">R$ 120.500,00</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">A Pagar</span><span className="font-bold text-red-600">R$ 45.200,00</span></div><div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="text-slate-800 font-bold">Saldo Previsto</span><span className="font-extrabold text-slate-800">R$ 75.300,00</span></div></div>
        </div>
        
        {/* Stock Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center text-blue-700 mb-4"><CubeIcon className="h-6 w-6" /><h3 className="text-xl font-bold ml-3">Visão Geral do Estoque</h3></div>
            <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">Itens em Estoque</span><span className="font-bold text-slate-800">42 tipos</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Valor Total</span><span className="font-bold text-slate-800">R$ 89.750,00</span></div><div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="text-orange-600 font-bold">Alertas de Reposição</span><span className="font-extrabold text-orange-600">3</span></div></div>
        </div>
        
        {/* Sales Summary */}
         <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center text-purple-700 mb-4"><TagIcon className="h-6 w-6" /><h3 className="text-xl font-bold ml-3">Painel de Vendas</h3></div>
            <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">Ofertas Ativas</span><span className="font-bold text-slate-800">12</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Propostas Recebidas</span><span className="font-bold text-slate-800">5</span></div><div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="text-slate-800 font-bold">Contratos Vigentes</span><span className="font-extrabold text-slate-800">8</span></div></div>
        </div>


        {/* Credit Limit Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center text-emerald-700 mb-4"><CreditIcon /><h3 className="text-xl font-bold ml-3">Limite de Crédito</h3></div>
            <p className="text-sm text-slate-600 mb-1">Utilizado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limitUtilizado)}</p>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
             <p className="text-right text-xs text-slate-500 mt-1">{progress.toFixed(0)}% de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limiteVigente)}</p>
        </div>
        
        {/* Quick Actions Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center text-sky-700 mb-4"><ActionIcon /><h3 className="text-xl font-bold ml-3">Ações Rápidas</h3></div>
             <div className="space-y-2">
                {quickActions.map((action, i) => action && (
                    <button key={i} className="w-full text-left p-2 bg-slate-50 hover:bg-sky-100 rounded-md transition-colors text-sm">
                        <p className="font-semibold text-slate-700">{action.operation}</p>
                    </button>
                ))}
            </div>
        </div>
        
        {/* Recent Activity Card */}
        <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-2">
             <h3 className="text-xl font-bold text-slate-800 mb-4">Atividade Recente</h3>
             <ul className="space-y-4">
                {recentActivity.map((act, i) => (
                     <li key={i} className="flex items-center space-x-4">
                        <div className="flex-shrink-0 bg-slate-200 rounded-full h-8 w-8 flex items-center justify-center"><ActivityIcon /></div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{act.operation}</p>
                            <p className="text-xs text-slate-500">Por <span className="font-medium">{act.user}</span> - {act.time}</p>
                        </div>
                     </li>
                ))}
             </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
