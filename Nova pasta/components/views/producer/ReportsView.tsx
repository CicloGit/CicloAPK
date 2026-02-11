import React, { useEffect, useMemo, useState } from 'react';
import ChartBarIcon from '../../icons/ChartBarIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import TrendingUpIcon from '../../icons/TrendingUpIcon';
import { CashIcon } from '../../icons/CashIcon';
import CalculatorIcon from '../../icons/CalculatorIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { MarketTrend } from '../../../types';
import { reportsService, ConsumptionReportRow, CapacityReport } from '../../../services/reportsService';

const ReportsView: React.FC = () => {
    const [activeReport, setActiveReport] = useState<'CONSUMPTION' | 'CAPACITY' | 'MARGIN'>('CONSUMPTION');
    const [selectedBatch, setSelectedBatch] = useState('Lote A - Recria');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    const [consumptionData, setConsumptionData] = useState<ConsumptionReportRow[]>([]);
    const [capacityData, setCapacityData] = useState<CapacityReport | null>(null);

    // --- MARGIN SIMULATION STATE ---
    const [simCommodity, setSimCommodity] = useState('Boi Gordo');
    const [salePrice, setSalePrice] = useState<number>(0);
    const [costPerUnit, setCostPerUnit] = useState<number>(180.00); // Custo Operacional por @
    const [replacementCost, setReplacementCost] = useState<number>(2500.00); // Preco do Bezerro
    const [saleWeight, setSaleWeight] = useState<number>(20); // 20@ (approx 600kg)

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadReports = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedTrends, loadedConsumption, loadedCapacity] = await Promise.all([
                    reportsService.listMarketTrends(),
                    reportsService.listConsumptionRows(),
                    reportsService.getCapacityReport(),
                ]);
                setMarketTrends(loadedTrends);
                setConsumptionData(loadedConsumption);
                setCapacityData(loadedCapacity);
            } catch {
                setLoadError('Nao foi possivel carregar os relatorios.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadReports();
    }, []);

    const marketPriceBoi = useMemo(() => {
        return marketTrends.find(t => t.commodity === 'Boi Gordo')?.price || 295.00;
    }, [marketTrends]);

    useEffect(() => {
        if (salePrice === 0) {
            setSalePrice(marketPriceBoi);
        }
    }, [marketPriceBoi, salePrice]);

    // Derived Calculations
    const revenuePerHead = salePrice * saleWeight;
    const totalCostPerHead = costPerUnit * saleWeight; // Operational Cost
    const grossMarginPerHead = revenuePerHead - totalCostPerHead;
    const marginPercent = totalCostPerHead > 0 ? (grossMarginPerHead / totalCostPerHead) * 100 : 0;
    
    // "Relacao de Troca" (Exchange Ratio): How many calves can I buy with 1 fat ox?
    // Formula: (Sale Price * Sale Weight) / Replacement Unit Cost
    const exchangeRatio = replacementCost > 0 ? (revenuePerHead / replacementCost) : 0;

    // Scenarios (Sensitivity Analysis)
    const scenarios = useMemo(() => {
        const variations = [-0.1, 0, 0.1]; // -10%, 0%, +10%
        return variations.map(v => {
            const p = salePrice * (1 + v);
            const r = p * saleWeight;
            const m = r - totalCostPerHead;
            return {
                label: v === 0 ? 'Cenario Base' : v > 0 ? 'Otimista (+10%)' : 'Pessimista (-10%)',
                price: p,
                margin: m,
                roi: totalCostPerHead > 0 ? (m / totalCostPerHead) * 100 : 0,
                ratio: replacementCost > 0 ? (r / replacementCost) : 0
            };
        });
    }, [salePrice, saleWeight, totalCostPerHead, replacementCost]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando relatorios..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Relatorios Gerenciais & Performance
            </h2>
            <p className="text-slate-600 mb-8">
                Analise detalhada baseada nos lancamentos operacionais de campo.
            </p>

            {/* Report Selector */}
            <div className="flex flex-wrap gap-2 bg-slate-200 p-1 rounded-lg mb-8 w-fit">
                <button 
                    onClick={() => setActiveReport('CONSUMPTION')}
                    className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CONSUMPTION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <CubeIcon className="h-4 w-4 mr-2" />
                    Consumo
                </button>
                <button 
                    onClick={() => setActiveReport('CAPACITY')}
                    className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CAPACITY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <TrendingUpIcon className="h-4 w-4 mr-2" />
                    Capacidade
                </button>
                <button 
                    onClick={() => setActiveReport('MARGIN')}
                    className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'MARGIN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <CashIcon className="h-4 w-4 mr-2" />
                    Margem & Lucro
                </button>
            </div>

            {/* CONSUMPTION REPORT */}
            {activeReport === 'CONSUMPTION' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Relatorio de Consumo por Lote</h3>
                            <select 
                                value={selectedBatch} 
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="p-2 border border-slate-300 rounded-md bg-slate-50 text-sm font-semibold text-slate-700"
                            >
                                <option>Lote A - Recria</option>
                                <option>Lote B - Maternidade</option>
                                <option>Lote C - Terminacao</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <p className="text-xs font-bold text-indigo-800 uppercase">Total Animais no Lote</p>
                                <p className="text-2xl font-bold text-indigo-900">120 <span className="text-sm font-normal">cabecas</span></p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-800 uppercase">Custo Medio Total / Cabeca</p>
                                <p className="text-2xl font-bold text-emerald-900">R$ 34,70</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-600 uppercase">Periodo de Analise</p>
                                <p className="text-lg font-bold text-slate-800">Ultimos 30 dias</p>
                            </div>
                        </div>

                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                                <tr>
                                    <th className="p-4 rounded-tl-lg">Produto / Insumo</th>
                                    <th className="p-4">Consumo Total (Lote)</th>
                                    <th className="p-4">Media / Animal</th>
                                    <th className="p-4">Media Diaria</th>
                                    <th className="p-4 rounded-tr-lg text-right">Custo Estimado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consumptionData.map((row) => (
                                    <tr key={row.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-700">{row.product}</td>
                                        <td className="p-4 font-mono text-slate-600">{row.total}</td>
                                        <td className="p-4 font-mono text-indigo-600 font-bold">{row.avgPerAnimal}</td>
                                        <td className="p-4 text-slate-500">{row.dailyAvg}</td>
                                        <td className="p-4 text-right font-bold text-slate-800">{row.costPerHead}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-4">* Dados calculados com base nas saidas de estoque vinculadas a este lote.</p>
                    </div>
                </div>
            )}

            {/* CAPACITY REPORT */}
            {activeReport === 'CAPACITY' && capacityData && (
                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Tempo de Producao (Ciclo Atual)</h3>
                        
                        <div className="relative pt-6 pb-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                                <span>Inicio: {capacityData.cycleStart}</span>
                                <span>Hoje (Dia {capacityData.daysElapsed})</span>
                                <span>Meta: {capacityData.projectedEnd}</span>
                            </div>
                            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 rounded-full" 
                                    style={{ width: `${(capacityData.daysElapsed / capacityData.totalDays) * 100}%` }}
                                ></div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded border text-center">
                                    <p className="text-xs text-slate-500">Dias Restantes Estimados</p>
                                    <p className="text-xl font-bold text-slate-800">{capacityData.totalDays - capacityData.daysElapsed} dias</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded border text-center">
                                    <p className="text-xs text-slate-500">Eficiencia de Ganho</p>
                                    <p className="text-xl font-bold text-green-600">{capacityData.efficiency}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Capacidade & Evolucao</h3>
                        <ul className="space-y-4">
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                <span className="text-sm font-semibold text-slate-600">Animais Entrados</span>
                                <span className="font-bold text-slate-800">{capacityData.animalsIn}</span>
                            </li>
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                <span className="text-sm font-semibold text-slate-600">Mortalidade / Perda</span>
                                <span className="font-bold text-red-600">{capacityData.mortality} ({((capacityData.mortality/capacityData.animalsIn)*100).toFixed(1)}%)</span>
                            </li>
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                <span className="text-sm font-semibold text-slate-600">Peso Atual Medio</span>
                                <span className="font-bold text-indigo-600">{capacityData.currentWeight}</span>
                            </li>
                            <li className="flex justify-between items-center p-3 border border-indigo-100 bg-indigo-50 rounded">
                                <span className="text-sm font-bold text-indigo-800">Peso Meta (Abate)</span>
                                <span className="font-bold text-indigo-800">{capacityData.projectedWeight}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* MARGIN & PROFITABILITY CALCULATOR (NEW) */}
            {activeReport === 'MARGIN' && (
                <div className="animate-fade-in space-y-8">
                    
                    {/* Calculator Controls */}
                    <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                        <div className="flex items-center mb-6">
                            <CalculatorIcon className="h-6 w-6 text-emerald-600 mr-2" />
                            <h3 className="text-xl font-bold text-slate-800">Simulador de Lucratividade em Tempo Real</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cenario de Mercado</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded-md font-semibold text-slate-700 bg-slate-50"
                                    value={simCommodity}
                                    onChange={(e) => setSimCommodity(e.target.value)}
                                >
                                    <option value="Boi Gordo">Boi Gordo (Arroba)</option>
                                    <option value="Soja">Soja (Saca)</option>
                                    <option value="Milho">Milho (Saca)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preco Venda (Hoje)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-500">R$</span>
                                    <input 
                                        type="number" 
                                        value={salePrice}
                                        onChange={e => setSalePrice(Number(e.target.value))}
                                        className="w-full pl-8 p-2 border border-slate-300 rounded-md font-bold text-emerald-600"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Producao (@/sc)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-500">R$</span>
                                    <input 
                                        type="number" 
                                        value={costPerUnit}
                                        onChange={e => setCostPerUnit(Number(e.target.value))}
                                        className="w-full pl-8 p-2 border border-slate-300 rounded-md font-semibold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Reposicao (Unit)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-500">R$</span>
                                    <input 
                                        type="number" 
                                        value={replacementCost}
                                        onChange={e => setReplacementCost(Number(e.target.value))}
                                        className="w-full pl-8 p-2 border border-slate-300 rounded-md text-slate-600"
                                        placeholder="Ex: Bezerro"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Results Highlight */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Margem Liquida / Unidade</p>
                                <p className={`text-2xl font-extrabold ${grossMarginPerHead > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(salePrice - costPerUnit)}
                                </p>
                                <p className={`text-xs font-bold ${marginPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {marginPercent.toFixed(1)}% de ROI
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Relacao de Troca</p>
                                <p className="text-2xl font-extrabold text-indigo-600">
                                    {exchangeRatio.toFixed(2)} x 1
                                </p>
                                <p className="text-xs text-indigo-400">
                                    Venda de 1 {simCommodity === 'Boi Gordo' ? 'Boi' : 'Safra'} compra {exchangeRatio.toFixed(2)} unidades de reposicao
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Lucro por Lote (100un)</p>
                                <p className="text-2xl font-extrabold text-slate-800">
                                    {formatCurrency((salePrice - costPerUnit) * saleWeight * 100)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Considerando peso de venda {saleWeight} @/sc
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sensitivity Analysis Table */}
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-bold text-slate-700">Analise de Sensibilidade (Preco de Venda)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-white">
                                    <tr>
                                        <th className="p-4">Cenario</th>
                                        <th className="p-4">Preco Venda</th>
                                        <th className="p-4">Resultado/Cab</th>
                                        <th className="p-4">ROI (%)</th>
                                        <th className="p-4">Poder de Compra (Reposicao)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scenarios.map((s, i) => (
                                        <tr key={i} className={`border-b last:border-b-0 ${s.label.includes('Base') ? 'bg-indigo-50/50 font-semibold' : ''}`}>
                                            <td className="p-4">{s.label}</td>
                                            <td className="p-4 text-slate-700">{formatCurrency(s.price)}</td>
                                            <td className={`p-4 font-bold ${s.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(s.margin)}
                                            </td>
                                            <td className="p-4">{s.roi.toFixed(1)}%</td>
                                            <td className="p-4 text-indigo-600 font-bold">{s.ratio.toFixed(2)}x</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
