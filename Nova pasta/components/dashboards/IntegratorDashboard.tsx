import React, { useEffect, useMemo, useState } from 'react';
import UsersIcon from '../icons/UsersIcon';
import { CashIcon } from '../icons/CashIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import MapIcon from '../icons/MapIcon';
import { CubeIcon } from '../icons/CubeIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { integratorService } from '../../services/integratorService';
import { IntegratedProducer, IntegratorMessage, PartnershipOffer } from '../../types';

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{className?: string}>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className={`flex items-center text-sm font-bold ${color}`}>
            <Icon className="h-5 w-5 mr-2" />
            {title}
        </div>
        <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

// New Component: Supply Chain Visualizer
const SupplyChainVisualizer: React.FC = () => {
    return (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center">
                <LockClosedIcon className="h-4 w-4 mr-2 text-indigo-600" />
                Sua Cadeia de Fornecimento (Lastro Auditado)
            </h4>
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-300 -z-10 transform -translate-y-1/2"></div>
                
                {/* Nodes */}
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold border-4 border-white shadow-sm">1</div>
                    <span className="text-xs font-bold mt-2 text-slate-700">Cria</span>
                    <span className="text-[10px] text-slate-500">Parceiro #492</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold border-4 border-white shadow-sm">2</div>
                    <span className="text-xs font-bold mt-2 text-slate-700">Recria</span>
                    <span className="text-[10px] text-slate-500 bg-indigo-100 px-1 rounded font-bold text-indigo-700">Integrado</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-500 font-bold border-4 border-white shadow-sm border-dashed border-slate-400">3</div>
                    <span className="text-xs font-bold mt-2 text-slate-500">Engorda</span>
                    <span className="text-[10px] text-amber-600 font-bold">Buscando...</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold border-4 border-white shadow-sm">4</div>
                    <span className="text-xs font-bold mt-2 text-slate-800">Industria (Voce)</span>
                </div>
            </div>
        </div>
    );
};

const IntegratorDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Network' | 'Demands' | 'Chat'>('Network');
    const [messages, setMessages] = useState<IntegratorMessage[]>([]);
    const [offers, setOffers] = useState<PartnershipOffer[]>([]);
    const [producers, setProducers] = useState<IntegratedProducer[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [targetStage, setTargetStage] = useState('Todos');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadIntegrator = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedMessages, loadedProducers, loadedOffers] = await Promise.all([
                    integratorService.listMessages(),
                    integratorService.listProducers(),
                    integratorService.listOffers(),
                ]);
                setMessages(loadedMessages);
                setProducers(loadedProducers);
                setOffers(loadedOffers);
            } catch {
                setLoadError('Nao foi possivel carregar o portal de integracao.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadIntegrator();
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const msg = await integratorService.createMessage(newMessage.trim());
            setMessages((prev) => [msg, ...prev]);
            setNewMessage('');
        } catch {
            setLoadError('Nao foi possivel enviar a mensagem.');
        }
    };

    const filteredProducers = targetStage === 'Todos' 
        ? producers 
        : producers.filter(p => p.productionType === targetStage);

    const contractedCount = useMemo(() => producers.filter(p => p.status === 'Contratado').length, [producers]);
    const openOffers = useMemo(() => offers.filter(o => o.status === 'Aberta').length, [offers]);

    if (isLoading) {
        return <LoadingSpinner text="Carregando integracao..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal de Integracao (Originacao)</h2>
                    <p className="text-slate-600">Gerencie sua cadeia de suprimentos e contratos de compra futura.</p>
                </div>
                <div className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm flex items-center shadow-lg">
                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-emerald-400" />
                    <span>Ciclo+ Safe Deal Ativo</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KpiCard title="Fornecedores Integrados" value={contractedCount.toString()} icon={UsersIcon} color="text-indigo-600" />
                <KpiCard title="Volume Contratado" value="1.500 cab" icon={BriefcaseIcon} color="text-emerald-600" />
                <KpiCard title="Demandas de Compra" value={openOffers.toString()} icon={CashIcon} color="text-amber-600" />
            </div>

            {/* Main Content Area with Tabs */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[500px]">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('Network')}
                        className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${activeTab === 'Network' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Rede de Fornecimento
                    </button>
                    <button 
                        onClick={() => setActiveTab('Demands')}
                        className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${activeTab === 'Demands' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Minhas Demandas (Compras)
                    </button>
                    <button 
                        onClick={() => setActiveTab('Chat')}
                        className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${activeTab === 'Chat' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Negociacao Segura
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* NETWORK TAB */}
                    {activeTab === 'Network' && (
                        <div>
                            <SupplyChainVisualizer />

                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <h3 className="text-xl font-bold text-slate-800">Parceiros de Originacao</h3>
                                <div className="flex gap-2">
                                    <select 
                                        value={targetStage}
                                        onChange={(e) => setTargetStage(e.target.value)}
                                        className="p-2 border border-slate-300 rounded-md text-sm bg-slate-50"
                                    >
                                        <option value="Todos">Todas as Fases</option>
                                        <option value="Cria">Fase de Cria</option>
                                        <option value="Recria">Fase de Recria</option>
                                        <option value="Engorda">Fase de Engorda</option>
                                    </select>
                                    <input type="text" placeholder="Filtrar por regiao..." className="p-2 border border-slate-300 rounded-md text-sm w-64" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredProducers.map(producer => (
                                    <div key={producer.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white relative overflow-hidden group">
                                        {/* Status Strip */}
                                        <div className={`absolute top-0 left-0 w-1 h-full ${producer.status === 'Disponivel' ? 'bg-emerald-500' : producer.status === 'Contratado' ? 'bg-slate-400' : 'bg-amber-500'}`}></div>
                                        
                                        <div className="ml-3">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Perfil Verificado (Blind)</span>
                                                    <h4 className="text-lg font-bold text-slate-800">{producer.maskedName}</h4>
                                                </div>
                                                <div className="text-center">
                                                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold text-sm bg-emerald-50">
                                                        {producer.auditScore}
                                                    </div>
                                                    <span className="text-[9px] text-emerald-600 font-bold uppercase mt-1 block">Score</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                                                <p className="flex items-center"><BriefcaseIcon className="h-4 w-4 mr-2 text-slate-400"/> Foco: <span className="font-bold ml-1">{producer.productionType}</span></p>
                                                <p className="flex items-center">
                                                    <MapIcon className="h-4 w-4 mr-2 text-slate-400"/> 
                                                    <span className="ml-1 bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-500 flex items-center">
                                                        <LockClosedIcon className="h-3 w-3 mr-1 text-slate-400"/>
                                                        {producer.region}
                                                    </span>
                                                </p>
                                                <p className="flex items-center"><CubeIcon className="h-4 w-4 mr-2 text-slate-400"/> Capacidade: <span className="font-bold ml-1 text-indigo-700">{producer.capacity}</span></p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center text-xs text-slate-400">
                                                    <CheckCircleIcon className="h-3 w-3 mr-1 text-emerald-500" />
                                                    Auditado: {producer.lastAuditDate}
                                                </div>
                                                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                                                    Propor Compra
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
                                <LockClosedIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                                <div>
                                    <h5 className="font-bold text-blue-800 text-sm">Privacidade de Rede Garantida</h5>
                                    <p className="text-xs text-blue-700 mt-1">
                                        A localizacao exata das fazendas parceiras e omitida ate a assinatura do contrato digital (Escrow). 
                                        O sistema atua como gestor fiel do compromisso para garantir o cumprimento do lastro e evitar quebra da cadeia (bypass).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DEMANDS TAB */}
                    {activeTab === 'Demands' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">Minhas Demandas de Compra</h3>
                                <button className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors font-semibold text-sm">
                                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                                    Criar Nova Demanda
                                </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {offers.map(offer => (
                                    <div key={offer.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-slate-800">{offer.title}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${offer.status === 'Aberta' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                                {offer.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-4">{offer.description}</p>
                                        <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                            <span className="font-semibold">Modelo: {offer.type}</span>
                                            <span className="text-indigo-600 font-bold">{offer.applicants} Candidatos (Triagem Automatica)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CHAT TAB */}
                    {activeTab === 'Chat' && (
                        <div className="flex flex-col h-[500px]">
                            <div className="bg-slate-100 p-3 rounded-t-lg border-b border-slate-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Canal Seguro do Sistema</span>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">Criptografado</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 p-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.from === 'Integradora' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[70%] rounded-lg p-4 shadow-sm ${
                                            msg.from === 'Integradora' 
                                            ? 'bg-indigo-600 text-white rounded-br-none' 
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                        }`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-bold ${msg.from === 'Integradora' ? 'text-indigo-200' : 'text-slate-500'}`}>{msg.from}</span>
                                                <span className={`text-xs ml-2 ${msg.from === 'Integradora' ? 'text-indigo-300' : 'text-slate-400'}`}>{msg.date}</span>
                                            </div>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white p-4 rounded-b-lg border-t border-slate-200">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Enviar mensagem para a rede..." 
                                        className="flex-1 p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors">
                                        Enviar
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntegratorDashboard;
