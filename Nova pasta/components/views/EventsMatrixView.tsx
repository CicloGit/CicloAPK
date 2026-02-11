import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { EventMatrixModule } from '../../types';
import { eventsMatrixService } from '../../services/eventsMatrixService';

const EvidenceTag: React.FC<{ type: string }> = ({ type }) => {
    let colorClasses = 'bg-slate-100 text-slate-800';
    if (type.includes('Tipo A')) {
        colorClasses = 'bg-green-100 text-green-800';
    } else if (type.includes('Tipo B')) {
        colorClasses = 'bg-orange-100 text-orange-800';
    } else if (type.includes('Webhook')) {
        colorClasses = 'bg-cyan-100 text-cyan-800';
    } else if (type.includes('Assinatura') || type.includes('Documento')) {
        colorClasses = 'bg-indigo-100 text-indigo-800';
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClasses}`}>
            {type}
        </span>
    );
};


const EventsMatrixView: React.FC = () => {
    const [modules, setModules] = useState<EventMatrixModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const loadModules = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await eventsMatrixService.listModules();
                setModules(data);
            } catch {
                setLoadError('Nao foi possivel carregar a matriz de eventos.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadModules();
    }, []);

    if (isLoading) {
        return <LoadingSpinner text="Carregando matriz..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Matriz Central de Eventos</h2>
            <p className="text-slate-600 mb-8">A "fonte unica da verdade" que conecta eventos do sistema a regras, locks, evidencias e estados.</p>

            <div className="space-y-12">
                {modules.map((moduleData) => (
                    <div key={moduleData.title} className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{moduleData.title}</h3>
                        {moduleData.description && <p className="text-sm text-slate-500 mb-4">{moduleData.description}</p>}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Evento</th>
                                        <th scope="col" className="px-4 py-3">Regras (Rulesets)</th>
                                        <th scope="col" className="px-4 py-3">Locks Possiveis</th>
                                        <th scope="col" className="px-4 py-3">Evidencia</th>
                                        <th scope="col" className="px-4 py-3">Maquina de Estados</th>
                                        <th scope="col" className="px-4 py-3">Colecoes Afetadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moduleData.events.map((event, index) => (
                                        <tr key={index} className="border-b hover:bg-slate-50">
                                            <th scope="row" className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap font-mono">
                                                {event.event}
                                            </th>
                                            <td className="px-4 py-4 text-xs">{event.rules}</td>
                                            <td className="px-4 py-4">{event.locks}</td>
                                            <td className="px-4 py-4">
                                                <EvidenceTag type={event.evidence} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded-md text-xs">{event.stateMachine}</span>
                                            </td>
                                            <td className="px-4 py-4 text-xs font-mono">{event.collections}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventsMatrixView;
