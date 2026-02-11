import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { systemConfigService, SystemConfigEntry, SystemConfigKey } from '../../services/systemConfigService';

type ConfigTab = SystemConfigKey;

const CodeBlock: React.FC<{ content: object | string }> = ({ content }) => (
    <pre className="bg-slate-800 text-slate-200 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        {typeof content === 'string' ? content.trim() : JSON.stringify(content, null, 2)}
    </pre>
);

const SystemConfigView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('events');
    const [configs, setConfigs] = useState<SystemConfigEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadConfigs = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await systemConfigService.listConfigs();
                setConfigs(data);
            } catch {
                setLoadError('Nao foi possivel carregar as configuracoes do sistema.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadConfigs();
    }, []);

    const configMap = useMemo(() => {
        return configs.reduce<Record<string, object | string>>((acc, config) => {
            acc[config.id] = config.content;
            return acc;
        }, {});
    }, [configs]);

    const renderContent = () => {
        const content = configMap[activeTab];
        if (!content) {
            return <div className="p-6 text-slate-500">Nenhuma configuracao encontrada.</div>;
        }
        return <CodeBlock content={content} />;
    };

    const TabButton: React.FC<{ tab: ConfigTab, label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
        >
            {label}
        </button>
    );

    if (isLoading) {
        return <LoadingSpinner text="Carregando configuracoes..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Configuracao do Sistema (Fonte Unica)</h2>
            <p className="text-slate-600 mb-8">Visualizacao dos arquivos de configuracao canonicos que governam o comportamento do Kernel.</p>

            <div className="mb-6 flex flex-wrap gap-2 p-1 bg-slate-200 rounded-lg">
                <TabButton tab="events" label="Eventos" />
                <TabButton tab="stateMachines" label="Maquinas de Estado" />
                <TabButton tab="permissions" label="Permissoes" />
                <TabButton tab="firestore" label="Regras Firestore" />
                <TabButton tab="openapi" label="API (OpenAPI)" />
                <TabButton tab="enums" label="Enums (TS)" />
            </div>

            <div className="bg-white rounded-lg shadow-md p-2">
               {renderContent()}
            </div>
        </div>
    );
};

export default SystemConfigView;
