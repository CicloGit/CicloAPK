import React, { useEffect, useState } from 'react';
import { DataEntity } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import { dataDictionaryService } from '../../services/dataDictionaryService';

const DataDictionaryView: React.FC = () => {
  const [entities, setEntities] = useState<DataEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntities = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await dataDictionaryService.listEntities();
        setEntities(data);
      } catch {
        setLoadError('Nao foi possivel carregar o dicionario de dados.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadEntities();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Carregando dicionario..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Dicionario de Dados</h2>
      <p className="text-slate-600 mb-8">Entidades tenantizadas e campos minimos do ciclo Marketplace + Venda Mercado Consumidor.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {entities.map((entity) => (
          <div key={entity.name} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-indigo-700">{entity.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{entity.description}</p>
              <ul className="space-y-1.5">
                {entity.fields.map((field) => (
                  <li key={field} className="text-sm text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataDictionaryView;
