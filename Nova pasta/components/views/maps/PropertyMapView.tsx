
import React, { useState } from 'react';
import { Property, Pasture, MapInfrastructure, Machinery } from '../../../types';
import ExclamationIcon from '../../icons/ExclamationIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';

const LayerToggle: React.FC<{ label: string; color: string; checked: boolean; onChange: () => void }> = ({ label, color, checked, onChange }) => (
    <label className="flex items-center justify-between p-2 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600">
        <div className="flex items-center">
            <span className={`w-3 h-3 rounded-sm mr-2 ${color}`}></span>
            <span className="text-sm text-slate-200">{label}</span>
        </div>
        <input 
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="form-checkbox h-4 w-4 text-emerald-500 rounded focus:ring-offset-slate-800 focus:ring-emerald-500 bg-slate-600 border-slate-500"
        />
    </label>
);

interface PropertyMapViewProps {
    property: Property;
    pastures: Pasture[];
}

const PropertyMapView: React.FC<PropertyMapViewProps> = ({ property, pastures }) => {
    const [selectedPasture, setSelectedPasture] = useState<Pasture | null>(null);
    const [layers, setLayers] = useState({
        sicar: true,
        pastures: true,
        infra: true,
        machinery: true,
    });

    const toggleLayer = (layer: keyof typeof layers) => {
        setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    const getDistanceStatus = (pasture: Pasture) => {
        if (pasture.id === 'pasto02') return { status: 'WARNING', distance: 1200, message: 'Distância da água > 1km' };
        return { status: 'OK', distance: 450, message: 'Acesso à água adequado' };
    };

    const renderPerimeter = () => {
        if (!property.perimeter) return null;
        const points = property.perimeter.map(p => `${p.x},${p.y}`).join(' ');
        
        return (
            <polygon 
                points={points} 
                fill="none" 
                stroke="#FBBF24"
                strokeWidth="0.8" 
                strokeDasharray="2,1"
            />
        );
    };

    const renderPolygon = (pasture: Pasture) => {
        if (!pasture.polygon) return null;
        const points = pasture.polygon.map(p => `${p.x},${p.y}`).join(' ');
        
        const isSelected = selectedPasture?.id === pasture.id;
        const fillColor = isSelected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        const strokeColor = isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.8)';

        return (
            <g key={pasture.id} onClick={() => setSelectedPasture(pasture)} className="cursor-pointer group">
                <polygon 
                    points={points} 
                    fill={fillColor} 
                    stroke={strokeColor} 
                    strokeWidth={isSelected ? "0.6" : "0.3"}
                    className="transition-all duration-300 hover:fill-white/20"
                />
                {pasture.center && (
                    <text 
                        x={pasture.center.x} 
                        y={pasture.center.y} 
                        fontSize="2" 
                        fill="white" 
                        textAnchor="middle" 
                        alignmentBaseline="middle" 
                        fontWeight="bold"
                        className="pointer-events-none"
                        style={{ textShadow: '0 0 4px black' }}
                    >
                        {pasture.name.split(' ')[1]}
                    </text>
                )}
            </g>
        );
    };

    const renderInfrastructure = (infra: MapInfrastructure) => {
        const iconColor = infra.type === 'Water' ? '#3b82f6' : '#9ca3af';
        return (
            <g key={infra.id}>
                <circle cx={infra.position.x} cy={infra.position.y} r="1.2" fill={iconColor} stroke="white" strokeWidth="0.3" />
            </g>
        );
    };

    const renderMachinery = (machine: Machinery) => {
        const color = machine.type === 'Drone' ? '#8b5cf6' : '#f97316';
        return (
            <g key={machine.id}>
                <circle cx={machine.position.x} cy={machine.position.y} r="3" fill={color} opacity="0.3">
                    <animate attributeName="r" from="1" to="4" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={machine.position.x} cy={machine.position.y} r="1.5" fill={color} stroke="white" strokeWidth="0.5" />
            </g>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row h-[600px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            {/* Sidebar Info Panel */}
            <div className="w-full lg:w-1/4 bg-slate-800 p-4 border-b lg:border-b-0 lg:border-r border-slate-700 overflow-y-auto">
                <h3 className="text-white font-bold text-lg mb-4">Central de Controle Geo</h3>
                
                <div className="mb-6 space-y-2">
                    <p className="text-xs text-slate-400 uppercase font-bold">Camadas (Layers)</p>
                    <LayerToggle label="Perímetro (CAR/SICAR)" color="bg-amber-400" checked={layers.sicar} onChange={() => toggleLayer('sicar')} />
                    <LayerToggle label="Divisão de Pastos" color="bg-green-500" checked={layers.pastures} onChange={() => toggleLayer('pastures')} />
                    <LayerToggle label="Infraestrutura" color="bg-blue-500" checked={layers.infra} onChange={() => toggleLayer('infra')} />
                    <LayerToggle label="Maquinário" color="bg-orange-500" checked={layers.machinery} onChange={() => toggleLayer('machinery')} />
                </div>

                {selectedPasture ? (
                    <div className="animate-fade-in border-t border-slate-700 pt-4">
                        <div className="p-3 bg-slate-700 rounded-lg mb-4 border-l-4 border-emerald-500">
                            <h4 className="text-white font-bold text-lg">{selectedPasture.name}</h4>
                            <p className="text-slate-300 text-sm">{selectedPasture.area} hectares</p>
                            <p className="text-slate-400 text-xs mt-1">Capim: {selectedPasture.cultivar}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Distância da Água</p>
                                {(() => {
                                    const status = getDistanceStatus(selectedPasture);
                                    return (
                                        <div className={`flex items-center text-sm ${status.status === 'WARNING' ? 'text-red-400' : 'text-green-400'}`}>
                                            {status.status === 'WARNING' ? <ExclamationIcon className="h-4 w-4 mr-2" /> : <CheckCircleIcon className="h-4 w-4 mr-2" />}
                                            {status.distance}m - {status.message}
                                        </div>
                                    )
                                })()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Lotação Atual</p>
                                <p className="text-white text-sm">{selectedPasture.animals.length} Animais ({selectedPasture.stockingRate})</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm text-center mt-4 border-t border-slate-700 pt-4">
                        <p className="mb-2">📍</p>
                        Selecione um talhão no mapa para ver os detalhes.
                    </div>
                )}
            </div>

            {/* Map Area */}
            <div className="relative flex-1 bg-neutral-900 overflow-hidden group">
                {property.satelliteImageUrl ? (
                    <img 
                        src={property.satelliteImageUrl} 
                        alt="Mapa de Satélite" 
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-neutral-800"></div>
                )}
                
                <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="none">
                    {layers.sicar && renderPerimeter()}
                    {layers.pastures && pastures.map(renderPolygon)}
                    {layers.infra && property.infrastructure?.map(renderInfrastructure)}
                    {layers.machinery && property.machinery?.map(renderMachinery)}
                </svg>

                <div className="absolute bottom-4 left-4 bg-slate-900/80 p-2 rounded-lg text-white text-[10px] backdrop-blur-sm border border-slate-700 shadow-xl z-20">
                    Fonte da Imagem: Satélite (Simulado) & Overlays Vetoriais Ciclo+
                </div>
            </div>
        </div>
    );
};

export default PropertyMapView;
