import React, { useEffect, useMemo, useState } from 'react';
import ChartBarIcon from '../../icons/ChartBarIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import TrendingUpIcon from '../../icons/TrendingUpIcon';
import { CashIcon } from '../../icons/CashIcon';
import CalculatorIcon from '../../icons/CalculatorIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { MarketTrend, Property } from '../../../types';
import { reportsService, ConsumptionReportRow, CapacityReport } from '../../../services/reportsService';
import { producerOpsService } from '../../../services/producerOpsService';
import { propertyService } from '../../../services/propertyService';
import { useToast } from '../../../contexts/ToastContext';

const ReportsView: React.FC = () => {
    const { addToast } = useToast();
    const [activeReport, setActiveReport] = useState<'CONSUMPTION' | 'CAPACITY' | 'MARGIN' | 'REGISTRY'>('CONSUMPTION');
    const [selectedBatch, setSelectedBatch] = useState('Lote A - Recria');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    const [consumptionData, setConsumptionData] = useState<ConsumptionReportRow[]>([]);
    const [capacityData, setCapacityData] = useState<CapacityReport | null>(null);
    const [registryKpis, setRegistryKpis] = useState<{ totalAnimals: number; totalExpenses: number; costPerHead: number }>({
        totalAnimals: 0,
        totalExpenses: 0,
        costPerHead: 0,
    });

    const [propertyData, setPropertyData] = useState<Property | null>(null);
    const [lots, setLots] = useState<Array<{ id: string; name: string; category: string; headcount: number; averageWeightKg: number }>>([]);
    const [inputs, setInputs] = useState<Array<{ id: string; name: string; unit: string; unitCost: number; stock: number }>>([]);
    const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; category: string; date: string }>>([]);

    const [newLot, setNewLot] = useState({ name: '', category: '', headcount: '', averageWeightKg: '' });
    const [newInput, setNewInput] = useState({ name: '', unit: 'kg', unitCost: '', stock: '' });
    const [newExpense, setNewExpense] = useState({ description: '', category: 'OPERACIONAL', amount: '' });

    const [simCommodity, setSimCommodity] = useState('Boi Gordo');
    const [salePrice, setSalePrice] = useState<number>(0);
    const [costPerUnit, setCostPerUnit] = useState<number>(180.00);
    const [replacementCost, setReplacementCost] = useState<number>(2500.00);
    const [saleWeight, setSaleWeight] = useState<number>(20);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const loadAll = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const [loadedTrends, loadedConsumption, loadedCapacity, kpis, workspace, loadedLots, loadedInputs, loadedExpenses] = await Promise.all([
                reportsService.listMarketTrends(),
                reportsService.listConsumptionRows(),
                reportsService.getCapacityReport(),
                producerOpsService.getKpis(),
                propertyService.loadWorkspace(),
                producerOpsService.listAnimalLots(),
                producerOpsService.listInputs(),
                producerOpsService.listExpenses(),
            ]);
            setMarketTrends(loadedTrends);
            setConsumptionData(loadedConsumption);
            setCapacityData(loadedCapacity);
            setRegistryKpis(kpis);
            setPropertyData(workspace.property);
            setLots(loadedLots);
            setInputs(loadedInputs);
            setExpenses(loadedExpenses);
        } catch {
            setLoadError('Nao foi possivel carregar os relatorios.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadAll();
    }, []);

    const refreshRegistryData = async () => {
        const [kpis, loadedLots, loadedInputs, loadedExpenses] = await Promise.all([
            producerOpsService.getKpis(),
            producerOpsService.listAnimalLots(),
            producerOpsService.listInputs(),
            producerOpsService.listExpenses(),
        ]);
        setRegistryKpis(kpis);
        setLots(loadedLots);
        setInputs(loadedInputs);
        setExpenses(loadedExpenses);
    };

    const handleSaveProperty = async () => {
        if (!propertyData) return;
        const result = await propertyService.updateProperty(propertyData);
        if (!result.success) {
            addToast({ type: 'error', title: 'Falha ao salvar', message: result.error || 'Nao foi possivel atualizar a propriedade.' });
            return;
        }
        addToast({ type: 'success', title: 'Propriedade atualizada', message: 'Cadastro salvo no Firebase.' });
    };

    const handleCreateLot = async () => {
        if (!newLot.name || !newLot.category || !newLot.headcount || !newLot.averageWeightKg) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados do lote.' });
            return;
        }
        await producerOpsService.createAnimalLot({
            name: newLot.name,
            category: newLot.category,
            headcount: Number(newLot.headcount),
            averageWeightKg: Number(newLot.averageWeightKg),
        });
        setNewLot({ name: '', category: '', headcount: '', averageWeightKg: '' });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Lote cadastrado', message: 'Lote salvo com sucesso.' });
    };

    const handleCreateInput = async () => {
        if (!newInput.name || !newInput.unitCost || !newInput.stock) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados do insumo.' });
            return;
        }
        await producerOpsService.createInput({
            name: newInput.name,
            unit: newInput.unit,
            unitCost: Number(newInput.unitCost),
            stock: Number(newInput.stock),
        });
        setNewInput({ name: '', unit: 'kg', unitCost: '', stock: '' });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Insumo cadastrado', message: 'Insumo salvo com sucesso.' });
    };

    const handleCreateExpense = async () => {
        if (!newExpense.description || !newExpense.amount) {
            addToast({ type: 'warning', title: 'Dados incompletos', message: 'Preencha os dados da despesa.' });
            return;
        }
        await producerOpsService.createExpense({
            description: newExpense.description,
            category: newExpense.category as 'OPERACIONAL' | 'INSUMO' | 'MANUTENCAO' | 'PESSOAL' | 'OUTROS',
            amount: Number(newExpense.amount),
            source: 'ADMINISTRADOR',
        });
        setNewExpense({ description: '', category: 'OPERACIONAL', amount: '' });
        await refreshRegistryData();
        addToast({ type: 'success', title: 'Despesa lancada', message: 'Despesa registrada no operacional.' });
    };

    const marketPriceBoi = useMemo(() => marketTrends.find(t => t.commodity === 'Boi Gordo')?.price || 295.00, [marketTrends]);

    useEffect(() => {
        if (salePrice === 0) {
            setSalePrice(marketPriceBoi);
        }
    }, [marketPriceBoi, salePrice]);

    const revenuePerHead = salePrice * saleWeight;
    const totalCostPerHead = costPerUnit * saleWeight;
    const grossMarginPerHead = revenuePerHead - totalCostPerHead;
    const marginPercent = totalCostPerHead > 0 ? (grossMarginPerHead / totalCostPerHead) * 100 : 0;
    const exchangeRatio = replacementCost > 0 ? (revenuePerHead / replacementCost) : 0;

    const scenarios = useMemo(() => {
        const variations = [-0.1, 0, 0.1];
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
            <p className="text-slate-600 mb-8">Analise detalhada baseada nos lancamentos operacionais de campo.</p>

            <div className="flex flex-wrap gap-2 bg-slate-200 p-1 rounded-lg mb-8 w-fit">
                <button onClick={() => setActiveReport('CONSUMPTION')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CONSUMPTION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><CubeIcon className="h-4 w-4 mr-2" />Consumo</button>
                <button onClick={() => setActiveReport('CAPACITY')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'CAPACITY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><TrendingUpIcon className="h-4 w-4 mr-2" />Capacidade</button>
                <button onClick={() => setActiveReport('MARGIN')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'MARGIN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}><CashIcon className="h-4 w-4 mr-2" />Margem & Lucro</button>
                <button onClick={() => setActiveReport('REGISTRY')} className={`flex items-center px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors ${activeReport === 'REGISTRY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}>Cadastros</button>
            </div>

            {activeReport === 'CONSUMPTION' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Relatorio de Consumo por Lote</h3>
                            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="p-2 border border-slate-300 rounded-md bg-slate-50 text-sm font-semibold text-slate-700">
                                {lots.map((lot) => <option key={lot.id}>{lot.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <p className="text-xs font-bold text-indigo-800 uppercase">Total Animais no Lote</p>
                                <p className="text-2xl font-bold text-indigo-900">{registryKpis.totalAnimals} <span className="text-sm font-normal">cabecas</span></p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-800 uppercase">Custo Medio Total / Cabeca</p>
                                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(registryKpis.costPerHead)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-600 uppercase">Despesas Operacionais</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(registryKpis.totalExpenses)}</p>
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
                    </div>
                </div>
            )}

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
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(capacityData.daysElapsed / capacityData.totalDays) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Capacidade & Evolucao</h3>
                        <ul className="space-y-4">
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">Animais Entrados</span><span className="font-bold text-slate-800">{capacityData.animalsIn}</span></li>
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">Mortalidade / Perda</span><span className="font-bold text-red-600">{capacityData.mortality} ({((capacityData.mortality / capacityData.animalsIn) * 100).toFixed(1)}%)</span></li>
                            <li className="flex justify-between items-center p-3 bg-slate-50 rounded"><span className="text-sm font-semibold text-slate-600">Peso Atual Medio</span><span className="font-bold text-indigo-600">{capacityData.currentWeight}</span></li>
                            <li className="flex justify-between items-center p-3 border border-indigo-100 bg-indigo-50 rounded"><span className="text-sm font-bold text-indigo-800">Peso Meta (Abate)</span><span className="font-bold text-indigo-800">{capacityData.projectedWeight}</span></li>
                        </ul>
                    </div>
                </div>
            )}

            {activeReport === 'MARGIN' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                        <div className="flex items-center mb-6"><CalculatorIcon className="h-6 w-6 text-emerald-600 mr-2" /><h3 className="text-xl font-bold text-slate-800">Simulador de Lucratividade em Tempo Real</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cenario de Mercado</label><select value={simCommodity} onChange={(e) => setSimCommodity(e.target.value)} className="w-full p-3 border border-slate-300 rounded-md"><option>Boi Gordo</option></select></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preco Venda (@)</label><input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo por @</label><input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso Venda (@)</label><input type="number" value={saleWeight} onChange={(e) => setSaleWeight(Number(e.target.value || 0))} className="w-full p-3 border border-slate-300 rounded-md" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-emerald-50 rounded-lg"><p className="text-xs uppercase text-emerald-700 font-bold">Margem Bruta / Cabeca</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(grossMarginPerHead)}</p></div>
                            <div className="p-4 bg-indigo-50 rounded-lg"><p className="text-xs uppercase text-indigo-700 font-bold">Margem (%)</p><p className="text-2xl font-bold text-indigo-700">{marginPercent.toFixed(1)}%</p></div>
                            <div className="p-4 bg-amber-50 rounded-lg"><p className="text-xs uppercase text-amber-700 font-bold">Relacao de Troca</p><p className="text-2xl font-bold text-amber-700">{exchangeRatio.toFixed(2)}</p></div>
                        </div>
                        <div className="mt-6"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo reposicao</label><input type="number" value={replacementCost} onChange={(e) => setReplacementCost(Number(e.target.value || 0))} className="w-full md:w-64 p-3 border border-slate-300 rounded-md" /></div>
                        <div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Cenario</th><th className="p-3 text-left">Preco</th><th className="p-3 text-left">Margem</th><th className="p-3 text-left">ROI</th><th className="p-3 text-left">Relacao</th></tr></thead><tbody>{scenarios.map((scenario) => (<tr key={scenario.label} className="border-b"><td className="p-3 font-semibold">{scenario.label}</td><td className="p-3">{formatCurrency(scenario.price)}</td><td className="p-3">{formatCurrency(scenario.margin)}</td><td className="p-3">{scenario.roi.toFixed(1)}%</td><td className="p-3">{scenario.ratio.toFixed(2)}</td></tr>))}</tbody></table></div>
                    </div>
                </div>
            )}

            {activeReport === 'REGISTRY' && (
                <div className="animate-fade-in space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">Bovinos Cadastrados</p><p className="text-2xl font-bold text-slate-800">{registryKpis.totalAnimals}</p></div>
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">Despesas Operacionais</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(registryKpis.totalExpenses)}</p></div>
                        <div className="bg-white p-4 rounded-lg border"><p className="text-xs uppercase text-slate-500 font-bold">Custo por Cabeca</p><p className="text-2xl font-bold text-slate-800">{formatCurrency(registryKpis.costPerHead)}</p></div>
                    </div>

                    {propertyData && (
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Cadastro da Propriedade</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input value={propertyData.name} onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })} className="p-2 border rounded" placeholder="Nome" />
                                <input value={propertyData.carNumber} onChange={(e) => setPropertyData({ ...propertyData, carNumber: e.target.value })} className="p-2 border rounded" placeholder="CAR" />
                                <input type="number" value={propertyData.totalArea} onChange={(e) => setPropertyData({ ...propertyData, totalArea: Number(e.target.value || 0) })} className="p-2 border rounded" placeholder="Area" />
                                <input type="number" value={propertyData.animalCount} onChange={(e) => setPropertyData({ ...propertyData, animalCount: Number(e.target.value || 0) })} className="p-2 border rounded" placeholder="Animais" />
                            </div>
                            <button onClick={() => void handleSaveProperty()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold">Salvar propriedade</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Cadastro de Lotes de Animais</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={newLot.name} onChange={(e) => setNewLot({ ...newLot, name: e.target.value })} className="p-2 border rounded" placeholder="Nome do lote" />
                                <input value={newLot.category} onChange={(e) => setNewLot({ ...newLot, category: e.target.value })} className="p-2 border rounded" placeholder="Categoria" />
                                <input type="number" value={newLot.headcount} onChange={(e) => setNewLot({ ...newLot, headcount: e.target.value })} className="p-2 border rounded" placeholder="Qtd bovinos" />
                                <input type="number" value={newLot.averageWeightKg} onChange={(e) => setNewLot({ ...newLot, averageWeightKg: e.target.value })} className="p-2 border rounded" placeholder="Peso medio (kg)" />
                            </div>
                            <button onClick={() => void handleCreateLot()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Cadastrar lote</button>
                            <div className="border-t pt-3 space-y-2">{lots.map((lot) => <div key={lot.id} className="text-sm flex justify-between"><span>{lot.name} ({lot.category})</span><span className="font-semibold">{lot.headcount} cabecas</span></div>)}</div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Cadastro de Insumos</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={newInput.name} onChange={(e) => setNewInput({ ...newInput, name: e.target.value })} className="p-2 border rounded" placeholder="Nome do insumo" />
                                <input value={newInput.unit} onChange={(e) => setNewInput({ ...newInput, unit: e.target.value })} className="p-2 border rounded" placeholder="Unidade" />
                                <input type="number" value={newInput.unitCost} onChange={(e) => setNewInput({ ...newInput, unitCost: e.target.value })} className="p-2 border rounded" placeholder="Custo unitario" />
                                <input type="number" value={newInput.stock} onChange={(e) => setNewInput({ ...newInput, stock: e.target.value })} className="p-2 border rounded" placeholder="Estoque" />
                            </div>
                            <button onClick={() => void handleCreateInput()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Cadastrar insumo</button>
                            <div className="border-t pt-3 space-y-2">{inputs.map((input) => <div key={input.id} className="text-sm flex justify-between"><span>{input.name}</span><span className="font-semibold">{input.stock} {input.unit}</span></div>)}</div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">Cadastro de Despesas Operacionais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="p-2 border rounded" placeholder="Descricao" />
                            <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="p-2 border rounded">
                                <option value="OPERACIONAL">Operacional</option>
                                <option value="INSUMO">Insumo</option>
                                <option value="MANUTENCAO">Manutencao</option>
                                <option value="PESSOAL">Pessoal</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                            <input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="p-2 border rounded" placeholder="Valor (R$)" />
                        </div>
                        <button onClick={() => void handleCreateExpense()} className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold">Lancar despesa</button>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-100"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Descricao</th><th className="p-2 text-left">Categoria</th><th className="p-2 text-right">Valor</th></tr></thead>
                                <tbody>{expenses.map((expense) => (<tr key={expense.id} className="border-b"><td className="p-2">{expense.date}</td><td className="p-2">{expense.description}</td><td className="p-2">{expense.category}</td><td className="p-2 text-right font-semibold">{formatCurrency(expense.amount)}</td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
