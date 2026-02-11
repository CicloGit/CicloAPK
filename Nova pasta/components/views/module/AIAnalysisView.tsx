import React, { useState } from 'react';
import SparklesIcon from '../../icons/SparklesIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import ExclamationIcon from '../../icons/ExclamationIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { useToast } from '../../../contexts/ToastContext';
import { aiAnalysisService, AIAnalysisResult } from '../../../services/aiAnalysisService';

const AIAnalysisView: React.FC = () => {
    const { addToast } = useToast();
    const [image, setImage] = useState<string | null>(null);
    const [imageName, setImageName] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                setImage(event?.target?.result as string);
                setImageName(file.name);
                setResult(null); // Reset previous result
            };
            reader.readAsDataURL(file);
        }
    };

    const runAnalysis = async () => {
        if (!image) {
            return;
        }

        setIsAnalyzing(true);
        try {
            const analysis = await aiAnalysisService.runAnalysis(imageName ?? undefined);
            setResult(analysis);
        } catch {
            addToast({
                type: 'error',
                title: 'Falha na Analise',
                message: 'Nao foi possivel executar o diagnostico agora.',
                duration: 6000,
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setImageName(null);
        setResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <SparklesIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Diagnostico Inteligente (IA)
            </h2>
            <p className="text-slate-600 mb-8">
                Envie fotos de folhas, animais ou solo. Nossa IA identificara problemas e sugerira protocolos de manejo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-300 relative overflow-hidden">
                    {image ? (
                        <>
                            <img src={image} alt="Uploaded" className="max-h-[300px] object-contain mb-4 rounded-lg shadow-sm" />
                            <button
                                onClick={handleReset}
                                className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white text-slate-600"
                            >
                                <ExclamationIcon className="h-5 w-5" />
                            </button>
                        </>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                            <PlusCircleIcon className="h-16 w-16 text-slate-300 mb-4" />
                            <span className="text-slate-600 font-semibold mb-2">Carregar Foto ou Tirar Foto</span>
                            <span className="text-xs text-slate-400">JPG, PNG (Max 5MB)</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>

                {/* Analysis Section */}
                <div className="flex flex-col">
                    {!image ? (
                        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-8 text-center text-slate-400">
                            <p>Carregue uma imagem ao lado para iniciar a analise.</p>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white rounded-lg shadow-md p-6 relative">
                            {!result && !isAnalyzing && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <p className="text-slate-600 mb-6 text-center">Imagem carregada com sucesso. Pronto para analisar.</p>
                                    <button
                                        onClick={runAnalysis}
                                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-lg"
                                    >
                                        <SparklesIcon className="h-6 w-6 mr-2" />
                                        Iniciar Analise IA
                                    </button>
                                </div>
                            )}

                            {isAnalyzing && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <LoadingSpinner text="Analisando padroes visuais..." />
                                    <p className="text-xs text-slate-500 mt-2">Consultando banco de dados agronomico</p>
                                </div>
                            )}

                            {result && (
                                <div className="animate-fade-in h-full flex flex-col">
                                    <div className={`p-4 rounded-lg mb-6 border-l-4 ${result.confidence > 85 ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-slate-800">{result.diagnosis}</h3>
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${result.confidence > 85 ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                                {result.confidence}% Confianca
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700">{result.recommendation}</p>
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Proximos Passos</h4>
                                        {result.action === 'TREAT' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center p-3 bg-slate-50 rounded border border-slate-200">
                                                    <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
                                                    <div>
                                                        <p className="font-semibold text-sm">Diagnostico Preciso (IA)</p>
                                                        <p className="text-xs text-slate-500">Produto Sugerido: {result.product}</p>
                                                    </div>
                                                </div>
                                                <button className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md">
                                                    Confirmar Aplicacao
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center p-3 bg-slate-50 rounded border border-slate-200">
                                                    <ExclamationIcon className="h-6 w-6 text-yellow-600 mr-3" />
                                                    <div>
                                                        <p className="font-semibold text-sm">Atencao: Validacao Necessaria</p>
                                                        <p className="text-xs text-slate-500">A IA detectou anomalia, mas recomenda visita tecnica.</p>
                                                    </div>
                                                </div>
                                                <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">
                                                    Gerar Ordem de Estudo (Tecnico)
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                                        <p className="text-[10px] text-slate-400">
                                            A responsabilidade final pela aplicacao e do tecnico responsavel. A IA serve como ferramenta de triagem.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisView;
