import React, { useEffect, useMemo, useState } from 'react';
import { Contract, ContractStatus } from '../../../types';
import LoadingSpinner from '../../shared/LoadingSpinner';
import { contractsService } from '../../../services/contractsService';
import { storageService } from '../../../services/storageService';
import { useApp } from '../../../contexts/AppContext';

const StatusBadge: React.FC<{ status: ContractStatus }> = ({ status }) => {
  const statusStyles: Record<ContractStatus, string> = {
    VIGENTE: 'bg-green-100 text-green-800',
    RENOVAR: 'bg-yellow-100 text-yellow-800',
    ENCERRADO: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const ContractsView: React.FC = () => {
  const { currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const loadContracts = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await contractsService.listContracts();
        setContracts(data);
        setSelectedContractId(data[0]?.id ?? null);
      } catch {
        setLoadError('Nao foi possivel carregar os contratos.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadContracts();
  }, []);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleUploadOriginal = async () => {
    if (!selectedContract || !selectedFile) {
      setUploadError('Selecione um contrato e um arquivo antes de enviar.');
      return;
    }

    const tenantId = currentUser?.tenantId;
    if (!tenantId) {
      setUploadError('Tenant do usuario nao identificado para registrar o arquivo.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploaded = await storageService.uploadContractOriginal(selectedFile, tenantId, selectedContract.id);
      await contractsService.attachOriginalFile(selectedContract.id, {
        originalFileUrl: uploaded.url,
        originalFileName: selectedFile.name,
        originalFileHash: uploaded.hash,
      });

      setContracts((prev) =>
        prev.map((contract) =>
          contract.id === selectedContract.id
            ? {
                ...contract,
                originalFileUrl: uploaded.url,
                originalFileName: selectedFile.name,
                originalFileHash: uploaded.hash,
              }
            : contract
        )
      );
      setSelectedFile(null);
    } catch {
      setUploadError('Nao foi possivel registrar o arquivo original no contrato.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando contratos..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Gestao de Contratos</h2>
      <p className="text-slate-600 mb-8">Abra detalhes de cada contrato e mantenha o arquivo original anexado.</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                <tr>
                  <th className="px-6 py-3">Contrato</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Prazo</th>
                  <th className="px-6 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`border-b last:border-b-0 hover:bg-slate-50 ${
                      selectedContractId === contract.id ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">{contract.description}</td>
                    <td className="px-6 py-4">{formatCurrency(contract.value)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-6 py-4">{contract.deadline}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedContractId(contract.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
                      >
                        Abrir detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          {!selectedContract ? (
            <p className="text-sm text-slate-500">Selecione um contrato para visualizar detalhes.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedContract.description}</h3>
                <p className="text-sm text-slate-500">ID: {selectedContract.id}</p>
              </div>

              <div className="text-sm text-slate-700 space-y-1">
                <p><span className="font-semibold">Valor:</span> {formatCurrency(selectedContract.value)}</p>
                <p><span className="font-semibold">Prazo final:</span> {selectedContract.deadline}</p>
                <p><span className="font-semibold">Status:</span> {selectedContract.status}</p>
                {selectedContract.counterparty && <p><span className="font-semibold">Contraparte:</span> {selectedContract.counterparty}</p>}
                {selectedContract.signedAt && <p><span className="font-semibold">Assinado em:</span> {selectedContract.signedAt}</p>}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">Historico de entregas</p>
                {selectedContract.deliveryHistory.length > 0 ? (
                  <ul className="space-y-1 text-sm text-slate-600">
                    {selectedContract.deliveryHistory.map((delivery, index) => (
                      <li key={`${delivery.date}-${index}`} className="p-2 bg-slate-50 rounded border border-slate-100">
                        {delivery.date}: {delivery.quantity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">Nenhuma entrega registrada.</p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">Arquivo original do contrato</p>
                {selectedContract.originalFileUrl ? (
                  <div className="space-y-1 text-sm">
                    <a
                      href={selectedContract.originalFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-700 hover:underline font-semibold break-all"
                    >
                      {selectedContract.originalFileName ?? 'Abrir arquivo original'}
                    </a>
                    {selectedContract.originalFileHash && (
                      <p className="text-xs text-slate-500 break-all">Hash: {selectedContract.originalFileHash}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhum arquivo original anexado.</p>
                )}

                <div className="space-y-2">
                  <input
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <button
                    onClick={() => void handleUploadOriginal()}
                    disabled={!selectedFile || isUploading}
                    className="w-full px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isUploading ? 'Enviando arquivo...' : 'Registrar arquivo original'}
                  </button>
                  {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractsView;
