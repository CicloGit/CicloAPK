import React, { useState } from 'react';
import { BankAccount, Transaction } from '../../types';
import { CashIcon } from '../icons/CashIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ArrowLeftIcon from '../icons/ArrowLeftIcon';

interface DigitalAccountViewProps {
    account: BankAccount;
    onBack?: () => void;
    transactions?: Transaction[];
}

const DigitalAccountView: React.FC<DigitalAccountViewProps> = ({ account, onBack, transactions: externalTransactions }) => {
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    
    const transactions = (externalTransactions ?? []).filter(t => t.accountId === account.id);
    const filteredTransactions = transactions.filter(t => filter === 'ALL' || (filter === 'IN' ? t.amount > 0 : t.amount < 0));

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatTxType = (type: string) => ({'PIX_IN': 'Pix Recebido', 'PIX_OUT': 'Pix Enviado', 'COMMISSION': 'Comissão', 'SALE': 'Venda', 'PURCHASE': 'Compra', 'SPLIT': 'Taxa/Split'}[type] || type);

    return (
        <div className="animate-fade-in">
            {onBack && <button onClick={onBack} className="flex items-center text-sm text-slate-500 mb-4 hover:text-slate-700"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Voltar</button>}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-10"><CashIcon className="h-32 w-32" /></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div><h2 className="text-xl font-bold">Conta Digital UPCL</h2><p className="text-xs text-slate-400">Integrado via Asaas</p></div>
                        <div className="text-right"><p className="text-xs">Ag / Conta</p><p className="font-mono font-bold">{account.agency} / {account.accountNumber}</p></div>
                    </div>
                    <div className="flex items-end gap-8">
                        <div><p className="text-xs uppercase mb-1">Saldo Disponível</p><p className="text-3xl font-bold">{formatCurrency(account.balance)}</p></div>
                        {account.blockedBalance > 0 && <div className="bg-white/10 p-3 rounded-lg"><div className="flex items-center text-xs text-yellow-300"><LockClosedIcon className="h-3 w-3 mr-1" />Saldo em Garantia</div><p className="text-xl font-bold">{formatCurrency(account.blockedBalance)}</p></div>}
                    </div>
                    <div className="mt-6 flex gap-3"><button className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-2 rounded-lg text-sm font-bold">Pix / Transferir</button><button className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-bold">Cobrar</button><button className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-bold">Extrato</button></div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Histórico</h3><div className="flex bg-slate-100 rounded p-1"><button onClick={() => setFilter('ALL')} className={`px-3 py-1 text-xs rounded font-bold ${filter==='ALL'?'bg-white shadow':''}`}>Tudo</button><button onClick={() => setFilter('IN')} className={`px-3 py-1 text-xs rounded font-bold ${filter==='IN'?'bg-white shadow':''}`}>Entradas</button><button onClick={() => setFilter('OUT')} className={`px-3 py-1 text-xs rounded font-bold ${filter==='OUT'?'bg-white shadow':''}`}>Saídas</button></div></div>
                <div className="divide-y">{filteredTransactions.length === 0 ? <div className="p-8 text-center text-slate-400">Nenhuma movimentação.</div> : filteredTransactions.map(tx => (<div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50"><div className="flex items-center"><div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}><CashIcon className="h-5 w-5" /></div><div><p className="font-bold text-sm">{tx.description}</p><p className="text-xs text-slate-500">{formatTxType(tx.type)} • {tx.date}</p></div></div><div className="text-right"><p className={`font-bold ${tx.amount > 0 ? 'text-green-600':''}`}>{tx.amount > 0 ? '+':''}{formatCurrency(tx.amount)}</p>{tx.status === 'COMPLETED' && <p className="text-[10px] text-green-600 flex items-center justify-end"><CheckCircleIcon className="h-3 w-3 mr-1" />Confirmado</p>}</div></div>))}</div>
            </div>
        </div>
    );
};

export default DigitalAccountView;
