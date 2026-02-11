import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '../../icons/HomeIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import ShoppingCartIcon from '../../icons/ShoppingCartIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import { LogoutIcon } from '../../icons/LogoutIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import { CubeIcon } from '../../icons/CubeIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import { useApp } from '../../../contexts/AppContext';
import { OperatorTask } from '../../../types';
import { operatorService } from '../../../services/operatorService';

const MobileAppView: React.FC = () => {
    const { addToast } = useToast();
    const { logout } = useApp();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'HOME' | 'TASKS' | 'CAPTURE' | 'MARKET' | 'PROFILE'>('HOME');
    const [tasks, setTasks] = useState<OperatorTask[]>([]);
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await operatorService.listTasks();
                setTasks(data);
            } catch {
                setLoadError('Nao foi possivel carregar as tarefas no app mobile.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadTasks();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCaptureAction = (type: 'PHOTO' | 'AUDIO' | 'NOTE') => {
        setShowCaptureModal(false);
        const typeLabel = type === 'PHOTO' ? 'Camera' : type === 'AUDIO' ? 'Gravador' : 'Teclado';
        addToast({ type: 'success', title: 'Captura Iniciada', message: `${typeLabel} aberto. Dados sincronizando...` });
    };

    const completeTask = async (taskId: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t));
        try {
            await operatorService.updateTaskStatus(taskId, 'COMPLETED');
            addToast({ type: 'success', title: 'Tarefa Concluida', message: 'Registro salvo no historico.' });
        } catch {
            addToast({ type: 'error', title: 'Falha', message: 'Nao foi possivel salvar a conclusao.' });
        }
    };

    const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED');

    if (isLoading) {
        return <LoadingSpinner text="Carregando app mobile..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative shadow-2xl overflow-hidden border-x border-slate-200">
            {/* --- TOP BAR --- */}
            <header className="bg-white p-4 pt-6 pb-2 sticky top-0 z-10 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold mr-3 shadow-md">
                        MS
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 leading-tight">Ola, Marcos</h1>
                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">
                            ● Online • Fazenda Boa Esperanca
                        </p>
                    </div>
                </div>
                <div className="bg-slate-100 p-2 rounded-full relative">
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
            </header>

            {/* --- SCROLLABLE CONTENT --- */}
            <main className="flex-1 overflow-y-auto pb-24 p-4 space-y-6">
                {activeTab === 'HOME' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
                                <p className="text-xs opacity-75 uppercase font-bold">Tarefas Hoje</p>
                                <p className="text-3xl font-bold mt-1">{pendingTasks.length}</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                <p className="text-xs text-slate-500 uppercase font-bold">Clima Local</p>
                                <div className="flex items-center mt-1"><span className="text-2xl mr-2">⛅</span><span className="text-2xl font-bold text-slate-800">28°</span></div>
                            </div>
                        </div>
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
                            <h3 className="font-bold text-red-800 text-sm flex items-center"><LockClosedIcon className="h-4 w-4 mr-2" /> Auditoria Pendente</h3>
                            <p className="text-xs text-red-700 mt-1">Confirmacao de NF-123 necessaria para desbloqueio de estoque.</p>
                            <button className="mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg w-full">Validar</button>
                        </div>
                    </div>
                )}

                {activeTab === 'TASKS' && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">Minhas Tarefas</h2>
                        {pendingTasks.map(task => (
                            <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
                                <h3 className="font-bold text-slate-800">{task.title}</h3>
                                <p className="text-xs text-slate-500 mb-4">{task.details}</p>
                                <button onClick={() => completeTask(task.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold">Concluir</button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* --- BOTTOM NAVIGATION --- */}
            <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center absolute bottom-0 w-full z-20 pb-safe">
                <button onClick={() => setActiveTab('HOME')} className={`flex flex-col items-center w-12 ${activeTab === 'HOME' ? 'text-emerald-600' : 'text-slate-400'}`}><HomeIcon className="h-6 w-6" /><span className="text-[9px] font-bold mt-1">Inicio</span></button>
                <button onClick={() => setActiveTab('TASKS')} className={`flex flex-col items-center w-12 ${activeTab === 'TASKS' ? 'text-emerald-600' : 'text-slate-400'}`}><div className="relative"><CheckCircleIcon className="h-6 w-6" />{pendingTasks.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}</div><span className="text-[9px] font-bold mt-1">Tarefas</span></button>
                <div className="relative -top-5"><button onClick={() => setShowCaptureModal(!showCaptureModal)} className="w-14 h-14 bg-emerald-500 rounded-full text-white flex items-center justify-center border-4 border-slate-50"><PlusCircleIcon className="h-8 w-8" /></button></div>
                <button onClick={() => setActiveTab('MARKET')} className={`flex flex-col items-center w-12 ${activeTab === 'MARKET' ? 'text-emerald-600' : 'text-slate-400'}`}><ShoppingCartIcon className="h-6 w-6" /><span className="text-[9px] font-bold mt-1">Loja</span></button>
                <button onClick={handleLogout} className="flex flex-col items-center w-12 text-slate-400"><LogoutIcon className="h-6 w-6" /><span className="text-[9px] font-bold mt-1">Sair</span></button>
            </nav>

            {showCaptureModal && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col justify-end pb-24" onClick={() => setShowCaptureModal(false)}>
                    <div className="px-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white rounded-2xl p-4 grid grid-cols-3 gap-4">
                            <button onClick={() => handleCaptureAction('PHOTO')} className="flex flex-col items-center gap-2 py-2"><div className="bg-blue-100 p-3 rounded-full text-blue-600"><CubeIcon className="h-6 w-6"/></div><span className="text-xs font-bold">Foto/Prova</span></button>
                            <button onClick={() => handleCaptureAction('AUDIO')} className="flex flex-col items-center gap-2 py-2"><div className="bg-red-100 p-3 rounded-full text-red-600"><MicrophoneIcon className="h-6 w-6"/></div><span className="text-xs font-bold">Audio</span></button>
                            <button onClick={() => handleCaptureAction('NOTE')} className="flex flex-col items-center gap-2 py-2"><div className="bg-amber-100 p-3 rounded-full text-amber-600"><DocumentTextIcon className="h-6 w-6"/></div><span className="text-xs font-bold">Nota</span></button>
                        </div>
                        <button className="w-full bg-white text-red-500 font-bold py-4 rounded-xl">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileAppView;
