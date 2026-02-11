
import React, { useState } from 'react';
import { AnimalProductionDetails, Pasture, Animal, AnimalStatus } from '../../../types';
import DNAIcon from '../../icons/DNAIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
);

const AnimalStatusBadge: React.FC<{ status: AnimalStatus | null }> = ({ status }) => {
    if (!status) return null;

    const statusStyles: Record<AnimalStatus, string> = {
        'Protocolada': 'bg-blue-100 text-blue-800',
        'Inseminada': 'bg-purple-100 text-purple-800',
        'Prenhez Confirmada': 'bg-yellow-100 text-yellow-800',
        'Gestação Final': 'bg-orange-100 text-orange-800 font-bold',
        'Com Cria': 'bg-green-100 text-green-800',
        'Vazia': 'bg-slate-100 text-slate-800',
    };

    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
};


interface AnimalProductionDetailProps {
  details: AnimalProductionDetails;
}

const AnimalProductionDetail: React.FC<AnimalProductionDetailProps> = ({ details: initialDetails }) => {
    const [openPasture, setOpenPasture] = useState<string | null>(initialDetails.pastures[0]?.id || null);
    const [details, setDetails] = useState(initialDetails);

    const handleTogglePasture = (pastureId: string) => {
        setOpenPasture(prev => (prev === pastureId ? null : pastureId));
    };

    const handleRegisterBirth = (pastureId: string, mother: Animal) => {
        setDetails(prevDetails => {
            const newDetails = JSON.parse(JSON.stringify(prevDetails));
            const pasture = newDetails.pastures.find((p: Pasture) => p.id === pastureId);
            if (!pasture) return prevDetails;

            const motherInPasture = pasture.animals.find((a: Animal) => a.id === mother.id);
            if (!motherInPasture) return prevDetails;
            
            // Count existing children to create a unique ID
            const childCount = pasture.animals.filter((a: Animal) => a.motherId === mother.id).length;
            const newCalf: Animal = {
                id: `${mother.id}-C${childCount + 1}`,
                motherId: mother.id,
                category: 'Bezerro',
                status: null,
            };

            // Add new calf and update mother's status
            pasture.animals.push(newCalf);
            motherInPasture.status = 'Com Cria';

            return newDetails;
        });
    };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center text-green-700 mb-4">
        <DNAIcon className="h-6 w-6" />
        <h3 className="text-xl font-bold ml-3">Manejo de Pastos e Rebanho</h3>
      </div>
      <p className="text-slate-600 mb-6 text-sm">Visualize a localização de cada animal e gerencie o ciclo reprodutivo das matrizes.</p>

      <div className="space-y-2">
        {details.pastures.map(pasture => (
          <div key={pasture.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => handleTogglePasture(pasture.id)}
              className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 focus:outline-none"
            >
              <span className="font-bold text-slate-700">{pasture.name} ({pasture.animals.length} animais)</span>
              <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform ${openPasture === pasture.id ? 'rotate-180' : ''}`} />
            </button>
            {openPasture === pasture.id && (
              <div className="p-4 border-t">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-500">
                            <tr>
                                <th className="p-2">ID Animal</th>
                                <th className="p-2">Categoria</th>
                                <th className="p-2">Status Reprodutivo</th>
                                <th className="p-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pasture.animals.map(animal => (
                                <tr key={animal.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="p-2 font-mono text-slate-800">{animal.id}</td>
                                    <td className="p-2 text-slate-600">{animal.category}</td>
                                    <td className="p-2"><AnimalStatusBadge status={animal.status} /></td>
                                    <td className="p-2 text-right">
                                        {animal.category === 'Matriz' && animal.status === 'Gestação Final' && (
                                            <button 
                                                onClick={() => handleRegisterBirth(pasture.id, animal)}
                                                className="flex items-center justify-end ml-auto px-3 py-1 text-xs font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 transition-colors"
                                            >
                                                <PlusCircleIcon className="h-4 w-4 mr-1" />
                                                Registrar Nascimento
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimalProductionDetail;
