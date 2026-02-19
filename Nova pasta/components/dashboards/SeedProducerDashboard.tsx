import React, { useEffect, useMemo, useState } from 'react';
import { SeedField, SeedFieldStatus, SeedGeneration, CertificationStep, SeedLot } from '../../types';
import { CubeIcon } from '../icons/CubeIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { seedProducerService } from '../../services/seedProducerService';

const StatusBadge: React.FC<{ status: SeedFieldStatus }> = ({ status }) => {
    const styles: Record<SeedFieldStatus, string> = {
        'PREPARO': 'bg-yellow-100 text-yellow-800',
        'PLANTIO': 'bg-blue-100 text-blue-800',
        'CRESCIMENTO': 'bg-teal-100 text-teal-800',
        'FLORACAO': 'bg-purple-100 text-purple-800',
        'COLHEITA': 'bg-orange-100 text-orange-800',
        'CERTIFICADO': 'bg-green-100 text-green-800',
    };
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>;
};

const GenerationBadge: React.FC<{ generation: SeedGeneration }> = ({ generation }) => {
    const styles: Record<SeedGeneration, string> = {
        'G1': 'bg-red-200 text-red-900 border-red-300',
        'G2': 'bg-red-100 text-red-800 border-red-200',
        'C1': 'bg-blue-200 text-blue-900 border-blue-300',
        'C2': 'bg-blue-100 text-blue-800 border-blue-200',
        'S1': 'bg-green-200 text-green-900 border-green-300',
        'S2': 'bg-green-100 text-green-800 border-green-200',
    };
    return <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded border ${styles[generation]}`}>{generation}</span>;
}

const SeedProducerDashboard: React.FC = () => {
    const [selectedField, setSelectedField] = useState<SeedField | null>(null);
    const [fields, setFields] = useState<SeedField[]>([]);
    const [lots, setLots] = useState<SeedLot[]>([]);
    const [certSteps, setCertSteps] = useState<CertificationStep[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadSeedProducer = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const [loadedFields, loadedLots, loadedSteps] = await Promise.all([
                    seedProducerService.listSeedFields(),
                    seedProducerService.listSeedLots(),
                    seedProducerService.listCertificationSteps(),
                ]);
                setFields(loadedFields);
                setLots(loadedLots);
                setCertSteps(loadedSteps);
                setSelectedField(loadedFields[0] ?? null);
            } catch {
                setLoadError('Nao foi possivel carregar o painel de sementes.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadSeedProducer();
    }, []);

    const kpis = useMemo(() => {
        const inventoryValue = lots.reduce((acc, lot) => acc + (lot.quantity * 250), 0);
        return {
            activeFields: fields.length,
            certificationLots: certSteps.filter(step => step.status === 'EM_ANALISE').length || 1,
            inventoryValue,
        };
    }, [fields, lots, certSteps]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    if (isLoading) {
        return <LoadingSpinner text="Carregando sementes..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Modulo de Sementes do Produtor</h2>
            <p className="text-slate-600 mb-8">Capability de sementes ativa no perfil Produtor (scope seedProducer).</p>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <p className="text-sm text-slate-500">Campos Ativos</p>
                    <p className="text-3xl font-bold text-slate-800">{kpis.activeFields}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <p className="text-sm text-slate-500">Lotes em Certificacao</p>
                    <p className="text-3xl font-bold text-slate-800">{kpis.certificationLots}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <p className="text-sm text-slate-500">Inventario de Sementes (Est.)</p>
                    <p className="text-3xl font-bold text-slate-800">{formatCurrency(kpis.inventoryValue)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Field & Certification Management */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Field Management */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800">Campos de Producao</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-4">Campo</th>
                                        <th className="p-4">Variedade</th>
                                        <th className="p-4">Geracao</th>
                                        <th className="p-4">Area (ha)</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map(field => (
                                        <tr 
                                            key={field.id} 
                                            onClick={() => setSelectedField(field)}
                                            className={`border-t cursor-pointer ${selectedField?.id === field.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="p-4 font-bold text-slate-700">{field.name}</td>
                                            <td className="p-4 text-slate-600">{field.variety}</td>
                                            <td className="p-4"><GenerationBadge generation={field.generation} /></td>
                                            <td className="p-4">{field.area}</td>
                                            <td className="p-4"><StatusBadge status={field.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Certification Process */}
                    {selectedField && (
                        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Processo de Certificacao</h3>
                            <p className="text-sm text-slate-500 mb-6">Acompanhamento para o campo: <span className="font-bold text-indigo-700">{selectedField.name}</span></p>
                            
                            <div className="space-y-4">
                                {certSteps.map((step, index) => (
                                    <div key={`${step.name}-${index}`} className="flex items-start">
                                        <div className="flex flex-col items-center mr-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                                step.status === 'APROVADO' ? 'bg-green-500 border-green-500 text-white' :
                                                step.status === 'EM_ANALISE' ? 'bg-yellow-400 border-yellow-400 text-white animate-pulse' : 'bg-white border-slate-300'
                                            }`}>
                                                {step.status === 'APROVADO' ? <CheckCircleIcon className="h-5 w-5" /> : <span className="font-bold text-slate-400">{index + 1}</span>}
                                            </div>
                                            {index < certSteps.length - 1 && <div className="w-0.5 h-8 bg-slate-200"></div>}
                                        </div>
                                        <div className="pt-1">
                                            <p className={`font-semibold ${step.status === 'PENDENTE' ? 'text-slate-400' : 'text-slate-800'}`}>{step.name}</p>
                                            {step.date && <p className="text-xs text-slate-500">{step.date}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Inventory */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                        <CubeIcon className="h-6 w-6 mr-2 text-slate-500" />
                        Inventario de Lotes
                    </h3>
                    <div className="space-y-3">
                        {lots.map(lot => (
                            <div key={lot.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-indigo-700">{lot.variety}</p>
                                        <GenerationBadge generation={lot.generation} />
                                    </div>
                                    <p className="font-bold text-slate-800">{lot.quantity} sc</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                                    <p>Germinacao: <span className="font-semibold text-green-700">{lot.germinationRate}%</span></p>
                                    <p>Pureza: <span className="font-semibold">{lot.purity}%</span></p>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Local: {lot.storageLocation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeedProducerDashboard;
