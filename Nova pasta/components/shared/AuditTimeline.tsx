
import React from 'react';
import { AuditEvent } from '../../types';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import LockClosedIcon from '../icons/LockClosedIcon';

interface AuditTimelineProps {
    events: AuditEvent[];
    compact?: boolean;
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({ events, compact = false }) => {
    return (
        <div className={`bg-white rounded-lg shadow-md ${compact ? 'p-4' : 'p-6'}`}>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <LockClosedIcon className="h-5 w-5 mr-2 text-emerald-600" />
                Trilha de Auditoria Imutável (Blockchain)
            </h3>
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                {events.map((event) => (
                    <div key={event.id} className="ml-6 relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[31px] top-0 bg-white border-2 border-emerald-500 rounded-full w-4 h-4"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        {event.action}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">{event.timestamp}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800">{event.details}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    <span className="font-bold">Operador:</span> {event.actor}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                                    <span>Geo: {event.geolocation}</span>
                                    <span className="hidden sm:inline">|</span>
                                    <span className="truncate max-w-[100px] sm:max-w-none">Hash: {event.hash}</span>
                                    {event.verified && <CheckCircleIcon className="h-3 w-3 text-emerald-500" />}
                                </div>
                            </div>
                            
                            {/* Evidence Photo */}
                            {event.proofUrl && (
                                <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                    <div className="relative group cursor-pointer">
                                        <img 
                                            src={event.proofUrl} 
                                            alt="Prova de execução" 
                                            className="w-16 h-16 object-cover rounded-md border border-slate-300 group-hover:opacity-75 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                            <span className="bg-black/50 text-white text-[10px] px-1 rounded">Ver</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-center text-slate-400 mt-1">Prova Digital</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditTimeline;
