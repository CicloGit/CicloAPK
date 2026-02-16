import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowLeftIcon from '../../icons/ArrowLeftIcon';
import CheckCircleIcon from '../../icons/CheckCircleIcon';
import LockClosedIcon from '../../icons/LockClosedIcon';
import ArrowDownIcon from '../../icons/ArrowDownIcon';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { Receivable } from '../../../types';
import { financialService, financialSplitConfig } from '../../../services/financialService';
import { useToast } from '../../../contexts/ToastContext';

const AccountControlView: React.FC = () => {
  const { addToast } = useToast();
  const { receivableId } = useParams<{ receivableId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    const loadReceivable = async () => {
      if (!receivableId) {
        setReceivable(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await financialService.getReceivableById(receivableId);
        setReceivable(data);
      } finally {
        setIsLoading(false);
      }
    };

    void loadReceivable();
  }, [receivableId]);

  if (isLoading) {
    return <LoadingSpinner text="Carregando liquidacao..." />;
  }

  if (!receivable) {
    return <div className="text-center p-8">Recebivel nao encontrado.</div>;
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const allStepsCompleted = receivable.liquidationFlow?.steps.every((step) => step.completed) ?? false;
  const platformFee = receivable.value * financialSplitConfig.platformFeeRate;
  const logisticsCost = receivable.value * financialSplitConfig.logisticsRate;
  const producerShare = receivable.value - platformFee - logisticsCost;

  const handleReleasePayment = async () => {
    if (!receivable || !allStepsCompleted || isReleasing) {
      return;
    }
    setIsReleasing(true);
    try {
      await financialService.markReceivableAsLiquidated(receivable.id);
      setReceivable({ ...receivable, status: 'LIQUIDADO' });
      addToast({ type: 'success', title: 'Pagamento liberado', message: 'Recebivel liquidado no Firebase.' });
    } catch {
      addToast({ type: 'error', title: 'Falha ao liberar', message: 'Nao foi possivel liquidar o recebivel.' });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Voltar
      </button>
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Controle da Conta e Liquidacao</h2>
        <p className="text-slate-600 mb-8">
          Recebivel: <span className="font-semibold text-indigo-700">{receivable.origin} (#{receivable.id})</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-6 rounded-lg border">
            <h3 className="text-xl font-bold mb-4">Etapas de Liquidacao</h3>
            <ol className="space-y-4">
              {receivable.liquidationFlow?.steps.map((step, index) => (
                <li key={index} className="flex items-start">
                  {step.completed ? (
                    <CheckCircleIcon className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <LockClosedIcon className="h-6 w-6 text-slate-400 flex-shrink-0" />
                  )}
                  <p className={`ml-3 font-semibold ${step.completed ? 'text-slate-700' : 'text-slate-500'}`}>{step.name}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border">
            <h3 className="text-xl font-bold mb-4">Fluxo do Pagamento</h3>
            <div className="space-y-4 text-center">
              <div>
                <p className="text-sm">Valor Total em Escrow</p>
                <p className="text-2xl font-bold">{formatCurrency(receivable.value)}</p>
              </div>
              <ArrowDownIcon className="h-6 w-6 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold mb-2">Split de Pagamento</p>
                <div className="space-y-2 text-left p-4 bg-white rounded-md border">
                  <div className="flex justify-between text-sm">
                    <span>- Subconta Produtor:</span>
                    <span className="font-bold text-green-600">{formatCurrency(producerShare)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>- Subconta Plataforma:</span>
                    <span className="font-bold">{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>- Subconta Logistica:</span>
                    <span className="font-bold">{formatCurrency(logisticsCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end">
          <button
            onClick={handleReleasePayment}
            disabled={!allStepsCompleted || isReleasing || receivable.status === 'LIQUIDADO'}
            className={`px-8 py-3 text-sm font-semibold text-white rounded-lg ${allStepsCompleted ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-400 cursor-not-allowed'} disabled:opacity-60`}
          >
            {receivable.status === 'LIQUIDADO'
              ? 'Pagamento Liberado'
              : isReleasing
              ? 'Liberando...'
              : allStepsCompleted
              ? 'Liberar Pagamento'
              : 'Aguardando Validacao'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountControlView;
