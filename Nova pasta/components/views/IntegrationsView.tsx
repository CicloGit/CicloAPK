import React, { useEffect, useState } from 'react';
import PuzzleIcon from '../icons/PuzzleIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import CodeIcon from '../icons/CodeIcon';
import BuildingIcon from '../icons/BuildingIcon'; // Gov
import CloudIcon from '../icons/CloudIcon'; // Data
import { CashIcon } from '../icons/CashIcon';
import { CubeIcon } from '../icons/CubeIcon';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { integrationsService, IntegrationStatus } from '../../services/integrationsService';

const IntegrationsView: React.FC = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'ERP' | 'GOV' | 'CREDIT' | 'DATA' | 'PAYMENT' | 'API'>('ERP');
    const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadStatus = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const status = await integrationsService.getStatus();
                setIntegrationStatus(status);
            } catch {
                setLoadError('Nao foi possivel carregar o status das integracoes.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadStatus();
    }, []);

    const erpStatus = integrationStatus?.erp.status ?? 'DISCONNECTED';
    const erpProvider = integrationStatus?.erp.provider ?? 'Totvs (Protheus/RM)';
    const asaasStatus = integrationStatus?.payments.status ?? 'CONNECTED';
    const asaasEnvironment = integrationStatus?.payments.environment ?? 'PRODUCAO';
    const sefazStatus = integrationStatus?.gov.sefaz ?? 'ACTIVE';
    const agrodefesaStatus = integrationStatus?.gov.agrodefesa ?? 'INACTIVE';
    const serasaStatus = integrationStatus?.credit.serasa ?? 'ACTIVE';
    const sicarStatus = integrationStatus?.credit.sicar ?? 'ACTIVE';
    const dataSources = integrationStatus?.data.sources ?? ['CONAB (Safra)', 'CEPEA (Precos)', 'INMET (Clima)'];

    const handleRequestIntegration = async (type: string) => {
        try {
            await integrationsService.requestIntegration(type);
            addToast({
                type: 'success',
                title: 'Solicitacao Enviada',
                message: `Nosso time tecnico iniciara a homologacao segura com ${type}.`,
                duration: 6000,
            });
        } catch {
            addToast({
                type: 'error',
                title: 'Falha ao Enviar',
                message: 'Nao foi possivel registrar sua solicitacao agora.',
                duration: 6000,
            });
        }
    };

    const handleProviderChange = async (value: string) => {
        if (!integrationStatus) {
            return;
        }

        const nextStatus = {
            ...integrationStatus,
            erp: {
                ...integrationStatus.erp,
                provider: value,
            },
        };

        setIntegrationStatus(nextStatus);

        try {
            await integrationsService.updateStatus({ erp: nextStatus.erp });
        } catch {
            addToast({
                type: 'error',
                title: 'Falha ao Salvar',
                message: 'Nao foi possivel atualizar o provedor agora.',
                duration: 6000,
            });
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando integracoes..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    const sefazActive = sefazStatus === 'ACTIVE';
    const agrodefesaActive = agrodefesaStatus === 'ACTIVE';
    const serasaActive = serasaStatus === 'ACTIVE';
    const sicarActive = sicarStatus === 'ACTIVE';

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
                <PuzzleIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Hub de Integracoes & Dados
            </h2>
            <p className="text-slate-600 mb-8">
                Ecossistema de conexoes nativas. As configuracoes tecnicas sao gerenciadas pela equipe de
                desenvolvimento para garantir a seguranca dos dados.
            </p>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex flex-col space-y-2">
                    <button
                        onClick={() => setActiveTab('ERP')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'ERP' ? 'bg-white shadow text-indigo-600 border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CubeIcon className="h-5 w-5 mr-3" /> ERP & Gestao
                    </button>
                    <button
                        onClick={() => setActiveTab('GOV')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'GOV' ? 'bg-white shadow text-slate-800 border-l-4 border-slate-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <BuildingIcon className="h-5 w-5 mr-3" /> Gov & Fiscal
                    </button>
                    <button
                        onClick={() => setActiveTab('CREDIT')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'CREDIT' ? 'bg-white shadow text-emerald-600 border-l-4 border-emerald-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <TrendingUpIcon className="h-5 w-5 mr-3" /> Credito & Risco
                    </button>
                    <button
                        onClick={() => setActiveTab('DATA')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'DATA' ? 'bg-white shadow text-blue-600 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CloudIcon className="h-5 w-5 mr-3" /> Inteligencia Mercado
                    </button>
                    <button
                        onClick={() => setActiveTab('PAYMENT')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'PAYMENT' ? 'bg-white shadow text-teal-600 border-l-4 border-teal-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CashIcon className="h-5 w-5 mr-3" /> Pagamentos
                    </button>
                    <button
                        onClick={() => setActiveTab('API')}
                        className={`p-3 rounded-lg text-left font-semibold flex items-center ${activeTab === 'API' ? 'bg-white shadow text-amber-600 border-l-4 border-amber-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CodeIcon className="h-5 w-5 mr-3" /> API (Dev)
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {/* ERP TAB */}
                    {activeTab === 'ERP' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Integracao com ERP de Gestao</h3>
                            <p className="text-sm text-slate-500 mb-6">Conexao segura via API para sincronizacao de estoque e financeiro.</p>

                            <div className="grid grid-cols-1 gap-6 max-w-lg">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-slate-700">Status da Conexao</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${erpStatus === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                            {erpStatus === 'CONNECTED' ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Provedor Homologado</label>
                                        <select
                                            className="w-full p-2 border border-slate-300 rounded bg-white"
                                            disabled={erpStatus === 'CONNECTED'}
                                            value={erpProvider}
                                            onChange={(event) => handleProviderChange(event.target.value)}
                                        >
                                            <option>Totvs (Protheus/RM)</option>
                                            <option>SAP Business One</option>
                                            <option>Senior Sistemas</option>
                                            <option>Omie</option>
                                        </select>
                                    </div>

                                    {erpStatus === 'DISCONNECTED' ? (
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 mb-3">Para ativar esta integracao, e necessario configurar as credenciais seguras junto ao nosso suporte tecnico.</p>
                                            <button
                                                onClick={() => handleRequestIntegration('ERP')}
                                                className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition-colors"
                                            >
                                                Solicitar Configuracao
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-green-700 bg-green-50 p-3 rounded border border-green-100">
                                            <ShieldCheckIcon className="h-5 w-5 mr-2" />
                                            <span className="text-sm font-semibold">Conexao Segura Estabelecida</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GOV & FISCAL TAB */}
                    {activeTab === 'GOV' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Integracoes Governamentais Nativas</h3>
                                <p className="text-sm text-slate-500">O sistema ja possui conectores homologados com os orgaos publicos.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* SEFAZ CARD */}
                                <div className={`border rounded-lg p-5 ${sefazActive ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center">
                                            <div className="bg-white p-2 rounded mr-3 shadow-sm">
                                                <BuildingIcon className={`h-6 w-6 ${sefazActive ? 'text-green-700' : 'text-slate-600'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">SEFAZ / Receita</h4>
                                                <p className="text-xs text-slate-500">Emissor de NF-e</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-bold flex items-center ${sefazActive ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                                            <LockClosedIcon className="h-3 w-3 mr-1" /> {sefazActive ? 'Nativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">Integracao ativa via Certificado Digital A1 (upload feito no cadastro da propriedade).</p>
                                    <button className="w-full py-2 border border-green-300 text-green-800 rounded text-sm font-semibold hover:bg-green-100">Verificar Status do Servico</button>
                                </div>

                                {/* AGRODEFESA CARD */}
                                <div className={`border rounded-lg p-5 ${agrodefesaActive ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center">
                                            <div className={`p-2 rounded mr-3 ${agrodefesaActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                                <BuildingIcon className={`h-6 w-6 ${agrodefesaActive ? 'text-green-700' : 'text-slate-600'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Agrodefesa / Indea</h4>
                                                <p className="text-xs text-slate-500">Emissao de GTA</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${agrodefesaActive ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                                            {agrodefesaActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">Requer solicitacao de acesso aos webservices estaduais.</p>
                                    {agrodefesaActive ? (
                                        <div className="flex items-center text-green-700 bg-green-50 p-3 rounded border border-green-100">
                                            <ShieldCheckIcon className="h-5 w-5 mr-2" />
                                            <span className="text-sm font-semibold">Conexao Segura Estabelecida</span>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleRequestIntegration('Agrodefesa')} className="w-full py-2 bg-slate-800 text-white rounded text-sm font-semibold hover:bg-slate-700">Solicitar Ativacao</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREDIT & RISK TAB */}
                    {activeTab === 'CREDIT' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Bureau de Credito e Risco</h3>
                                <p className="text-sm text-slate-500">Conexoes nativas para consulta automatica de CPF/CNPJ e analise ambiental.</p>
                            </div>

                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-4 rounded-lg ${serasaActive ? 'border border-indigo-100 bg-indigo-50' : 'border border-slate-200 bg-white'}`}>
                                    <div className="flex items-center">
                                        <ShieldCheckIcon className={`h-8 w-8 mr-4 ${serasaActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <div>
                                            <h4 className="font-bold text-slate-800">Serasa Experian / SPC</h4>
                                            <p className="text-xs text-slate-500">Monitoramento de Score de Credito em tempo real.</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${serasaActive ? 'text-indigo-700 bg-white border border-indigo-200' : 'text-slate-500 bg-slate-100'}`}>
                                        {serasaActive ? 'Integracao Nativa Ativa' : 'Inativo'}
                                    </span>
                                </div>

                                <div className={`flex items-center justify-between p-4 rounded-lg ${sicarActive ? 'border border-emerald-100 bg-emerald-50' : 'border border-slate-200 bg-white'}`}>
                                    <div className="flex items-center">
                                        <CloudIcon className={`h-8 w-8 mr-4 ${sicarActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <div>
                                            <h4 className="font-bold text-slate-800">SICAR / IBAMA</h4>
                                            <p className="text-xs text-slate-500">Validacao automatica de conformidade ambiental.</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${sicarActive ? 'text-emerald-700 bg-white border border-emerald-200' : 'text-slate-500 bg-slate-100'}`}>
                                        {sicarActive ? 'Integracao Nativa Ativa' : 'Inativo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MARKET DATA TAB */}
                    {activeTab === 'DATA' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Dados de Mercado (Benchmarking)</h3>
                                <p className="text-sm text-slate-500">
                                    O sistema consome automaticamente dados de fontes publicas e parceiros para gerar inteligencia.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-2 flex items-center">
                                        <CloudIcon className="h-5 w-5 mr-2 text-indigo-600" />
                                        Fontes Conectadas
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-600">
                                        {dataSources.map((source) => (
                                            <li key={source} className="flex items-center">
                                                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" /> {source}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex items-center justify-center p-6 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                                    <div>
                                        <p className="font-bold text-indigo-900">Integracao Transparente</p>
                                        <p className="text-xs text-indigo-700 mt-2">Voce nao precisa configurar nada. Os dados sao atualizados diariamente nos dashboards.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PAYMENT TAB (ASAAS) */}
                    {activeTab === 'PAYMENT' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Gateway de Pagamento (Asaas)</h3>
                                    <p className="text-sm text-slate-500">Motor financeiro nativo para Split e Escrow.</p>
                                </div>
                                <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded text-xs font-bold border border-blue-200">
                                    Parceiro Oficial
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-6 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-700 mb-1">Status do Gateway</p>
                                    <div className={`flex items-center ${asaasStatus === 'CONNECTED' ? 'text-green-600' : 'text-slate-500'}`}>
                                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                                        <span className="font-bold text-sm">
                                            {asaasStatus === 'CONNECTED' ? `Operacional (Ambiente de ${asaasEnvironment === 'PRODUCAO' ? 'Producao' : 'Homologacao'})` : 'Indisponivel'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 mb-1">Gerenciado por</p>
                                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-mono">System Admin</span>
                                </div>
                            </div>

                            <div className="space-y-4 opacity-75">
                                <h4 className="font-bold text-slate-700 text-sm uppercase">Recursos Disponiveis</h4>
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <span className="text-sm">Emissao de Boletos</span>
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <span className="text-sm">Cobranca via Pix (QR Code)</span>
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <span className="text-sm">Split de Pagamento (Marketplace)</span>
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* API TAB */}
                    {activeTab === 'API' && (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 animate-fade-in">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Ciclo+ Open API (Desenvolvedores)</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Area restrita para criacao de chaves de acesso. Somente usuarios com perfil de desenvolvedor ou administrador podem gerar tokens.
                            </p>

                            <div className="bg-slate-100 p-6 rounded-lg text-center border border-slate-200">
                                <LockClosedIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <h4 className="font-bold text-slate-700">Acesso Restrito</h4>
                                <p className="text-sm text-slate-500 mb-4">Para integrar sistemas externos personalizados, solicite uma credencial de API ao nosso time.</p>
                                <button className="px-6 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900">Solicitar Credencial API</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntegrationsView;
