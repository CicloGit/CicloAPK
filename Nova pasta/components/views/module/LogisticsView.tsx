import React, { useEffect, useState } from 'react';
import TruckIcon from '../../icons/TruckIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { logisticsService } from '../../../services/logisticsService';
import { LogisticsEntry } from '../../../types';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        'SOLICITADO': 'bg-yellow-100 text-yellow-800',
        'AGENDADO': 'bg-blue-100 text-blue-800',
        'EM_TRANSITO': 'bg-indigo-100 text-indigo-800 animate-pulse',
        'ENTREGUE': 'bg-green-100 text-green-800',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status] || 'bg-slate-100'}`}>{status.replace('_', ' ')}</span>;
};

const LogisticsView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [entries, setEntries] = useState<LogisticsEntry[]>([]);

    useEffect(() => {
        const loadEntries = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await logisticsService.listEntries();
                setEntries(data);
            } catch {
                setLoadError('Nao foi possivel carregar os dados de logistica.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadEntries();
    }, []);

    if (isLoading) {
        return <LoadingSpinner text="Carregando logistica..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel de Logistica</h2>
            <p className="text-slate-600 mb-8">Gerencie coletas, entregas e acompanhe transportes em tempo real.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Shipments List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Transportes Ativos e Recentes</h3>
                        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold">
                            <PlusCircleIcon className="h-4 w-4 mr-2" />
                            Nova Solicitacao
                        </button>
                    </div>

                    {entries.map(entry => (
                        <div key={entry.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                            <div className="flex flex-col md:flex-row justify-between md:items-start mb-4">
                                <div>
                                    <div className="flex items-center mb-1">
                                        <TruckIcon className="h-5 w-5 text-slate-500 mr-2" />
                                        <h4 className="font-bold text-lg text-slate-800">{entry.description}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mb-2">ID: {entry.id}</p>
                                </div>
                                <StatusBadge status={entry.status} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs uppercase font-bold">Origem</p>
                                    <p className="text-slate-800">{entry.origin}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-full h-0.5 bg-slate-300 relative">
                                        <div className="absolute -top-1.5 right-0 w-3 h-3 bg-slate-400 rounded-full"></div>
                                        <div className="absolute -top-1.5 left-0 w-3 h-3 bg-slate-400 rounded-full"></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{entry.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-xs uppercase font-bold">Destino</p>
                                    <p className="text-slate-800">{entry.destination}</p>
                                </div>
                            </div>

                            {entry.driver && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Motorista: <span className="font-semibold">{entry.driver}</span></span>
                                    <span className="text-slate-600">Placa: <span className="font-mono bg-slate-100 px-1 rounded">{entry.plate}</span></span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick Stats / Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h4 className="font-bold text-slate-800 mb-4">Resumo Mensal</h4>
                        <ul className="space-y-3">
                            <li className="flex justify-between text-sm"><span className="text-slate-600">Fretes Realizados</span><span className="font-bold">12</span></li>
                            <li className="flex justify-between text-sm"><span className="text-slate-600">Custo Total</span><span className="font-bold text-red-600">R$ 4.500,00</span></li>
                            <li className="flex justify-between text-sm"><span className="text-slate-600">Entregas no Prazo</span><span className="font-bold text-green-600">98%</span></li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2">Precisa de transporte urgente?</h4>
                        <p className="text-sm text-blue-700 mb-4">Conecte-se com nossa rede de parceiros logisticos.</p>
                        <button className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700">Cotar Frete Rapido</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsView;
