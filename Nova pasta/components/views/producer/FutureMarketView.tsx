import React, { useEffect, useState } from 'react';
import { MarketOpportunity } from '../../../types';
import TrendingUpIcon from '../../icons/TrendingUpIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { futureMarketService } from '../../../services/futureMarketService';

const FutureMarketView: React.FC = () => {
    const [selectedOpportunity, setSelectedOpportunity] = useState<MarketOpportunity | null>(null);
    const [lockStep, setLockStep] = useState<'LIST' | 'CONFIRM' | 'SUCCESS'>('LIST');
    const [quantityToLock, setQuantityToLock] = useState('');
    const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadOpportunities = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const loaded = await futureMarketService.listOpportunities();
                setOpportunities(loaded);
            } catch {
                setLoadError('Nao foi possivel carregar o mercado futuro.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadOpportunities();
    }, []);

    const handleSelectOpportunity = (opp: MarketOpportunity) => {
        setSelectedOpportunity(opp);
        setLockStep('CONFIRM');
    };

    const handleConfirmLock = () => {
        setLockStep('SUCCESS');
    };

    const handleClose = () => {
        setLockStep('LIST');
        setSelectedOpportunity(null);
        setQuantityToLock('');
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando mercado futuro..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    if (lockStep === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-md p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Contrato Travado com Sucesso!</h2>
                <p className="text-slate-600 mb-6 max-w-md">
                    Voce garantiu a venda de <span className="font-bold text-slate-800">{quantityToLock} {selectedOpportunity?.unit}</span> de {selectedOpportunity?.commodity} para <span className="font-bold text-slate-800">{selectedOpportunity?.buyer}</span>.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 w-full max-w-md">
                    <p className="text-sm text-slate-500 mb-1">Valor Total Estimado (Travado)</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {selectedOpportunity && quantityToLock ? formatCurrency(selectedOpportunity.price * parseFloat(quantityToLock)) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Um contrato digital foi gerado e o Escrow foi acionado.</p>
                </div>
                <button onClick={handleClose} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors">
                    Voltar ao Mercado
                </button>
            </div>
        );
    }

    if (lockStep === 'CONFIRM' && selectedOpportunity) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200 mt-8">
                <div className="bg-indigo-600 p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center">
                        <LockClosedIcon className="h-6 w-6 mr-3" />
                        Travar Preco: {selectedOpportunity.commodity}
                    </h2>
                    <p className="opacity-80">Garantia de venda futura para {selectedOpportunity.buyer}</p>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Comprador</p>
                            <p className="text-lg font-semibold text-slate-800">{selectedOpportunity.buyer}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Local de Entrega</p>
                            <p className="text-lg font-semibold text-slate-800">{selectedOpportunity.location}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Janela de Entrega</p>
                            <p className="text-lg font-semibold text-slate-800">{selectedOpportunity.deliveryWindow}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Preco Ofertado</p>
                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedOpportunity.price)} <span className="text-sm font-normal text-slate-500">/ {selectedOpportunity.unit}</span></p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade a Travar ({selectedOpportunity.unit})</label>
                        <input 
                            type="number" 
                            value={quantityToLock}
                            onChange={(e) => setQuantityToLock(e.target.value)}
                            placeholder={`Minimo: ${selectedOpportunity.minQuantity}`}
                            className="w-full p-4 border border-slate-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-2">Ao confirmar, um contrato digital sera gerado automaticamente.</p>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setLockStep('LIST')} className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleConfirmLock} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                            Confirmar Trava (Lock)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                        <TrendingUpIcon className="h-8 w-8 mr-3 text-indigo-600" />
                        Mercado Futuro
                    </h2>
                    <p className="text-slate-600">Ofertas do mercado aberto para entrega futura. Trave o preco e garanta sua margem.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {opportunities.map(opp => (
                    <div key={opp.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-100 overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-bold text-slate-700">{opp.commodity}</span>
                            <span className="text-xs font-semibold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">{opp.deliveryWindow}</span>
                        </div>
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Comprador</p>
                                    <p className="text-lg font-bold text-slate-800">{opp.buyer}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(opp.price)}</p>
                                    <p className="text-xs text-slate-500">por {opp.unit}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600 mb-6">
                                <p className="flex justify-between"><span>Local:</span> <span className="font-medium">{opp.location}</span></p>
                                <p className="flex justify-between"><span>Lote Minimo:</span> <span className="font-medium">{opp.minQuantity}</span></p>
                            </div>
                            <button 
                                onClick={() => handleSelectOpportunity(opp)}
                                className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-all flex justify-center items-center group"
                            >
                                <LockClosedIcon className="h-4 w-4 mr-2 group-hover:text-emerald-400 transition-colors" />
                                Travar Preco
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FutureMarketView;
