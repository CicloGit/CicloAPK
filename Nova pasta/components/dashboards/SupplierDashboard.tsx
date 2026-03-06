import React, { useEffect, useMemo, useState } from 'react';
import { CubeIcon } from '../icons/CubeIcon';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TruckIcon from '../icons/TruckIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { supplierService } from '../../services/supplierService';
import { commercialService } from '../../services/commercialService';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import {
  MarketplaceListing,
  SupplierExternalProductPayload,
  SupplierFinancialSummary,
  SupplierOrder,
  SupplierOrderStatus,
  SupplierPdvConnector,
} from '../../types';
import { EvidencePayload } from '../../services/backendApi';

type SupplierTab = 'OVERVIEW' | 'PRODUCTS' | 'ORDERS' | 'FINANCE' | 'INTEGRATION';
type DispatchEvidenceType = 'QR_CODE' | 'PHOTO' | 'VIDEO';

const StatusBadge: React.FC<{ status: SupplierOrderStatus }> = ({ status }) => {
  const styles: Record<SupplierOrderStatus, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-800 animate-pulse',
    ENVIADO: 'bg-blue-100 text-blue-800',
    ENTREGUE: 'bg-green-100 text-green-800',
  };
  return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>;
};

const formatTimestamp = (value: string | undefined): string => {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('pt-BR');
};

const SupplierDashboard: React.FC = () => {
  const { currentUser } = useApp();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<SupplierTab>('OVERVIEW');
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [financials, setFinancials] = useState<SupplierFinancialSummary[]>([]);
  const [products, setProducts] = useState<MarketplaceListing[]>([]);
  const [connector, setConnector] = useState<SupplierPdvConnector | null>(null);
  const [connectorHistory, setConnectorHistory] = useState<
    Array<{ id: string; imported: number; failed: number; createdAt: string; immutableAuditHash?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [dispatchEvidenceType, setDispatchEvidenceType] = useState<DispatchEvidenceType>('QR_CODE');
  const [dispatchEvidenceReference, setDispatchEvidenceReference] = useState('');

  const [isSavingConnector, setSavingConnector] = useState(false);
  const [connectorForm, setConnectorForm] = useState({
    providerName: 'ERP Integrado',
    baseUrl: '',
    apiKey: '',
    routeOffersToPdv: true,
    autoImportEnabled: true,
    evidenceReference: '',
  });
  const [batchEvidenceReference, setBatchEvidenceReference] = useState('');
  const [batchPayload, setBatchPayload] = useState(`[
  {
    "externalId": "ERP-001",
    "name": "Racao Premium 24%",
    "category": "Racao",
    "unit": "kg",
    "price": 3.9,
    "stock": 12000,
    "region": "GO",
    "sectorHint": "Suinocultura",
    "evidenceReference": "QR-ERP-001"
  }
]`);
  const [isImportingBatch, setImportingBatch] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const userId = currentUser?.uid ?? '';
  const actor = currentUser?.name ?? 'Fornecedor';
  const supplierName = currentUser?.name ?? 'Fornecedor ERP';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const loadSupplier = async () => {
    if (!currentUser?.uid) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedOrders, loadedFinancials, loadedProducts, loadedConnector, loadedHistory] = await Promise.all([
        supplierService.listOrders(),
        supplierService.listFinancialSummaries(),
        commercialService.listMarketplaceListings({
          categories: ['INPUTS_INDUSTRY'],
          onlyOwnListings: true,
          ownerUserId: currentUser.uid,
        }),
        supplierService.getPdvConnector(currentUser.uid),
        supplierService.listConnectorHistory(currentUser.uid),
      ]);
      setOrders(loadedOrders);
      setFinancials(loadedFinancials);
      setProducts(loadedProducts);
      setConnector(loadedConnector);
      setConnectorHistory(loadedHistory);
    } catch {
      setLoadError('Nao foi possivel carregar o painel do fornecedor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSupplier();
  }, [currentUser?.uid]);

  const pendingOrders = orders.filter((order) => order.status === 'PENDENTE').length;
  const monthlyRevenue = useMemo(() => {
    if (financials.length === 0) {
      return 0;
    }
    return financials[0].totalSales;
  }, [financials]);

  const handleOpenDispatchModal = (orderId: string) => {
    setDispatchOrderId(orderId);
    setDispatchEvidenceType('QR_CODE');
    setDispatchEvidenceReference('');
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchOrderId) {
      return;
    }
    if (!dispatchEvidenceReference.trim()) {
      addToast({
        type: 'warning',
        title: 'Evidencia obrigatoria',
        message: 'Informe QR, foto ou video para confirmar o envio.',
      });
      return;
    }

    const evidence: EvidencePayload =
      dispatchEvidenceType === 'QR_CODE'
        ? {
            type: 'TYPE_A',
            telemetry: {
              source: 'supplier-dispatch-qr',
              capturedAt: new Date().toISOString(),
              data: { qr: dispatchEvidenceReference.trim() },
            },
            metadata: { evidenceType: dispatchEvidenceType },
          }
        : {
            type: 'TYPE_A',
            storagePath: dispatchEvidenceReference.trim(),
            metadata: { evidenceType: dispatchEvidenceType },
          };

    setIsDispatching(true);
    try {
      await supplierService.markOrderShipped({
        orderId: dispatchOrderId,
        actor,
        evidences: [evidence],
        proofUrl: dispatchEvidenceReference.trim(),
      });

      setOrders((previous) =>
        previous.map((order) => (order.id === dispatchOrderId ? { ...order, status: 'ENVIADO' } : order))
      );
      setDispatchOrderId(null);
      setDispatchEvidenceReference('');
      addToast({
        type: 'success',
        title: 'Envio confirmado',
        message: 'Pedido marcado como enviado com auditoria imutavel.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha no envio',
        message: error instanceof Error ? error.message : 'Nao foi possivel confirmar o envio.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleConnectConnector = async () => {
    if (!userId) {
      return;
    }

    setSavingConnector(true);
    try {
      const saved = await supplierService.connectPdvConnector({
        userId,
        actor,
        providerName: connectorForm.providerName,
        baseUrl: connectorForm.baseUrl,
        apiKey: connectorForm.apiKey,
        routeOffersToPdv: connectorForm.routeOffersToPdv,
        autoImportEnabled: connectorForm.autoImportEnabled,
        evidenceReference: connectorForm.evidenceReference,
      });
      setConnector(saved);
      addToast({
        type: 'success',
        title: 'Conector ativo',
        message: 'Integracao ERP/PDV habilitada com auditoria imutavel.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha na integracao',
        message: error instanceof Error ? error.message : 'Nao foi possivel conectar ERP/PDV.',
      });
    } finally {
      setSavingConnector(false);
    }
  };

  const handleDisconnectConnector = async () => {
    if (!userId) {
      return;
    }

    setSavingConnector(true);
    try {
      const saved = await supplierService.disconnectPdvConnector({
        userId,
        actor,
        evidenceReference: connectorForm.evidenceReference,
      });
      setConnector(saved);
      addToast({
        type: 'success',
        title: 'Conector desativado',
        message: 'Integracao ERP/PDV desconectada com registro de auditoria.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha na desconexao',
        message: error instanceof Error ? error.message : 'Nao foi possivel desconectar ERP/PDV.',
      });
    } finally {
      setSavingConnector(false);
    }
  };

  const parseBatchPayload = (): SupplierExternalProductPayload[] => {
    const parsed = JSON.parse(batchPayload) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      throw new Error('O lote deve ser um array JSON de produtos.');
    }

    return parsed.map((item, index) => ({
      externalId: String(item.externalId ?? `ERP-${index + 1}`),
      name: String(item.name ?? ''),
      category: item.category ? String(item.category) : undefined,
      unit: String(item.unit ?? ''),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 0),
      region: item.region ? String(item.region) : undefined,
      sectorHint: item.sectorHint ? String(item.sectorHint) : undefined,
      evidenceReference: String(item.evidenceReference ?? batchEvidenceReference),
    }));
  };

  const handleBatchImport = async () => {
    if (!userId) {
      return;
    }

    setImportingBatch(true);
    setImportResult(null);
    try {
      const productsPayload = parseBatchPayload();
      const result = await supplierService.importProductsFromExternalErp({
        userId,
        actor,
        supplierName,
        evidenceReference: batchEvidenceReference,
        products: productsPayload,
      });

      const [loadedProducts, loadedConnector, loadedHistory] = await Promise.all([
        commercialService.listMarketplaceListings({
          categories: ['INPUTS_INDUSTRY'],
          onlyOwnListings: true,
          ownerUserId: userId,
        }),
        supplierService.getPdvConnector(userId),
        supplierService.listConnectorHistory(userId),
      ]);
      setProducts(loadedProducts);
      setConnector(loadedConnector);
      setConnectorHistory(loadedHistory);

      setImportResult(`Importados: ${result.imported} | Falhas: ${result.failed}`);
      addToast({
        type: result.failed > 0 ? 'warning' : 'success',
        title: result.failed > 0 ? 'Importacao parcial' : 'Importacao concluida',
        message: `Produtos publicados automaticamente: ${result.imported}.`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha na importacao',
        message: error instanceof Error ? error.message : 'Nao foi possivel importar produtos do ERP.',
      });
    } finally {
      setImportingBatch(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando fornecedor..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Fornecedor (ERP)</h2>
      <p className="text-slate-600 mb-8">
        Gerencie catalogo, pedidos e integracao ERP/PDV com auditoria e evidencia digital imutavel.
      </p>

      <div className="flex flex-wrap border-b border-slate-200 mb-6">
        <button onClick={() => setActiveTab('OVERVIEW')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'OVERVIEW' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Visao Geral</button>
        <button onClick={() => setActiveTab('PRODUCTS')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'PRODUCTS' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Produtos</button>
        <button onClick={() => setActiveTab('ORDERS')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'ORDERS' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Pedidos</button>
        <button onClick={() => setActiveTab('FINANCE')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'FINANCE' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Financeiro</button>
        <button onClick={() => setActiveTab('INTEGRATION')} className={`px-6 py-3 text-sm font-bold ${activeTab === 'INTEGRATION' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Integracao ERP/PDV</button>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
              <p className="text-sm text-slate-500">Pedidos a Enviar</p>
              <p className="text-3xl font-bold text-slate-800">{pendingOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500">
              <p className="text-sm text-slate-500">Faturamento (Mes)</p>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(monthlyRevenue)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <p className="text-sm text-slate-500">Produtos Ativos</p>
              <p className="text-3xl font-bold text-slate-800">{products.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <p className="text-sm text-slate-500">Conector ERP/PDV</p>
              <p className="text-lg font-bold text-slate-800">{connector?.status ?? 'DISCONNECTED'}</p>
              <p className="text-xs text-slate-500 mt-1">Ultimo sync: {formatTimestamp(connector?.lastSyncAt)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-xl font-bold text-slate-800 mb-3">Acoes urgentes</h3>
            {pendingOrders > 0 ? (
              orders.filter((order) => order.status === 'PENDENTE').map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                  <p>
                    Pedido <span className="font-bold">{order.id}</span> de <span className="font-semibold">{order.customer}</span> aguarda envio.
                  </p>
                  <button onClick={() => setActiveTab('ORDERS')} className="text-indigo-600 font-bold text-sm hover:underline">Tratar pedido</button>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">Nenhuma acao urgente.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'PRODUCTS' && (
        <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h3 className="text-xl font-bold text-slate-800">Catalogo de Produtos</h3>
            <button
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold"
              onClick={() => setActiveTab('INTEGRATION')}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" /> Importar em lote do ERP
            </button>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-6 py-3">Produto</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Preco Unitario</th>
                <th className="px-6 py-3">Estoque B2B</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">{item.productName}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4">{formatCurrency(item.price)} / {item.unit}</td>
                  <td className="px-6 py-4">{item.b2bStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ORDERS' && (
        <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Pedidos de Compra Recebidos</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-6 py-3">Pedido</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono">{order.id}</td>
                  <td className="px-6 py-4 font-bold">{order.customer}</td>
                  <td className="px-6 py-4">{formatCurrency(order.totalValue)}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-right">
                    {order.status === 'PENDENTE' && (
                      <button
                        className="flex items-center ml-auto px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600"
                        onClick={() => handleOpenDispatchModal(order.id)}
                      >
                        <TruckIcon className="h-4 w-4 mr-1" />
                        Confirmar envio + evidencia
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'FINANCE' && (
        <div className="animate-fade-in bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Repasses e Taxas</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-6 py-3">Periodo</th>
                <th className="px-6 py-3">Vendas Brutas</th>
                <th className="px-6 py-3">Taxas da Plataforma</th>
                <th className="px-6 py-3">Repasse Liquido</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {financials.map((financial) => (
                <tr key={financial.month} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold">{financial.month}</td>
                  <td className="px-6 py-4">{formatCurrency(financial.totalSales)}</td>
                  <td className="px-6 py-4 text-red-600">({formatCurrency(financial.platformFees)})</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(financial.netPayout)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full font-bold text-xs ${financial.status === 'PAGO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {financial.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'INTEGRATION' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Conexao ERP/PDV do fornecedor</h3>
            <p className="text-sm text-slate-600 mb-4">
              Direciona automaticamente as ofertas de fornecimento para o canal PDV, sem cadastro manual.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="p-2 border rounded"
                onChange={(event) => setConnectorForm((prev) => ({ ...prev, providerName: event.target.value }))}
                placeholder="Nome do provedor ERP/PDV"
                value={connectorForm.providerName}
              />
              <input
                className="p-2 border rounded"
                onChange={(event) => setConnectorForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder="URL da API do ERP/PDV"
                value={connectorForm.baseUrl}
              />
              <input
                className="p-2 border rounded"
                onChange={(event) => setConnectorForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                placeholder="Token/API Key"
                value={connectorForm.apiKey}
              />
              <input
                className="p-2 border rounded"
                onChange={(event) => {
                  setConnectorForm((prev) => ({ ...prev, evidenceReference: event.target.value }));
                  setBatchEvidenceReference(event.target.value);
                }}
                placeholder="Evidencia digital (QR/link/hash)"
                value={connectorForm.evidenceReference}
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  checked={connectorForm.routeOffersToPdv}
                  onChange={(event) => setConnectorForm((prev) => ({ ...prev, routeOffersToPdv: event.target.checked }))}
                  type="checkbox"
                />
                Direcionar ofertas para PDV
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  checked={connectorForm.autoImportEnabled}
                  onChange={(event) => setConnectorForm((prev) => ({ ...prev, autoImportEnabled: event.target.checked }))}
                  type="checkbox"
                />
                Habilitar importacao automatica em lote
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                disabled={isSavingConnector}
                onClick={() => void handleConnectConnector()}
                type="button"
              >
                {isSavingConnector ? 'Conectando...' : 'Conectar ERP/PDV'}
              </button>
              <button
                className="px-4 py-2 rounded-md bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                disabled={isSavingConnector}
                onClick={() => void handleDisconnectConnector()}
                type="button"
              >
                Desconectar
              </button>
            </div>

            {connector && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p><span className="font-semibold">Status:</span> {connector.status}</p>
                <p><span className="font-semibold">Provedor:</span> {connector.providerName}</p>
                <p><span className="font-semibold">Credencial:</span> {connector.apiKeyMasked || '-'}</p>
                <p><span className="font-semibold">Ultimo sync:</span> {formatTimestamp(connector.lastSyncAt)}</p>
                <p><span className="font-semibold">Sync status:</span> {connector.lastSyncStatus}</p>
                {connector.immutableAuditHash && (
                  <p className="font-mono text-xs mt-1 break-all">
                    auditHash: {connector.immutableAuditHash}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Importacao em lote sem cadastro manual</h3>
            <p className="text-sm text-slate-600 mb-3">
              Cole o JSON exportado do ERP para publicar ofertas diretamente no painel comercial/PDV.
            </p>
            <textarea
              className="w-full min-h-[220px] rounded-md border border-slate-300 p-3 font-mono text-xs"
              onChange={(event) => setBatchPayload(event.target.value)}
              value={batchPayload}
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="p-2 border rounded"
                onChange={(event) => setBatchEvidenceReference(event.target.value)}
                placeholder="Evidencia digital do lote (QR/link/hash)"
                value={batchEvidenceReference}
              />
              <button
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                disabled={isImportingBatch}
                onClick={() => void handleBatchImport()}
                type="button"
              >
                {isImportingBatch ? 'Importando...' : 'Importar produtos do ERP'}
              </button>
            </div>
            {importResult && (
              <p className="mt-3 text-sm text-slate-700">{importResult}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-3">Historico de sincronizacao imutavel</h3>
            {connectorHistory.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma sincronizacao registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Importados</th>
                      <th className="p-2 text-left">Falhas</th>
                      <th className="p-2 text-left">Hash imutavel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectorHistory.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="p-2">{formatTimestamp(entry.createdAt)}</td>
                        <td className="p-2">{entry.imported}</td>
                        <td className="p-2">{entry.failed}</td>
                        <td className="p-2 font-mono text-xs break-all">{entry.immutableAuditHash ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {dispatchOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-bold text-slate-800">Confirmar envio com evidencia digital</h4>
            <p className="text-sm text-slate-600 mt-1">Pedido: {dispatchOrderId}</p>

            <div className="mt-4 space-y-3">
              <select
                className="w-full rounded-md border border-slate-300 p-2"
                onChange={(event) => setDispatchEvidenceType(event.target.value as DispatchEvidenceType)}
                value={dispatchEvidenceType}
              >
                <option value="QR_CODE">QR de despacho</option>
                <option value="PHOTO">Foto de comprovacao</option>
                <option value="VIDEO">Video de comprovacao</option>
              </select>
              <input
                className="w-full rounded-md border border-slate-300 p-2"
                onChange={(event) => setDispatchEvidenceReference(event.target.value)}
                placeholder="Referencia da evidencia (QR/link/hash)"
                value={dispatchEvidenceReference}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setDispatchOrderId(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={isDispatching}
                onClick={() => void handleConfirmDispatch()}
                type="button"
              >
                {isDispatching ? 'Confirmando...' : 'Confirmar envio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;
