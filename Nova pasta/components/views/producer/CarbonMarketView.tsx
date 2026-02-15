import React, { useEffect, useMemo, useState } from 'react';
import LeafIcon from '../../icons/LeafIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { carbonService } from '../../../services/carbonService';
import { CarbonCredit, CarbonProject, SustainablePractice } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

const CarbonMarketView: React.FC = () => {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<CarbonProject[]>([]);
    const [credits, setCredits] = useState<CarbonCredit[]>([]);
    const [practices, setPractices] = useState<SustainablePractice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    
    // --- DATA CALCULATION ---
    const totalPotential = projects.reduce((sum, p) => sum + p.estimatedSequestration, 0);
    const totalCertified = credits.reduce((sum, c) => sum + c.quantity, 0);
    const availableCredits = credits.filter(c => c.status === 'DISPONIVEL').reduce((sum, c) => sum + c.quantity, 0);
    const CARBON_PRICE_PER_TON = 85.00;

    const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    useEffect(() => {
        const loadCarbonData = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedPractices, loadedProjects, loadedCredits] = await Promise.all([
                    carbonService.listPractices(),
                    carbonService.listProjects(),
                    carbonService.listCredits(),
                ]);
                setPractices(loadedPractices);
                setProjects(loadedProjects);
                setCredits(loadedCredits);
            } catch {
                setLoadError('Nao foi possivel carregar o mercado de carbono.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadCarbonData();
    }, []);

    const practiceById = useMemo(() => {
        return practices.reduce<Record<string, SustainablePractice>>((acc, practice) => {
            acc[practice.id] = practice;
            return acc;
        }, {});
    }, [practices]);

    const handleCertify = async (projectId: string) => {
        const previousStatus = projects.find((project) => project.id === projectId)?.status;
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'EM_VERIFICACAO' } : p));
        try {
            await carbonService.updateProjectStatus(projectId, 'EM_VERIFICACAO');
            addToast({ type: 'success', title: 'Certificacao solicitada', message: 'Status do projeto atualizado no Firebase.' });
        } catch {
            if (previousStatus) {
                setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: previousStatus } : p));
            }
            addToast({ type: 'error', title: 'Falha ao solicitar', message: 'Nao foi possivel atualizar a certificacao.' });
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando mercado de carbono..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <LeafIcon className="h-8 w-8 mr-3 text-emerald-600" />
                Mercado de Carbono & Sustentabilidade
            </h2>
            <p className="text-slate-600 mb-8">
                Monetize suas praticas sustentaveis. Transforme o sequestro de carbono da sua propriedade em ativos financeiros.
            </p>

            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
                    <p className="text-sm font-bold text-slate-500 uppercase">Potencial Total</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{formatNumber(totalPotential)} <span className="text-lg font-medium text-slate-500">tCO2e</span></p>
                    <p className="text-xs text-slate-400 mt-1">Estimado de projetos ativos</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500">
                    <p className="text-sm font-bold text-slate-500 uppercase">Creditos Certificados</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">{formatNumber(totalCertified)} <span className="text-lg font-medium text-slate-500">tCO2e</span></p>
                    <p className="text-xs text-slate-400 mt-1">Verificados e prontos para negociar</p>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500">
                    <p className="text-sm font-bold text-slate-500 uppercase">Disponivel para Venda</p>
                    <p className="text-3xl font-extrabold text-green-700 mt-2">{formatNumber(availableCredits)} <span className="text-lg font-medium text-slate-500">tCO2e</span></p>
                    <p className="text-xs text-slate-400 mt-1">Creditos em carteira</p>
                </div>
                <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg">
                    <p className="text-sm font-bold text-indigo-200 uppercase">Valor de Mercado Estimado</p>
                    <p className="text-3xl font-extrabold mt-2">{formatCurrency(availableCredits * CARBON_PRICE_PER_TON)}</p>
                    <p className="text-xs text-indigo-300 mt-1">Baseado em R$ {CARBON_PRICE_PER_TON.toFixed(2)}/tCO2e</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Carbon Projects Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Meus Projetos de Carbono</h3>
                        <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Iniciar Novo Projeto
                        </button>
                    </div>

                    {projects.map(project => {
                        const practice = practiceById[project.practiceId];
                        const statusStyles: Record<CarbonProject['status'], string> = {
                            'ATIVO': 'bg-blue-100 text-blue-800',
                            'EM_VERIFICACAO': 'bg-yellow-100 text-yellow-800 animate-pulse',
                            'VERIFICADO': 'bg-green-100 text-green-800',
                            'PLANEJAMENTO': 'bg-slate-100 text-slate-600',
                        };

                        return (
                            <div key={project.id} className="bg-white p-5 rounded-lg shadow-md border border-slate-200">
                                <div className="flex flex-col md:flex-row justify-between md:items-start">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">{project.name}</h4>
                                        <p className="text-sm text-indigo-600 font-semibold">{practice?.name ?? 'N/D'}</p>
                                        <p className="text-xs text-slate-500 mt-1">{practice?.description ?? ''}</p>
                                    </div>
                                    <span className={`mt-2 md:mt-0 px-3 py-1 text-xs font-bold rounded-full ${statusStyles[project.status]}`}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-slate-500">Area:</span> <span className="font-bold">{project.area} ha</span></div>
                                        <div><span className="text-slate-500">Sequestro Anual:</span> <span className="font-bold">{project.estimatedSequestration} tCO2e</span></div>
                                    </div>
                                    {project.status === 'ATIVO' && (
                                        <button 
                                            onClick={() => handleCertify(project.id)}
                                            className="w-full md:w-auto px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700"
                                        >
                                            Solicitar Certificacao
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Carbon Wallet Section */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Carteira de Creditos</h3>
                        <div className="space-y-3">
                            {credits.map(credit => (
                                <div key={credit.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-bold text-indigo-700">Safra {credit.vintage}</p>
                                        <p className="text-lg font-bold text-slate-800">{formatNumber(credit.quantity)} <span className="text-sm font-medium">tCO2e</span></p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center text-xs text-slate-500 font-mono" title={credit.certificateHash}>
                                            <LockClosedIcon className="h-3 w-3 mr-1" /> {credit.certificateHash.substring(0, 10)}...
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${credit.status === 'DISPONIVEL' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                            {credit.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">
                            Ofertar Creditos no Mercado
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarbonMarketView;
