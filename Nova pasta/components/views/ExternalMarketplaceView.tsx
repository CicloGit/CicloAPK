import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { externalMarketplaceService } from '../../services/externalMarketplaceService';
import { ExternalMarketplaceApiItemPayload, ExternalMarketplaceBridge, ExternalMarketplaceItem, User } from '../../types';

const ROLE_OPTIONS: Array<User['role']> = [
  'Produtor',
  'Fornecedor',
  'Integradora',
  'Operador',
  'Leiloeiro',
  'Técnico',
  'Investidor',
  'Gestor',
  'Administrador',
  'Gestor de Trafego',
];

const DEFAULT_VISIBLE_ROLES: Array<User['role']> = ['Produtor', 'Fornecedor', 'Integradora'];

const mapRoleToPortal = (role: User['role']): string => {
  if (role === 'Gestor de Trafego') return 'GESTOR_TRAFEGO';
  if (role === 'Técnico') return 'TECNICO';
  return role
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_');
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ExternalMarketplaceView: React.FC = () => {
  const { currentUser } = useApp();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bridge, setBridge] = useState<ExternalMarketplaceBridge | null>(null);
  const [visibleItems, setVisibleItems] = useState<ExternalMarketplaceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [blockedItems, setBlockedItems] = useState<Array<{ externalId: string; title: string; reason: string }>>([]);

  const [form, setForm] = useState({
    platformName: 'Loja Externa',
    apiBaseUrl: '',
    storefrontUrl: '',
    apiClientId: '',
    apiToken: '',
    notes: '',
  });
  const [visibleRoles, setVisibleRoles] = useState<Array<User['role']>>(DEFAULT_VISIBLE_ROLES);
  const [catalogPayload, setCatalogPayload] = useState(`[
  {
    "externalId": "EXT-ML-001",
    "title": "Kit utensilios de manejo",
    "description": "Produto da loja externa vinculada por API",
    "segment": "UTENSILIOS",
    "unit": "kit",
    "price": 189.90,
    "stock": 35,
    "targetPortals": ["PRODUTOR", "OPERADOR"],
    "sourceUrl": "https://exemplo-loja.com/item/EXT-ML-001"
  }
]`);

  const canManage = useMemo(() => {
    if (!currentUser?.role) {
      return false;
    }
    return ['Gestor', 'Administrador', 'Integradora', 'Fornecedor'].includes(currentUser.role);
  }, [currentUser?.role]);

  const loadModule = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedBridge, loadedItems] = await Promise.all([
        externalMarketplaceService.getBridge(),
        externalMarketplaceService.listVisibleItems(currentUser?.role),
      ]);
      setBridge(loadedBridge);
      setVisibleItems(loadedItems);

      if (loadedBridge) {
        setForm({
          platformName: loadedBridge.platformName,
          apiBaseUrl: loadedBridge.apiBaseUrl,
          storefrontUrl: loadedBridge.storefrontUrl,
          apiClientId: loadedBridge.apiClientId,
          apiToken: '',
          notes: loadedBridge.notes ?? '',
        });
        setVisibleRoles(loadedBridge.visibleToRoles.length > 0 ? loadedBridge.visibleToRoles : DEFAULT_VISIBLE_ROLES);
      }
    } catch {
      setLoadError('Nao foi possivel carregar a loja externa vinculada por API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadModule();
  }, [currentUser?.role]);

  const toggleRole = (role: User['role']) => {
    setVisibleRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((item) => item !== role);
      }
      return [...prev, role];
    });
  };

  const handleSaveBridge = async () => {
    if (!canManage) {
      addToast({
        type: 'warning',
        title: 'Permissao insuficiente',
        message: 'Somente perfis de gestao podem configurar a loja externa por API.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const saved = await externalMarketplaceService.upsertBridge({
        platformName: form.platformName,
        apiBaseUrl: form.apiBaseUrl,
        storefrontUrl: form.storefrontUrl,
        apiClientId: form.apiClientId,
        apiToken: form.apiToken,
        notes: form.notes,
        visibleToRoles: visibleRoles.length > 0 ? visibleRoles : DEFAULT_VISIBLE_ROLES,
      });
      setBridge(saved);
      setForm((prev) => ({ ...prev, apiToken: '' }));
      addToast({
        type: 'success',
        title: 'Loja externa vinculada',
        message: 'Conexao por API salva e separada do marketplace interno.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha na vinculacao',
        message: error instanceof Error ? error.message : 'Nao foi possivel vincular a loja externa.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const parseCatalogPayload = (): ExternalMarketplaceApiItemPayload[] => {
    const parsed = JSON.parse(catalogPayload) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      throw new Error('O payload deve ser um array JSON.');
    }

    return parsed.map((item, index) => ({
      externalId: String(item.externalId ?? `EXT-${index + 1}`),
      title: String(item.title ?? ''),
      description: item.description ? String(item.description) : undefined,
      segment: String(item.segment ?? 'GERAL'),
      unit: String(item.unit ?? 'un'),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 0),
      targetPortals: Array.isArray(item.targetPortals)
        ? item.targetPortals.map((portal) => String(portal).toUpperCase()) as ExternalMarketplaceApiItemPayload['targetPortals']
        : [mapRoleToPortal(currentUser?.role ?? 'Produtor')] as ExternalMarketplaceApiItemPayload['targetPortals'],
      sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
    }));
  };

  const handleImportCatalog = async () => {
    if (!bridge?.id) {
      addToast({
        type: 'warning',
        title: 'Conexao ausente',
        message: 'Vincule a loja externa por API antes de importar o catalogo.',
      });
      return;
    }

    setIsImporting(true);
    setImportSummary(null);
    setBlockedItems([]);
    try {
      const parsedItems = parseCatalogPayload();
      const result = await externalMarketplaceService.importItemsFromApi({
        bridgeId: bridge.id,
        items: parsedItems,
      });

      setImportSummary(`Importados: ${result.imported} | Bloqueados por conflito: ${result.blocked}`);
      setBlockedItems(result.blockedItems);
      const refreshedItems = await externalMarketplaceService.listVisibleItems(currentUser?.role);
      setVisibleItems(refreshedItems);

      addToast({
        type: result.blocked > 0 ? 'warning' : 'success',
        title: result.blocked > 0 ? 'Importacao parcial' : 'Catalogo importado',
        message: result.blocked > 0
          ? 'Alguns itens externos foram bloqueados por choque com producao interna.'
          : 'Catalogo externo atualizado para os portais permitidos.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha na importacao',
        message: error instanceof Error ? error.message : 'Nao foi possivel importar o catalogo externo.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando loja externa..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Loja Externa via API</h2>
        <p className="text-slate-600">
          Modulo separado do marketplace interno. A loja e criada fora do sistema e vinculada por API para acesso nos portais permitidos.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Regra de segregacao: catalogo externo nao substitui nem mistura dados do marketplace interno do ecossistema.
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">Conexao da loja externa</h3>
          {bridge?.storefrontUrl && (
            <a
              href={bridge.storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Abrir loja externa
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.platformName}
            onChange={(event) => setForm((prev) => ({ ...prev, platformName: event.target.value }))}
            className="p-2 border border-slate-300 rounded"
            placeholder="Nome da plataforma (ex: Mercado Livre)"
            disabled={!canManage}
          />
          <input
            value={form.apiBaseUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
            className="p-2 border border-slate-300 rounded"
            placeholder="URL da API externa"
            disabled={!canManage}
          />
          <input
            value={form.storefrontUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, storefrontUrl: event.target.value }))}
            className="p-2 border border-slate-300 rounded"
            placeholder="URL publica da loja externa"
            disabled={!canManage}
          />
          <input
            value={form.apiClientId}
            onChange={(event) => setForm((prev) => ({ ...prev, apiClientId: event.target.value }))}
            className="p-2 border border-slate-300 rounded"
            placeholder="Client ID da API"
            disabled={!canManage}
          />
          <input
            value={form.apiToken}
            onChange={(event) => setForm((prev) => ({ ...prev, apiToken: event.target.value }))}
            className="p-2 border border-slate-300 rounded md:col-span-2"
            placeholder={bridge?.apiTokenHint ? `Token atual ${bridge.apiTokenHint} (opcional atualizar)` : 'Token/API Key'}
            disabled={!canManage}
          />
          <input
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="p-2 border border-slate-300 rounded md:col-span-2"
            placeholder="Observacoes da integracao externa"
            disabled={!canManage}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Portais com acesso permitido</p>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                disabled={!canManage}
                className={`px-2.5 py-1.5 text-xs rounded border ${
                  visibleRoles.includes(role)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-600 border-slate-300'
                } ${!canManage ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100'}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => void handleSaveBridge()}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving ? 'Salvando conexao...' : 'Salvar conexao da loja externa'}
          </button>
        ) : (
          <p className="text-xs text-slate-500">Perfil sem permissao de edicao. O acesso e somente leitura.</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-3">
        <h3 className="text-lg font-bold text-slate-800">Catalogo externo por API (com filtro de nicho por portal)</h3>
        <p className="text-xs text-slate-600">
          Cada item deve informar `targetPortals` e `segment`. Itens com choque de nome com producao interna do ecossistema sao bloqueados automaticamente.
        </p>
        <textarea
          value={catalogPayload}
          onChange={(event) => setCatalogPayload(event.target.value)}
          className="w-full min-h-[220px] p-3 border border-slate-300 rounded font-mono text-xs"
          disabled={!canManage}
        />
        <button
          type="button"
          onClick={() => void handleImportCatalog()}
          disabled={isImporting || !canManage}
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {isImporting ? 'Importando catalogo...' : 'Importar catalogo externo'}
        </button>
        {importSummary && <p className="text-sm text-slate-700">{importSummary}</p>}
        {blockedItems.length > 0 && (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-700 mb-2">Itens bloqueados por conflito com producao interna</p>
            <ul className="text-xs text-red-700 space-y-1">
              {blockedItems.map((item) => (
                <li key={`${item.externalId}-${item.title}`}>
                  {item.externalId} | {item.title} | {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Catalogo externo visivel para este portal</h3>
        {visibleItems.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum item externo disponivel para o perfil atual.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                <tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Segmento</th>
                  <th className="p-2 text-left">Preco</th>
                  <th className="p-2 text-left">Estoque</th>
                  <th className="p-2 text-left">Portais</th>
                  <th className="p-2 text-left">Origem</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="p-2">
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.externalId}</p>
                    </td>
                    <td className="p-2">{item.segment}</td>
                    <td className="p-2">{formatCurrency(item.price)} / {item.unit}</td>
                    <td className="p-2">{item.stock}</td>
                    <td className="p-2 text-xs text-slate-600">{item.targetPortals.join(', ') || '-'}</td>
                    <td className="p-2 text-xs">
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
                          Abrir item
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ExternalMarketplaceView;
