import React from 'react';
import { architectureNodes } from '../constants';
import { ArchitectureNode } from '../types';

const NodeCard: React.FC<{ node: ArchitectureNode; color: string }> = ({ node, color }) => (
  <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${color}`}>
    <h3 className="text-lg font-bold text-slate-800">{node.label}</h3>
    <p className="text-sm text-slate-600">{node.description}</p>
  </div>
);

const ArchitectureView: React.FC = () => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Visao Geral da Arquitetura</h2>
      <p className="text-slate-600 mb-8">
        Uma representacao visual dos principais componentes do sistema Ciclo+ conforme o diagrama Mermaid (FIG. 1).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-700 text-center">{architectureNodes.CH.label}</h3>
          {architectureNodes.CH.children.map((node) => (
            <NodeCard key={node.id} node={node} color="border-sky-500" />
          ))}
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-slate-700">{architectureNodes.CORE.label}</h3>
            <p className="text-sm text-slate-500">Fluxo principal</p>
          </div>
          {architectureNodes.CORE.children.map((node) => (
            <NodeCard key={node.id} node={node} color="border-emerald-500" />
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-700 text-center">{architectureNodes.MOD.label}</h3>
          {architectureNodes.MOD.children.map((node) => (
            <NodeCard key={node.id} node={node} color="border-indigo-500" />
          ))}
        </div>
      </div>

      <div className="mt-12 p-6 bg-slate-800 text-white rounded-lg shadow-lg">
        <h4 className="text-lg font-bold mb-2">Fluxo de Dados</h4>
        <div className="font-mono text-sm space-y-2 text-slate-300">
          <div>CH -&gt; A -&gt; B -&gt; C -&gt; D -&gt; E</div>
          <div className="pl-4">-&gt; E -(valido)-&gt; F -&gt; G -&gt; H -&gt; I</div>
          <div className="pl-4">-&gt; E -(invalido)-&gt; G</div>
          <div className="pl-8">-&gt; G -&gt; Modulos (M1-M7)</div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Este fluxo demonstra como as interacoes do canal passam pelo nucleo do sistema, executam regras, mudam de
          estado e, finalmente, interagem com os modulos habilitaveis apos a auditoria.
        </p>
      </div>
    </div>
  );
};

export default ArchitectureView;
