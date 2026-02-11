import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FlaskIcon from '../../icons/FlaskIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import {
    customInputService,
    CustomInputFormula,
    CustomInputPasture,
} from '../../../services/customInputService';

type RequestStep = 'FORM' | 'ANALYSIS' | 'FORMULA' | 'CONFIRMED';
const analysisSteps = [
    'Processando dados da analise de solo...',
    'Calculando exigencias nutricionais do rebanho...',
    'Verificando conformidade com a IN 65 do MAPA...',
    'Gerando formula otimizada...',
];

const CustomInputRequestView: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [step, setStep] = useState<RequestStep>('FORM');
    const [pastures, setPastures] = useState<CustomInputPasture[]>([]);
    const [pastureId, setPastureId] = useState<string>('');
    const [herdType, setHerdType] = useState<'Cria' | 'Recria' | 'Engorda'>('Recria');
    const [soilFile, setSoilFile] = useState<File | null>(null);
    const [analysisText, setAnalysisText] = useState(analysisSteps[0]);
    const [formula, setFormula] = useState<CustomInputFormula | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [pastureList, formulaData] = await Promise.all([
                    customInputService.listPastures(),
                    customInputService.getFormula(),
                ]);
                setPastures(pastureList);
                setPastureId(pastureList[0]?.id ?? '');
                setFormula(formulaData);
            } catch {
                setLoadError('Nao foi possivel carregar a base de dados.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadData();
    }, []);

    useEffect(() => {
        if (step === 'ANALYSIS') {
            let index = 0;
            const interval = setInterval(() => {
                index++;
                if (index < analysisSteps.length) {
                    setAnalysisText(analysisSteps[index]);
                } else {
                    clearInterval(interval);
                    setStep('FORMULA');
                }
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [step]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSoilFile(e.target.files[0]);
        }
    };

    const handleSubmitForm = () => {
        if (!pastureId || !herdType || !soilFile) {
            addToast({ type: 'warning', title: 'Dados Incompletos', message: 'Preencha todos os campos e anexe a analise de solo.' });
            return;
        }
        setStep('ANALYSIS');
    };

    const handleSubmitRequest = async () => {
        if (!soilFile || !pastureId) {
            return;
        }

        setIsSaving(true);
        try {
            await customInputService.submitRequest({
                pastureId,
                herdType,
                soilFileName: soilFile.name,
            });
            setStep('CONFIRMED');
        } catch {
            addToast({ type: 'error', title: 'Falha ao Enviar', message: 'Nao foi possivel registrar a solicitacao.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando solicitacao..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    if (step === 'CONFIRMED') {
        return (
            <div className="max-w-2xl mx-auto text-center bg-white p-12 rounded-lg shadow-xl animate-fade-in">
                <CheckCircleIcon className="h-20 w-20 text-emerald-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Solicitacao Enviada!</h2>
                <p className="text-slate-600 mb-6">A ordem de producao para a formula foi enviada. Nossa equipe entrara em contato com a cotacao.</p>
                <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700">
                    Voltar ao Painel
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <FlaskIcon className="h-8 w-8 mr-3 text-indigo-600" />Solicitacao de Insumos Personalizados
            </h2>
            <p className="text-slate-600 mb-8">Gere uma formula otimizada e isenta de registro, conforme a legislacao do MAPA.</p>

            {step === 'FORM' && (
                <div className="bg-white p-8 rounded-lg shadow-md animate-fade-in border-t-4 border-indigo-500">
                    <h3 className="text-xl font-bold mb-2">1. Coleta de Dados</h3>
                    <p className="text-sm text-slate-500 mb-6">Forneca as informacoes do local e do rebanho.</p>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Pasto de Destino</label>
                            <select value={pastureId} onChange={e => setPastureId(e.target.value)} className="w-full p-3 border rounded-md">
                                {pastures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Rebanho</label>
                            <select value={herdType} onChange={e => setHerdType(e.target.value as any)} className="w-full p-3 border rounded-md">
                                <option>Cria</option><option>Recria</option><option>Engorda</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Analise de Solo (PDF)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
                                    <div className="flex text-sm">
                                        <label htmlFor="file-upload" className="relative cursor-pointer font-medium text-indigo-600 hover:text-indigo-500">
                                            <span>Carregar arquivo</span>
                                            <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">ou arraste e solte</p>
                                    </div>
                                    <p className="text-xs text-slate-500">{soilFile ? `Selecionado: ${soilFile.name}` : 'PDF ate 10MB'}</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSubmitForm} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Analisar Necessidades</button>
                    </div>
                </div>
            )}

            {step === 'ANALYSIS' && (
                <div className="bg-white p-12 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-6"></div>
                    <p className="text-indigo-800 font-semibold text-lg animate-pulse">{analysisText}</p>
                </div>
            )}

            {step === 'FORMULA' && formula && (
                <div className="bg-white p-8 rounded-lg shadow-md animate-fade-in border-t-4 border-emerald-500">
                    <h3 className="text-xl font-bold mb-6">2. Formula e Recomendacao</h3>
                    <div className="bg-indigo-50 p-4 rounded-lg border mb-6">
                        <h4 className="text-sm font-bold text-indigo-800">Resumo da Analise</h4>
                        <p className="text-sm text-indigo-700 mt-1">{formula.summary} Rebanho: <strong>{herdType}</strong>.</p>
                    </div>
                    <h4 className="font-bold mb-3">Composicao Recomendada</h4>
                    <table className="w-full text-sm mb-6">
                        <thead className="bg-slate-100 uppercase">
                            <tr><th className="p-3">Componente</th><th className="p-3">Quantidade</th><th className="p-3">Justificativa</th></tr>
                        </thead>
                        <tbody>
                            {formula.composition.map(item => (
                                <tr key={item.component} className="border-b">
                                    <td className="p-3 font-semibold">{item.component}</td>
                                    <td className="p-3 font-mono">{item.amount}</td>
                                    <td className="p-3">{item.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 bg-slate-50 rounded-lg border flex items-start mb-6">
                        <LockClosedIcon className="h-6 w-6 text-slate-500 mr-3 mt-1 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold">Conformidade Regulatoria (MAPA)</h4>
                            <p className="text-xs text-slate-600 mt-1">{formula.regulatoryNote}</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setStep('FORM')} className="px-6 py-3 text-sm font-semibold bg-slate-100 rounded-lg hover:bg-slate-200">Voltar</button>
                        <button onClick={handleSubmitRequest} disabled={isSaving} className="px-6 py-3 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-60">
                            {isSaving ? 'Enviando...' : 'Enviar Solicitacao'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomInputRequestView;
