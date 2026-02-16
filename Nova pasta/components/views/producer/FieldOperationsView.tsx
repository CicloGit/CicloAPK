import React, { useEffect, useMemo, useState } from 'react';
import { OperatorTask, OperatorRequest } from '../../../types';
import ClipboardListIcon from '../../icons/ClipboardListIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import XIcon from '../../icons/XIcon';
import MapIcon from '../../icons/MapIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import ShoppingCartIcon from '../../icons/ShoppingCartIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { operatorService } from '../../../services/operatorService';
import { fieldOperationsService, FieldDiaryEntry } from '../../../services/fieldOperationsService';
import { useToast } from '../../../contexts/ToastContext';
import { producerOpsService } from '../../../services/producerOpsService';

const FieldOperationsView: React.FC = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'VALIDATION' | 'REQUESTS' | 'DIARY'>('VALIDATION');
    const [tasks, setTasks] = useState<OperatorTask[]>([]);
    const [requests, setRequests] = useState<OperatorRequest[]>([]);
    const [diaryEntries, setDiaryEntries] = useState<FieldDiaryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadFieldOperations = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedTasks, loadedRequests, loadedDiary] = await Promise.all([
                    operatorService.listTasks(),
                    operatorService.listRequests(),
                    fieldOperationsService.listDiaryEntries(),
                ]);
                setTasks(loadedTasks);
                setRequests(loadedRequests);
                setDiaryEntries(loadedDiary);
            } catch {
                setLoadError('Nao foi possivel carregar o controle operacional.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadFieldOperations();
    }, []);

    const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'PENDING_REVIEW'), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'), [tasks]);

    const handleTaskAction = async (taskId: string, action: 'APPROVE' | 'REJECT') => {
        const status = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';
        const previousStatus = tasks.find((task) => task.id === taskId)?.status;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
        try {
            await operatorService.updateTaskStatus(taskId, status);
            await producerOpsService.createActivity({
                title: action === 'APPROVE' ? 'Tarefa operacional aprovada' : 'Tarefa operacional rejeitada',
                details: `Task ${taskId} -> ${status}`,
                actor: 'Administrador',
                actorRole: 'ADMINISTRADOR',
            });
            addToast({ type: 'success', title: 'Tarefa atualizada', message: 'Status salvo no Firebase.' });
        } catch {
            if (previousStatus) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: previousStatus } : t));
            }
            addToast({ type: 'error', title: 'Falha ao atualizar', message: 'Nao foi possivel salvar a tarefa.' });
        }
    };

    const handleRequestAction = async (reqId: string, action: 'APPROVE' | 'REJECT') => {
        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const previousStatus = requests.find((request) => request.id === reqId)?.status;
        setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status } : r));
        try {
            await operatorService.updateRequestStatus(reqId, status);
            if (action === 'APPROVE') {
                const approvedRequest = requests.find((request) => request.id === reqId);
                if (approvedRequest) {
                    await producerOpsService.registerRequestApprovalExpense({
                        requestId: approvedRequest.id,
                        item: approvedRequest.item,
                        quantity: approvedRequest.quantity,
                        actor: 'Administrador',
                        role: 'ADMINISTRADOR',
                    });
                }
            } else {
                await producerOpsService.createActivity({
                    title: 'Solicitacao operacional rejeitada',
                    details: `Request ${reqId}`,
                    actor: 'Administrador',
                    actorRole: 'ADMINISTRADOR',
                });
            }
            addToast({ type: 'success', title: 'Solicitacao atualizada', message: 'Status salvo no Firebase.' });
        } catch {
            if (previousStatus) {
                setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: previousStatus } : r));
            }
            addToast({ type: 'error', title: 'Falha ao atualizar', message: 'Nao foi possivel salvar a solicitacao.' });
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando operacoes..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <ClipboardListIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Controle Operacional e de Equipe
            </h2>
            <p className="text-slate-600 mb-8">
                Central de validacao de tarefas de campo, aprovacao de pedidos e acompanhamento do diario dos operadores.
            </p>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg mb-6 w-fit">
                <button 
                    onClick={() => setActiveTab('VALIDATION')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'VALIDATION' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Validacao de Tarefas
                    {pendingTasks.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTasks.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('REQUESTS')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'REQUESTS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <ShoppingCartIcon className="h-4 w-4 mr-2" />
                    Solicitacoes de Compra
                </button>
                <button 
                    onClick={() => setActiveTab('DIARY')}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'DIARY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Diario de Campo
                </button>
            </div>

            {/* VALIDATION TAB */}
            {activeTab === 'VALIDATION' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Pending Tasks Column */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                            Aguardando Validacao
                        </h3>
                        {pendingTasks.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                                Nenhuma tarefa pendente de revisao.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingTasks.map(task => (
                                    <div key={task.id} className="bg-white p-5 rounded-lg shadow-md border-l-4 border-amber-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                                                <p className="text-sm text-slate-500">Executado por: <span className="font-semibold">{task.executor}</span></p>
                                                <p className="text-xs text-slate-400">{task.timestamp}</p>
                                            </div>
                                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-bold uppercase">Revisar</span>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-100">
                                            <p className="text-sm text-slate-700 italic">"{task.details}"</p>
                                            <div className="flex items-center mt-2 text-xs text-slate-500 font-mono">
                                                <MapIcon className="h-3 w-3 mr-1" />
                                                GPS: {task.geolocation}
                                            </div>
                                        </div>

                                        {task.proofType === 'PHOTO' && (
                                            <div className="mb-4">
                                                <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                                                    [FOTO DA EXECUCAO]
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleTaskAction(task.id, 'APPROVE')}
                                                className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded hover:bg-emerald-600 transition-colors flex justify-center items-center"
                                            >
                                                <CheckCircleIcon className="h-5 w-5 mr-2" /> Aprovar Execucao
                                            </button>
                                            <button 
                                                onClick={() => handleTaskAction(task.id, 'REJECT')}
                                                className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 transition-colors flex justify-center items-center"
                                            >
                                                <XIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Completed History Column */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                            Historico Recente (Aprovados)
                        </h3>
                        <div className="space-y-3">
                            {completedTasks.map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                                    <div>
                                        <p className="font-bold text-slate-700">{task.title}</p>
                                        <p className="text-xs text-slate-500">{task.executor} • {task.timestamp}</p>
                                    </div>
                                    <span className="text-emerald-600">
                                        <CheckCircleIcon className="h-6 w-6" />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'REQUESTS' && (
                <div className="animate-fade-in bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Central de Aprovacao de Pedidos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs text-slate-700 uppercase">
                                <tr>
                                    <th className="p-4">Item Solicitado</th>
                                    <th className="p-4">Qtd</th>
                                    <th className="p-4">Solicitante</th>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Prioridade</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Acao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-800">{req.item}</td>
                                        <td className="p-4">{req.quantity}</td>
                                        <td className="p-4 text-slate-600">{req.requester}</td>
                                        <td className="p-4 text-slate-500">{req.date}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${req.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {req.priority}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                                req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleRequestAction(req.id, 'APPROVE')} className="text-green-600 hover:bg-green-50 p-1 rounded font-bold text-xs uppercase border border-green-200">Aprovar</button>
                                                    <button onClick={() => handleRequestAction(req.id, 'REJECT')} className="text-red-600 hover:bg-red-50 p-1 rounded font-bold text-xs uppercase border border-red-200">Negar</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DIARY TAB */}
            {activeTab === 'DIARY' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-blue-800">Transcricao Automatica de Audio</h4>
                        <p className="text-sm text-blue-700">
                            Os relatos gravados pelos operadores sao convertidos em texto automaticamente pela IA do sistema.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {diaryEntries.map((entry) => (
                            <div key={entry.id} className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                                <div className="flex items-center mb-3">
                                    <div className={`p-2 rounded-full mr-3 ${entry.type === 'AUDIO' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                                        {entry.type === 'AUDIO' ? (
                                            <MicrophoneIcon className="h-5 w-5 text-indigo-600" />
                                        ) : (
                                            <DocumentTextIcon className="h-5 w-5 text-emerald-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{entry.author} ({entry.role})</p>
                                        <p className="text-xs text-slate-500">{entry.date} • {entry.location}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded border border-slate-100">
                                    <p className="text-slate-700 italic">"{entry.transcript}"</p>
                                </div>
                                {entry.aiAction && (
                                    <div className="mt-3 flex gap-2">
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Acao IA: {entry.aiAction}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldOperationsView;
