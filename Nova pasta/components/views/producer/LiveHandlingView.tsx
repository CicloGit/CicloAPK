import React, { useEffect, useMemo, useState } from 'react';
import { AnimalProductionDetails, ProductionProject } from '../../../types';
import QrCodeIcon from '../../icons/QrCodeIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import { getSectorSettings } from '../../../config/sectorUtils';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { liveHandlingService, LiveHandlingEntry } from '../../../services/liveHandlingService';
import { producerDashboardService } from '../../../services/producerDashboardService';
import { useToast } from '../../../contexts/ToastContext';

interface ScannedEntity {
    id: string;
    category: string;
    status: string;
    lastValue: string;
}

const LiveHandlingView: React.FC = () => {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<ProductionProject[]>([]);
    const [animalDetailsMap, setAnimalDetailsMap] = useState<Record<string, AnimalProductionDetails>>({});
    const [history, setHistory] = useState<LiveHandlingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const activeProject = useMemo(
        () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
        [projects, selectedProjectId]
    );
    const sectorSettings = getSectorSettings(activeProject?.type);

    const [isConnectedScale, setIsConnectedScale] = useState(false);
    const [isConnectedReader, setIsConnectedReader] = useState(false);
    
    const [currentId, setCurrentId] = useState('');
    const [currentValue, setCurrentValue] = useState<string>('');
    const [scannedEntity, setScannedEntity] = useState<ScannedEntity | null>(null);

    useEffect(() => {
        const loadLiveHandling = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedProjects, loadedHistory, loadedAnimalDetails] = await Promise.all([
                    liveHandlingService.listProjects(),
                    liveHandlingService.listHistory(),
                    producerDashboardService.listAnimalDetails(),
                ]);
                setProjects(loadedProjects);
                setHistory(loadedHistory);
                setAnimalDetailsMap(loadedAnimalDetails);
                setSelectedProjectId(loadedProjects[0]?.id ?? '');
            } catch {
                setLoadError('Nao foi possivel carregar o manejo ao vivo.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadLiveHandling();
    }, []);

    useEffect(() => {
        setCurrentId('');
        setCurrentValue('');
    }, [activeProject?.id, activeProject?.type]);

    const visibleHistory = useMemo(
        () => history.filter((entry) => !activeProject || entry.projectId === activeProject.id),
        [history, activeProject]
    );

    const handleScan = () => {
        const baseId = currentId || 'ID-DETECTADO-001';
        setScannedEntity({
            id: baseId,
            category: 'Lote A',
            status: 'Em Producao',
            lastValue: '---'
        });
        setCurrentId(baseId);
        
        if (isConnectedScale) {
            const hash = baseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const unit = sectorSettings.liveHandling.primaryUnit;
            const computedVal = unit === 'kg'
                ? (300 + (hash % 50) + 0.25).toFixed(2)
                : unit === 'pH'
                ? (6.5 + (hash % 10) / 10).toFixed(1)
                : (10 + (hash % 5) + 0.1).toFixed(1);
            setCurrentValue(computedVal);
        }
    };

    const handleAction = async (action: string) => {
        if (!activeProject || !currentId || !currentValue) return;

        try {
            const newEntry: LiveHandlingEntry = await liveHandlingService.createEntry({
                projectId: activeProject.id,
                entityId: currentId,
                value: `${currentValue} ${sectorSettings.liveHandling.primaryUnit}`,
                action,
            });
            setHistory((prev) => [newEntry, ...prev]);
            setCurrentId('');
            setCurrentValue('');
            setScannedEntity(null);
            addToast({ type: 'success', title: 'Registro salvo', message: 'Manejo ao vivo persistido no banco.' });
        } catch {
            addToast({ type: 'error', title: 'Falha ao salvar', message: 'Nao foi possivel persistir o manejo ao vivo.' });
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando manejo ao vivo..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto min-h-screen pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center">
                        <QrCodeIcon className="h-8 w-8 mr-3 text-indigo-600" />
                        {sectorSettings.labels.liveHandling}
                    </h2>
                    <p className="text-slate-600">Entrada de dados operacionais em tempo real.</p>
                    <div className="mt-3">
                        <select
                            value={activeProject?.id ?? ''}
                            onChange={(event) => setSelectedProjectId(event.target.value)}
                            className="w-full md:w-80 p-2 border border-slate-300 rounded-md bg-white text-sm font-semibold text-slate-700"
                        >
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name} ({project.type})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex space-x-3 mt-4 md:mt-0">
                    <button 
                        onClick={() => setIsConnectedReader(!isConnectedReader)}
                        className={`flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isConnectedReader ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}
                    >
                        <span className={`w-2 h-2 rounded-full mr-2 ${isConnectedReader ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`}></span>
                        Leitor ID {isConnectedReader ? 'Conectado' : 'Desconectado'}
                    </button>
                    <button 
                        onClick={() => setIsConnectedScale(!isConnectedScale)}
                        className={`flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isConnectedScale ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}
                    >
                        <span className={`w-2 h-2 rounded-full mr-2 ${isConnectedScale ? 'bg-green-600 animate-pulse' : 'bg-slate-400'}`}></span>
                        Sensor / Balanca {isConnectedScale ? 'Conectado' : 'Desconectado'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-500 overflow-hidden">
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">{sectorSettings.labels.unit} em Processamento</h3>
                            <span className="text-xs bg-indigo-800 px-2 py-1 rounded">{sectorSettings.labels.group}: Ativo</span>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identificacao ({sectorSettings.labels.unit})</label>
                                    <div className="flex">
                                        <input 
                                            type="text" 
                                            value={currentId}
                                            onChange={(e) => setCurrentId(e.target.value)}
                                            placeholder="Digitar ou Ler Codigo..." 
                                            className="flex-1 text-2xl font-mono font-bold text-slate-800 p-3 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button 
                                            onClick={handleScan}
                                            className="bg-indigo-600 text-white px-4 rounded-r-lg hover:bg-indigo-700"
                                        >
                                            <QrCodeIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                    {scannedEntity && (
                                        <div className="mt-2 text-sm text-slate-600">
                                            <span className="bg-slate-100 px-2 py-1 rounded font-semibold mr-2">{scannedEntity.category}</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded font-semibold">{scannedEntity.status}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{sectorSettings.liveHandling.primaryInput} ({sectorSettings.liveHandling.primaryUnit})</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={currentValue}
                                            onChange={(e) => setCurrentValue(e.target.value)}
                                            placeholder="0.00" 
                                            className="w-full text-4xl font-extrabold text-slate-800 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-right pr-16"
                                        />
                                        <span className="absolute right-4 top-4 text-slate-400 font-bold">{sectorSettings.liveHandling.primaryUnit}</span>
                                        {!isConnectedScale && (
                                            <button 
                                                onClick={() => {setIsConnectedScale(true); setCurrentValue('10');}}
                                                className="absolute top-12 right-0 text-xs text-indigo-600 hover:underline"
                                            >
                                                Simular Sensor
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {scannedEntity && (
                                <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="text-center border-r border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase">Leitura Anterior</p>
                                        <p className="font-bold text-slate-700">{scannedEntity.lastValue}</p>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase">Variacao</p>
                                        <p className="font-bold text-green-600">+0.00</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500 uppercase">Status</p>
                                        <p className="font-bold text-indigo-600">Normal</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {sectorSettings.liveHandling.actions.map((action, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleAction(action)}
                                        disabled={!currentId || !activeProject}
                                        className={`p-4 text-white rounded-lg font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                            ${idx === 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 
                                              idx === 1 ? 'bg-blue-500 hover:bg-blue-600' :
                                              idx === 2 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
                                            }`}
                                    >
                                        <CheckCircleIcon className="h-6 w-6 mx-auto mb-1 opacity-80" />
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 h-fit">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Historico da Sessao</h3>
                    {visibleHistory.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-10">Nenhum registro processado ainda.</p>
                    ) : (
                        <div className="overflow-y-auto max-h-[500px]">
                            <ul className="space-y-3">
                                {visibleHistory.map((entry, idx) => (
                                    <li key={idx} className="p-3 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <span className="font-mono font-bold text-slate-800">{entry.entityId}</span>
                                            <p className="text-xs text-slate-500">{entry.action}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-emerald-600">{entry.value}</span>
                                            <p className="text-[10px] text-slate-400">{entry.time}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {visibleHistory.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Itens: {visibleHistory.length}</span>
                            </div>
                            <button className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-semibold">
                                Encerrar {sectorSettings.labels.group}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveHandlingView;
