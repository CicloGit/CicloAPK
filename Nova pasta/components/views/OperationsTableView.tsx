import React, { useEffect, useState } from 'react';
import { Operation } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import { operationsTableService } from '../../services/operationsTableService';

const OperationsTableView: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadOperations = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await operationsTableService.listOperations();
        setOperations(data);
      } catch {
        setLoadError('Nao foi possivel carregar a tabela de operacoes.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOperations();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Carregando operacoes..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Tabela de Operacoes v1</h2>
      <p className="text-slate-600 mb-8">Detalhes sobre cada operacao, perfil de usuario, regras de negocio, evidencias necessarias e os efeitos no sistema.</p>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-200">
            <tr>
              <th scope="col" className="px-6 py-3">Operacao (UI/API)</th>
              <th scope="col" className="px-6 py-3">Perfil</th>
              <th scope="col" className="px-6 py-3">Entidade</th>
              <th scope="col" className="px-6 py-3">Regra de Bloqueio</th>
              <th scope="col" className="px-6 py-3">Evidencia</th>
              <th scope="col" className="px-6 py-3">Efeito em Estados/Financeiro</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op, index) => (
              <tr key={index} className="bg-white border-b hover:bg-slate-50">
                <th scope="row" className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                  {op.operation}
                </th>
                <td className="px-6 py-4">{op.profile}</td>
                <td className="px-6 py-4 font-mono text-indigo-600">{op.entity}</td>
                <td className="px-6 py-4">{op.rule}</td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${op.evidence.includes('Tipo B') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {op.evidence}
                    </span>
                </td>
                <td className="px-6 py-4">{op.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OperationsTableView;
