import React, { useEffect, useState } from 'react';
import { Contract, ContractStatus } from '../../../types';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { contractsService } from '../../../services/contractsService';

const StatusBadge: React.FC<{ status: ContractStatus }> = ({ status }) => {
    const statusStyles: Record<ContractStatus, string> = {
        'VIGENTE': 'bg-green-100 text-green-800',
        'RENOVAR': 'bg-yellow-100 text-yellow-800',
        'ENCERRADO': 'bg-slate-100 text-slate-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const ContractsView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);

    useEffect(() => {
        const loadContracts = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const data = await contractsService.listContracts();
                setContracts(data);
            } catch {
                setLoadError('Nao foi possivel carregar os contratos.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadContracts();
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    if (isLoading) {
        return <LoadingSpinner text="Carregando contratos..." />;
    }

    if (loadError) {
        return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Meus Contratos</h2>
            <p className="text-slate-600 mb-8">Visualize e gerencie seus contratos de producao e venda.</p>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th className="px-6 py-3">Descricao do Contrato</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Prazo Final</th>
                                <th className="px-6 py-3">Historico de Entregas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map((contract) => (
                                <tr key={contract.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="px-6 py-4 font-semibold text-slate-800">{contract.description}</td>
                                    <td className="px-6 py-4">{formatCurrency(contract.value)}</td>
                                    <td className="px-6 py-4"><StatusBadge status={contract.status} /></td>
                                    <td className="px-6 py-4">{contract.deadline}</td>
                                    <td className="px-6 py-4">
                                        {contract.deliveryHistory.length > 0 ? (
                                            <ul className="text-xs text-slate-500">
                                                {contract.deliveryHistory.map((delivery, i) => (
                                                    <li key={i}>{delivery.date}: {delivery.quantity}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-xs text-slate-400">Nenhuma entrega registrada</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContractsView;
