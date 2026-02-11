
import React from 'react';
import { operations } from '../constants';
import { Operation } from '../types';

const OperationsTableView: React.FC = () => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Tabela de Operações v1</h2>
      <p className="text-slate-600 mb-8">Detalhes sobre cada operação, perfil de usuário, regras de negócio, evidências necessárias e os efeitos no sistema.</p>
      
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-200">
            <tr>
              <th scope="col" className="px-6 py-3">Operação (UI/API)</th>
              <th scope="col" className="px-6 py-3">Perfil</th>
              <th scope="col" className="px-6 py-3">Entidade</th>
              <th scope="col" className="px-6 py-3">Regra de Bloqueio</th>
              <th scope="col" className="px-6 py-3">Evidência</th>
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
