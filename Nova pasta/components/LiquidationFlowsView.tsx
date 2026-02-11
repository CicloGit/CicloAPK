
import React from 'react';
import { liquidationFlows } from '../constants';
import { LiquidationFlow } from '../types';

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const FlowCard: React.FC<{ flow: LiquidationFlow, index: number }> = ({ flow, index }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-xl font-bold text-slate-800 mb-2">{flow.title}</h3>
    <p className="text-sm text-slate-600 mb-6">{flow.description}</p>
    <ol className="space-y-4">
      {flow.steps.map((step, stepIndex) => (
        <li key={stepIndex} className="flex items-start">
          <div className="flex-shrink-0">
            <CheckIcon className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-slate-700">{step.name}</p>
          </div>
        </li>
      ))}
    </ol>
  </div>
);


const LiquidationFlowsView: React.FC = () => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Fluxos de Liquidação v1</h2>
      <p className="text-slate-600 mb-8">Visualização dos fluxos de liquidação por marcos, detalhando as etapas e condições para liberação de valores.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {liquidationFlows.map((flow, index) => (
          <FlowCard key={index} flow={flow} index={index} />
        ))}
      </div>
    </div>
  );
};

export default LiquidationFlowsView;
