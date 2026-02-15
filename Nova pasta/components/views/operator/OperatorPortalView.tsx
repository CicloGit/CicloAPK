import React, { useEffect, useMemo, useState } from 'react';
import { OperatorTask, OperatorRequest, BankAccount, Transaction } from '../../../types';
import QrCodeIcon from '../../icons/QrCodeIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import ShoppingCartIcon from '../../icons/ShoppingCartIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import { CashIcon } from '../../icons/CashIcon';
import DigitalAccountView from '../../shared/DigitalAccountView';
import MapIcon from '../../icons/MapIcon';
import XIcon from '../../icons/XIcon';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { operatorService } from '../../../services/operatorService';
import { financialService } from '../../../services/financialService';
import { fieldOperationsService } from '../../../services/fieldOperationsService';

const OperatorPortalView: React.FC = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'EXECUTION' | 'CLOCK' | 'DIARY' | 'REQUESTS' | 'WALLET'>('EXECUTION');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    
    // Execution State
    const [tasks, setTasks] = useState<OperatorTask[]>([]);
    
    // Request State
    const [requestItem, setRequestItem] = useState('');
    const [requestQty, setRequestQty] = useState('');
    const [requestPriority, setRequestPriority] = useState<OperatorRequest['priority']>('MEDIUM');
    const [myRequests, setMyRequests] = useState<OperatorRequest[]>([]);

    // Diary State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaAttached, setMediaAttached] = useState<'AUDIO' | 'PHOTO' | null>(null);
    const [diaryNote, setDiaryNote] = useState('');

    // Clock State
    const [clockStatus, setClockStatus] = useState<'IDLE' | 'WORKING' | 'BREAK'>('IDLE');
    const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // Wallet State
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const operatorAccount = useMemo(() => {
        return accounts.find((account) => account.userId === 'Operador') || accounts[0] || null;
    }, [accounts]);

    const accountTransactions = useMemo(() => {
        if (!operatorAccount) {
            return [];
        }
        return transactions.filter((item) => item.accountId === operatorAccount.id);
    }, [transactions, operatorAccount]);

    useEffect(() => {
        const loadOperatorPortal = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedTasks, loadedRequests, loadedAccounts, loadedTransactions] = await Promise.all([
                    operatorService.listTasks(),
                    operatorService.listRequests(),
                    financialService.listBankAccounts(),
                    financialService.listTransactions(),
                ]);
                setTasks(loadedTasks);
                setMyRequests(loadedRequests);
                setAccounts(loadedAccounts);
                setTransactions(loadedTransactions);
            } catch {
                setLoadError('Nao foi possivel carregar o portal do operador.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadOperatorPortal();
    }, []);

    // Update Timer for Clock
    useEffect(() => {
        let interval: any;
        if (clockStatus === 'WORKING' && shiftStartTime) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - shiftStartTime.getTime();
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [clockStatus, shiftStartTime]);

    const handleTaskAction = async (taskId: string, action: 'COMPLETED' | 'REJECTED') => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: action } : t));
        try {
            await operatorService.updateTaskStatus(taskId, action);
            addToast({ type: 'success', title: 'Tarefa Atualizada', message: `Status alterado para ${action === 'COMPLETED' ? 'Concluido' : 'Rejeitado'}.` });
        } catch {
            addToast({ type: 'error', title: 'Falha', message: 'Nao foi possivel atualizar a tarefa.' });
        }
    };

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestItem) return;

        try {
            const newReq = await operatorService.createRequest({
                type: 'PURCHASE',
                item: requestItem,
                quantity: requestQty,
                priority: requestPriority,
                requester: 'Jose (Eu)',
            });
            setMyRequests((prev) => [newReq, ...prev]);
            setRequestItem('');
            setRequestQty('');
            addToast({ type: 'success', title: 'Solicitacao Enviada', message: 'O pedido foi encaminhado para aprovacao do gestor.' });
        } catch {
            addToast({ type: 'error', title: 'Falha', message: 'Nao foi possivel enviar a solicitacao.' });
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
            setMediaAttached('AUDIO');
            addToast({ type: 'info', title: 'Gravacao Finalizada', message: 'Audio anexado ao diario.' });
        } else {
            setIsRecording(true);
        }
    };

    const handleDiaryPhoto = () => {
        setMediaAttached('PHOTO');
        addToast({ type: 'success', title: 'Foto Capturada', message: 'Imagem anexada ao diario.' });
    };

    const sendDiaryEntry = async () => {
        if (!mediaAttached) {
            return;
        }
        try {
            await fieldOperationsService.createDiaryEntry({
                author: 'Jose',
                role: 'Operador',
                location: 'Campo',
                type: mediaAttached,
                transcript: diaryNote.trim() || `Relato enviado com mídia ${mediaAttached}.`,
                aiAction: mediaAttached === 'AUDIO' ? 'Transcricao pendente' : undefined,
            });
            setMediaAttached(null);
            setDiaryNote('');
            addToast({ type: 'success', title: 'Diario Enviado', message: 'Relato salvo no banco de dados.' });
        } catch {
            addToast({ type: 'error', title: 'Falha no diario', message: 'Nao foi possivel salvar o relato de campo.' });
        }
    };

    const handleClockAction = (action: 'START' | 'BREAK' | 'STOP') => {
        if (action === 'START') {
            setClockStatus('WORKING');
            setShiftStartTime(new Date());
            addToast({ type: 'success', title: 'Turno Iniciado', message: 'Bom trabalho! O contador de horas esta ativo.' });
        } else if (action === 'BREAK') {
            setClockStatus('BREAK');
        } else if (action === 'STOP') {
            if (confirm('Deseja realmente encerrar seu turno por hoje?')) {
                setClockStatus('IDLE');
                setElapsedTime('00:00:00');
                setShiftStartTime(null);
                addToast({ type: 'info', title: 'Turno Encerrado', message: 'Dados de horas enviados para o sistema de folha.' });
            }
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando portal do operador..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-md mx-auto bg-slate-100 min-h-screen pb-24 border-x border-slate-200 shadow-xl relative">
            {/* Header */}
            <div className="bg-slate-800 text-white p-6 pb-8 rounded-b-3xl shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">Ola, Jose</h2>
                        <p className="text-slate-400 text-sm">Operador de Campo</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${clockStatus === 'WORKING' ? 'bg-green-500 text-white animate-pulse' : 'bg-slate-600 text-slate-300'}`}>
                        {clockStatus === 'WORKING' ? 'EM TURNO' : 'OFFLINE'}
                    </div>
                </div>
                
                {/* Clock Summary */}
                {clockStatus === 'WORKING' && (
                    <div className="bg-slate-700/50 rounded-xl p-3 flex justify-between items-center backdrop-blur-sm">
                        <span className="text-xs text-slate-300 uppercase font-bold">Tempo Decorrido</span>
                        <span className="text-2xl font-mono font-bold text-emerald-400">{elapsedTime}</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 -mt-4">
                
                {/* EXECUTION TAB */}
                {activeTab === 'EXECUTION' && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-slate-700 ml-1">Tarefas de Hoje</h3>
                        {tasks.filter(t => t.status === 'PENDING_REVIEW').length === 0 ? (
                             <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                                <CheckCircleIcon className="h-16 w-16 text-emerald-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">Voce completou todas as tarefas!</p>
                             </div>
                        ) : (
                            tasks.filter(t => t.status === 'PENDING_REVIEW').map(task => (
                                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg text-slate-800">{task.title}</h4>
                                        {task.proofType === 'PHOTO' && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">Foto</span>}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">{task.details}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-4">
                                        <span className="flex items-center"><MapIcon className="h-3 w-3 mr-1"/> {task.geolocation}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleTaskAction(task.id, 'COMPLETED')}
                                        className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all"
                                    >
                                        Marcar como Feito
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* CLOCK TAB */}
                {activeTab === 'CLOCK' && (
                    <div className="animate-fade-in text-center pt-8">
                        <div className="bg-white p-8 rounded-3xl shadow-md mb-8">
                            <div className="text-6xl mb-4">OK</div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Registro de Ponto</h3>
                            <p className="text-slate-500 mb-8">Seu turno e monitorado para calculo de pagamento.</p>
                            
                            {clockStatus === 'IDLE' ? (
                                <button onClick={() => handleClockAction('START')} className="w-full py-4 bg-emerald-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-emerald-600 active:scale-95 transition-all">
                                    Iniciar Turno
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-4xl font-mono font-bold text-slate-700">{elapsedTime}</p>
                                    <button onClick={() => handleClockAction('STOP')} className="w-full py-4 bg-red-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-red-600 active:scale-95 transition-all">
                                        Encerrar Turno
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* DIARY TAB */}
                {activeTab === 'DIARY' && (
                    <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Diario de Campo (Voz/Foto)</h3>
                        <p className="text-sm text-slate-500 mb-6">Registre ocorrencias, quebras ou observacoes. A IA transcrevera automaticamente.</p>
                        
                        <div className="flex justify-center gap-6 mb-8">
                            <button 
                                onClick={toggleRecording}
                                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}
                            >
                                <MicrophoneIcon className={`h-8 w-8 ${isRecording ? 'text-white' : ''}`} />
                            </button>
                            <button 
                                onClick={handleDiaryPhoto}
                                className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg"
                            >
                                <QrCodeIcon className="h-8 w-8" />
                            </button>
                        </div>

                        {mediaAttached && (
                            <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between mb-6">
                                <span className="text-sm font-bold text-slate-700">
                                    {mediaAttached === 'AUDIO' ? 'Audio Gravado' : 'Foto Anexada'}
                                </span>
                                <button onClick={() => setMediaAttached(null)} className="text-red-500"><XIcon className="h-5 w-5"/></button>
                            </div>
                        )}

                        <textarea
                            value={diaryNote}
                            onChange={(e) => setDiaryNote(e.target.value)}
                            placeholder="Descreva o ocorrido (opcional)"
                            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                        />

                        <button 
                            onClick={sendDiaryEntry}
                            disabled={!mediaAttached}
                            className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Enviar Relato
                        </button>
                    </div>
                )}

                {/* REQUESTS TAB */}
                {activeTab === 'REQUESTS' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Nova Solicitacao</h3>
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="O que voce precisa?" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={requestItem}
                                    onChange={e => setRequestItem(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Qtd" 
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={requestQty}
                                        onChange={e => setRequestQty(e.target.value)}
                                    />
                                    <select 
                                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={requestPriority}
                                        onChange={e => setRequestPriority(e.target.value as OperatorRequest['priority'])}
                                    >
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Media</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleSendRequest}
                                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                                >
                                    Solicitar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-500 text-xs uppercase ml-1">Historico</h3>
                            {myRequests.map(req => (
                                <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{req.item}</p>
                                        <p className="text-xs text-slate-500">{req.quantity} - {req.date}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* WALLET TAB (UPCL) */}
                {activeTab === 'WALLET' && (
                    <div className="animate-fade-in">
                         <div className="mb-4 bg-indigo-900 text-white p-4 rounded-xl shadow-lg">
                            <h3 className="font-bold text-lg mb-1">Pagamentos & Diarias</h3>
                            <p className="text-indigo-200 text-xs">Receba suas diarias e bonus diretamente aqui.</p>
                         </div>
                         {operatorAccount ? (
                            <DigitalAccountView account={operatorAccount} transactions={accountTransactions} />
                         ) : (
                            <div className="p-4 bg-slate-50 border rounded-md text-slate-600">Nenhuma conta digital encontrada.</div>
                         )}
                    </div>
                )}

            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 p-2 flex justify-around items-center pb-6 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
                <button onClick={() => setActiveTab('EXECUTION')} className={`flex flex-col items-center p-2 ${activeTab === 'EXECUTION' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <CheckCircleIcon className="h-6 w-6" />
                    <span className="text-[10px] font-bold mt-1">Tarefas</span>
                </button>
                <button onClick={() => setActiveTab('REQUESTS')} className={`flex flex-col items-center p-2 ${activeTab === 'REQUESTS' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <ShoppingCartIcon className="h-6 w-6" />
                    <span className="text-[10px] font-bold mt-1">Pedidos</span>
                </button>
                <div className="relative -top-6">
                    <button onClick={() => setActiveTab('CLOCK')} className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-300 border-4 border-slate-100">
                        <span className="text-2xl">OK</span>
                    </button>
                </div>
                <button onClick={() => setActiveTab('DIARY')} className={`flex flex-col items-center p-2 ${activeTab === 'DIARY' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <MicrophoneIcon className="h-6 w-6" />
                    <span className="text-[10px] font-bold mt-1">Diario</span>
                </button>
                <button onClick={() => setActiveTab('WALLET')} className={`flex flex-col items-center p-2 ${activeTab === 'WALLET' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <CashIcon className="h-6 w-6" />
                    <span className="text-[10px] font-bold mt-1">Carteira</span>
                </button>
            </div>
        </div>
    );
};

export default OperatorPortalView;
