import React, { useEffect, useMemo, useState } from 'react';
import { CubeIcon } from '../icons/CubeIcon';
import { TagIcon } from '../icons/TagIcon';
import { CashIcon } from '../icons/CashIcon';
import ExclamationIcon from '../icons/ExclamationIcon';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TruckIcon from '../icons/TruckIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { supplierService } from '../../services/supplierService';
import { commercialService } from '../../services/commercialService';
import { useApp } from '../../contexts/AppContext';
import { MarketplaceListing, SupplierFinancialSummary, SupplierOrder, SupplierOrderStatus } from '../../types';

type SupplierTab = 'OVERVIEW' | 'PRODUCTS' | 'ORDERS' | 'FINANCE';

const StatusBadge: React.FC<{ status: SupplierOrderStatus }> = ({ status }) => {
    const styles: Record<SupplierOrderStatus, string> = {
        'PENDENTE': 'bg-yellow-100 text-yellow-800 animate-pulse',
        'ENVIADO': 'bg-blue-100 text-blue-800',
        'ENTREGUE': 'bg-green-100 text-green-800',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>;
};


const SupplierDashboard: React.FC = () => {
    const { currentUser } = useApp();
    const [activeTab, setActiveTab] = useState<SupplierTab>('OVERVIEW');
    const [orders, setOrders] = useState<SupplierOrder[]>([]);
    const [financials, setFinancials] = useState<SupplierFinancialSummary[]>([]);
    const [products, setProducts] = useState<MarketplaceListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadSupplier = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedOrders, loadedFinancials, loadedProducts] = await Promise.all([
                    supplierService.listOrders(),
                    supplierService.listFinancialSummaries(),
                    commercialService.listMarketplaceListings({
                        categories: ['INPUTS_INDUSTRY'],
                        onlyOwnListings: true,
                        ownerUserId: currentUser?.uid,
                    }),
                ]);
                setOrders(loadedOrders);
                setFinancials(loadedFinancials);
                setProducts(loadedProducts);
            } catch {
                setLoadError('Nao foi possivel carregar o painel do fornecedor.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadSupplier();
    }, [currentUser?.uid]);

    const handleShipOrder = async (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ENVIADO' } : o));
        try {
            await supplierService.markOrderShipped(orderId);
        } catch {
            setLoadError('Nao foi possivel atualizar o pedido.');
        }
    };

    // KPI Calculations
    const pendingOrders = orders.filter(o => o.status === 'PENDENTE').length;
    const monthlyRevenue = useMemo(() => {
        return financials.find(f => f.month === 'Maio/2024')?.totalSales || 0;
    }, [financials]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando fornecedor..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

  return (
    <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Fornecedor (ERP)</h2>
        <p className="text-slate-600 mb-8">Gerencie seu catalogo, pedidos e faturamento na plataforma Ciclo+.</p>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6">
            <button onClick={() => setActiveTab('OVERVIEW')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'OVERVIEW' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Visao Geral</button>
            <button onClick={() => setActiveTab('PRODUCTS')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'PRODUCTS' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Produtos</button>
            <button onClick={() => setActiveTab('ORDERS')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'ORDERS' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Pedidos</button>
            <button onClick={() => setActiveTab('FINANCE')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'FINANCE' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Financeiro</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
            <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                        <p className="text-sm text-slate-500">Pedidos a Enviar</p>
                        <p className="text-3xl font-bold text-slate-800">{pendingOrders}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500">
                        <p className="text-sm text-slate-500">Faturamento (Mes)</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(monthlyRevenue)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                        <p className="text-sm text-slate-500">Produtos Ativos</p>
                        <p className="text-3xl font-bold text-slate-800">{products.length}</p>
                    </div>
                </div>
                <div>
                     <h3 className="text-xl font-bold text-slate-800 mb-4">Acoes Urgentes</h3>
                     <div className="bg-white rounded-lg shadow-md p-4">
                        {pendingOrders > 0 ? (
                             orders.filter(o => o.status === 'PENDENTE').map(order => (
                                <div key={order.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                                    <p>Pedido <span className="font-bold">{order.id}</span> de <span className="font-semibold">{order.customer}</span> aguarda envio.</p>
                                    <button onClick={() => setActiveTab('ORDERS')} className="text-indigo-600 font-bold text-sm hover:underline">Ver Pedido</button>
                                </div>
                             ))
                        ) : <p className="text-slate-500 text-center py-4">Nenhuma acao urgente.</p>}
                     </div>
                </div>
            </div>
        )}
        
        {/* PRODUCTS TAB */}
        {activeTab === 'PRODUCTS' && (
            <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Meu Catalogo de Produtos</h3>
                    <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold">
                        <PlusCircleIcon className="h-4 w-4 mr-2" /> Novo Produto
                    </button>
                </div>
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th className="px-6 py-3">Produto</th>
                            <th className="px-6 py-3">Categoria</th>
                            <th className="px-6 py-3">Preco Unitario</th>
                            <th className="px-6 py-3">Estoque B2B</th>
                            <th className="px-6 py-3">Acoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(item => (
                            <tr key={item.id} className="border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold">{item.productName}</td>
                                <td className="px-6 py-4">{item.category}</td>
                                <td className="px-6 py-4">{formatCurrency(item.price)} / {item.unit}</td>
                                <td className="px-6 py-4">{item.b2bStock}</td>
                                <td className="px-6 py-4"><button className="text-indigo-600 font-semibold hover:underline">Editar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'ORDERS' && (
             <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Pedidos de Compra Recebidos</h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th className="px-6 py-3">Pedido</th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Acao</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                             <tr key={order.id} className="border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono">{order.id}</td>
                                <td className="px-6 py-4 font-bold">{order.customer}</td>
                                <td className="px-6 py-4">{formatCurrency(order.totalValue)}</td>
                                <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                                <td className="px-6 py-4 text-right">
                                    {order.status === 'PENDENTE' && (
                                        <button onClick={() => handleShipOrder(order.id)} className="flex items-center ml-auto px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600">
                                            <TruckIcon className="h-4 w-4 mr-1"/>
                                            Confirmar Envio
                                        </button>
                                    )}
                                </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'FINANCE' && (
             <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Repasses e Taxas</h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th className="px-6 py-3">Periodo</th>
                            <th className="px-6 py-3">Vendas Brutas</th>
                            <th className="px-6 py-3">Taxas da Plataforma</th>
                            <th className="px-6 py-3">Repasse Liquido</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                     <tbody>
                        {financials.map(fin => (
                            <tr key={fin.month} className="border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold">{fin.month}</td>
                                <td className="px-6 py-4">{formatCurrency(fin.totalSales)}</td>
                                <td className="px-6 py-4 text-red-600">({formatCurrency(fin.platformFees)})</td>
                                <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(fin.netPayout)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full font-bold text-xs ${fin.status === 'PAGO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {fin.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        )}
    </div>
  );
};

export default SupplierDashboard;
