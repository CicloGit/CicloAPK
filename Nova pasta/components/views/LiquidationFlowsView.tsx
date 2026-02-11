import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { LiquidationFlow } from '../../types';
import { liquidationFlowsService } from '../../services/liquidationFlowsService';

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
  const [flows, setFlows] = useState<LiquidationFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadFlows = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await liquidationFlowsService.listFlows();
        setFlows(data);
      } catch {
        setLoadError('Nao foi possivel carregar os fluxos de liquidacao.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFlows();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Carregando fluxos..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Fluxos de Liquidacao v1</h2>
      <p className="text-slate-600 mb-8">Visualizacao dos fluxos de liquidacao por marcos, detalhando as etapas e condicoes para liberacao de valores.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {flows.map((flow, index) => (
          <FlowCard key={index} flow={flow} index={index} />
        ))}
      </div>
    </div>
  );
};

export default LiquidationFlowsView;
