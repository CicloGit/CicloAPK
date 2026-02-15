import React, { useEffect, useMemo, useState } from 'react';
import { ManagementAlert, ManagementRecord, ProductionProject, InventoryItem } from '../../../types';
import ExclamationIcon from '../../icons/ExclamationIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import BeakerIcon from '../../icons/BeakerIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import { TagIcon } from '../../icons/TagIcon';
import { getSectorSettings } from '../../../config/sectorUtils';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { managementService } from '../../../services/managementService';
import { propertyService } from '../../../services/propertyService';
import { stockService } from '../../../services/stockService';
import { useToast } from '../../../contexts/ToastContext';

const CompactAlertItem: React.FC<{ alert: ManagementAlert, onResolve: () => void }> = ({ alert, onResolve }) => {
    const severityColors: Record<ManagementAlert['severity'], string> = {
        'CRITICAL': 'border-red-500 bg-red-50 text-red-700',
        'WARNING': 'border-yellow-500 bg-yellow-50 text-yellow-800',
        'INFO': 'border-blue-500 bg-blue-50 text-blue-700',
    };

    return (
        <div className={`flex items-center justify-between p-3 mb-2 rounded-md border-l-4 shadow-sm bg-white ${severityColors[alert.severity]} transition-all hover:shadow-md`}>
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase opacity-80">{alert.type === 'Nutrition' ? 'Nutricao' : alert.type === 'Health' ? 'Sanidade' : 'Agricultura'} - {alert.dueDate}</span>
                <span className="font-bold text-sm md:text-base">{alert.message}</span>
                <span className="text-xs mt-0.5">Local: {alert.target}</span>
            </div>
            <button 
                onClick={onResolve}
                className="ml-4 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded shadow-sm hover:bg-slate-100 hover:text-emerald-600 active:scale-95 transition-all"
            >
                Resolver
            </button>
        </div>
    );
};

const ManagementView: React.FC = () => {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<ProductionProject[]>([]);
    const [history, setHistory] = useState<ManagementRecord[]>([]);
    const [alerts, setAlerts] = useState<ManagementAlert[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const activeProject = projects[0];
    const sectorSettings = getSectorSettings(activeProject?.type);

    const [activeTab, setActiveTab] = useState<string>(sectorSettings.managementTabs[0]);

    useEffect(() => {
        const loadManagement = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [workspace, loadedHistory, loadedAlerts, loadedInventory] = await Promise.all([
                    propertyService.loadWorkspace(),
                    managementService.listHistory(),
                    managementService.listAlerts(),
                    stockService.listInventory(),
                ]);
                setProjects(workspace.activities);
                setHistory(loadedHistory);
                setAlerts(loadedAlerts);
                setInventory(loadedInventory);
            } catch {
                setLoadError('Nao foi possivel carregar o modulo de manejo.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadManagement();
    }, []);

    useEffect(() => {
        if (sectorSettings.managementTabs.length > 0) {
            setActiveTab(sectorSettings.managementTabs[0]);
        }
    }, [activeProject?.type, sectorSettings.managementTabs]);

    const [form, setForm] = useState({
        target: '',
        product: '',
        quantity: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleResolveAlert = (alert: ManagementAlert) => {
        let type = sectorSettings.managementTabs[0];
        if (alert.type === 'Health' && sectorSettings.managementTabs.includes('Sanidade')) type = 'Sanidade';
        if (alert.type === 'Nutrition' && sectorSettings.managementTabs.includes('Nutricao')) type = 'Nutricao';
        
        setActiveTab(type);
        
        setForm({
            target: alert.target,
            product: '', 
            quantity: ''
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.target || !form.product || !form.quantity) return;

        try {
            const newRecord = await managementService.createHistoryRecord({
                target: form.target,
                actionType: activeTab,
                product: form.product,
                quantity: form.quantity,
                executor: "Eu",
            });
            const relatedAlert = alerts.find((alert) => alert.target === form.target);
            if (relatedAlert) {
                await managementService.resolveAlert(relatedAlert.id);
                setAlerts((prev) => prev.filter((alert) => alert.id !== relatedAlert.id));
            }
            setHistory((prev) => [newRecord, ...prev]);
            setForm({ target: "", product: "", quantity: "" });
            addToast({ type: "success", title: "Manejo registrado", message: "A operacao foi salva com sucesso." });
        } catch {
            addToast({ type: "error", title: "Falha ao salvar", message: "Nao foi possivel persistir o registro de manejo." });
        }
    };

    const filteredProducts = inventory;
    const recentHistory = useMemo(() => history.slice(0, 5), [history]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando manejo..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-3xl mx-auto pb-20">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <BeakerIcon className="h-6 w-6 mr-2 text-emerald-600" />
                        {sectorSettings.labels.management}
                    </h2>
                    <p className="text-sm text-slate-500">Registro de operacoes para {activeProject?.type || 'Atividade'}</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1 flex items-center">
                    <ExclamationIcon className="h-4 w-4 mr-1" /> Tarefas Pendentes ({alerts.length})
                </h3>
                <div className="space-y-1">
                    {alerts.map(alert => (
                        <CompactAlertItem key={alert.id} alert={alert} onResolve={() => handleResolveAlert(alert)} />
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
                <div className="flex border-b border-slate-100 overflow-x-auto">
                    {sectorSettings.managementTabs.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 min-w-[100px] py-4 text-sm font-bold text-center transition-colors whitespace-nowrap px-2 ${
                                activeTab === tab 
                                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                                Selecionar {sectorSettings.labels.group} / {sectorSettings.labels.unit}
                            </label>
                            <div className="relative">
                                <TagIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <select 
                                    name="target" 
                                    value={form.target} 
                                    onChange={handleInputChange} 
                                    className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none"
                                >
                                    <option value="">Selecione...</option>
                                    <optgroup label="Projetos">
                                        {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Produto / Insumo</label>
                            <div className="relative">
                                <CubeIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <select 
                                    name="product" 
                                    value={form.product} 
                                    onChange={handleInputChange} 
                                    className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none"
                                >
                                    <option value="">Selecione do estoque...</option>
                                    {filteredProducts.map(item => (
                                        <option key={item.id} value={item.name}>
                                            {item.name} ({item.quantity} {item.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Quantidade / Dosagem</label>
                        <input 
                            type="text" 
                            name="quantity" 
                            value={form.quantity} 
                            onChange={handleInputChange} 
                            placeholder="Ex: 50 kg, 3 doses, 20L, 2 horas" 
                            className="w-full p-3 border border-slate-200 rounded-lg text-lg font-semibold text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <button 
                        id="submit-btn"
                        type="submit" 
                        className="w-full py-4 bg-slate-800 text-white font-bold text-lg rounded-lg shadow-md hover:bg-slate-700 active:scale-[0.99] transition-all flex justify-center items-center mt-2"
                    >
                        <PlusCircleIcon className="h-6 w-6 mr-2" />
                        Registrar {activeTab}
                    </button>
                </form>
            </div>

            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-1">Ultimos Registros</h3>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                        {recentHistory.map((record) => (
                            <li key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-3 ${
                                        record.actionType === 'Alimentacao' ? 'bg-emerald-500' : 
                                        record.actionType === 'Vacinacao' || record.actionType === 'Sanidade' ? 'bg-blue-500' : 'bg-amber-500'
                                    }`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{record.actionType} <span className="font-normal text-slate-500">em</span> {record.target}</p>
                                        <p className="text-xs text-slate-500">{record.product} - {record.quantity}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">{record.date}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="p-2 text-center border-t border-slate-100">
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">Ver Historico Completo</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagementView;
