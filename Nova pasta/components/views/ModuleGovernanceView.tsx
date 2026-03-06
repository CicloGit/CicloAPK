import React, { useEffect, useMemo, useState } from 'react';
import CodeIcon from '../icons/CodeIcon';
import CloudIcon from '../icons/CloudIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import {
  RealModuleAuthMode,
  RealModuleEnvironment,
  RealModuleHealthStatus,
  RealModuleKey,
  RealModuleManifest,
  RealModuleNexusSignal,
  RealModuleNexusSummary,
  RealModuleNexusSeverity,
  RealModuleRuntime,
  RealModuleRuntimeDraft,
} from '../../types';
import { moduleRegistryService } from '../../services/moduleRegistryService';

const MODULE_ICON: Record<RealModuleKey, React.FC<{ className?: string }>> = {
  ERP_CORE: ShieldCheckIcon,
  MPV_CICLO: CloudIcon,
  CEREBRO_NEXUS: CodeIcon,
};

const HEALTH_STYLE: Record<RealModuleHealthStatus, string> = {
  ONLINE: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  OFFLINE: 'bg-rose-100 text-rose-800 border border-rose-200',
  UNCONFIGURED: 'bg-amber-100 text-amber-800 border border-amber-200',
  DISABLED: 'bg-slate-100 text-slate-600 border border-slate-200',
  DEGRADED: 'bg-orange-100 text-orange-800 border border-orange-200',
};

const HEALTH_ICON: Record<RealModuleHealthStatus, React.FC<{ className?: string }>> = {
  ONLINE: CheckCircleIcon,
  OFFLINE: ExclamationCircleIcon,
  UNCONFIGURED: ExclamationCircleIcon,
  DISABLED: ExclamationCircleIcon,
  DEGRADED: ExclamationCircleIcon,
};

const NEXUS_SIGNAL_LIMIT = 12;

const NEXUS_SEVERITY_STYLE: Record<RealModuleNexusSeverity, string> = {
  INFO: 'bg-sky-100 text-sky-800 border border-sky-200',
  WARNING: 'bg-amber-100 text-amber-800 border border-amber-200',
  CRITICAL: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const buildDraft = (runtime: RealModuleRuntime): RealModuleRuntimeDraft => ({
  baseUrl: runtime.baseUrl,
  healthPath: runtime.healthPath,
  manifestPath: runtime.manifestPath || '/manifest',
  environment: runtime.environment,
  authMode: runtime.authMode,
  credentialRef: runtime.credentialRef,
  enabled: runtime.enabled,
  capabilitiesText: runtime.capabilities.join('\n'),
});

type ModuleManifestLookup = Partial<Record<RealModuleKey, RealModuleManifest | null>>;

const parseCapabilities = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const getHealthLabel = (status: RealModuleHealthStatus | undefined): string => {
  switch (status) {
    case 'ONLINE':
      return 'Online';
    case 'OFFLINE':
      return 'Offline';
    case 'DEGRADED':
      return 'Degradado';
    case 'DISABLED':
      return 'Desabilitado';
    default:
      return 'Nao configurado';
  }
};

const getNexusSeverityLabel = (severity: RealModuleNexusSeverity | undefined): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'Critico';
    case 'WARNING':
      return 'Alerta';
    default:
      return 'Informativo';
  }
};

const ModuleGovernanceView: React.FC = () => {
  const { addToast } = useToast();
  const [modules, setModules] = useState<RealModuleRuntime[]>([]);
  const [selectedKey, setSelectedKey] = useState<RealModuleKey | null>(null);
  const [draft, setDraft] = useState<RealModuleRuntimeDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingManifest, setIsCheckingManifest] = useState(false);
  const [isLoadingNexus, setIsLoadingNexus] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [nexusError, setNexusError] = useState<string | null>(null);
  const [moduleManifests, setModuleManifests] = useState<ModuleManifestLookup>({});
  const [nexusSummary, setNexusSummary] = useState<RealModuleNexusSummary | null>(null);
  const [nexusSignals, setNexusSignals] = useState<RealModuleNexusSignal[]>([]);

  const selectedModule = useMemo(
    () => modules.find((entry) => entry.moduleKey === selectedKey) ?? null,
    [modules, selectedKey]
  );
  const selectedManifest = useMemo(
    () => (selectedModule ? moduleManifests[selectedModule.moduleKey] ?? null : null),
    [moduleManifests, selectedModule]
  );

  useEffect(() => {
    let mounted = true;

    const loadModules = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const items = await moduleRegistryService.listModules();
        if (!mounted) {
          return;
        }
        setModules(items);
        setSelectedKey((current) => current ?? items[0]?.moduleKey ?? null);

        void moduleRegistryService
          .getModuleManifests()
          .then((manifests) => {
            if (!mounted) {
              return;
            }
            setModuleManifests((current) => {
              const next = { ...current };
              manifests.forEach((entry) => {
                next[entry.moduleKey] = entry;
              });
              return next;
            });
          })
          .catch(() => {
            if (!mounted) {
              return;
            }
            setManifestError('Manifesto nao carregado automatico. Use a acao individual para atualizar.');
          });

        void moduleRegistryService
          .getNexusSignals(NEXUS_SIGNAL_LIMIT)
          .then((feed) => {
            if (!mounted) {
              return;
            }
            setNexusSummary(feed.summary);
            setNexusSignals(feed.signals);
          })
          .catch(() => {
            if (!mounted) {
              return;
            }
            setNexusError('Sinais do Nexus nao carregados automatico. Use a atualizacao manual.');
          })
          .finally(() => {
            if (mounted) {
              setIsLoadingNexus(false);
            }
          });
      } catch (error) {
        if (!mounted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Nao foi possivel carregar os modulos.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadModules();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedModule) {
      setDraft(null);
      return;
    }
    setDraft(buildDraft(selectedModule));
  }, [selectedModule]);

  const handleDraftChange = <K extends keyof RealModuleRuntimeDraft>(field: K, value: RealModuleRuntimeDraft[K]) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleSave = async () => {
    if (!selectedModule || !draft) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await moduleRegistryService.saveModule({
        moduleKey: selectedModule.moduleKey,
        baseUrl: draft.baseUrl.trim(),
        healthPath: draft.healthPath.trim(),
        manifestPath: draft.manifestPath.trim() || '/manifest',
        environment: draft.environment,
        authMode: draft.authMode,
        credentialRef: draft.credentialRef.trim(),
        enabled: draft.enabled,
        capabilities: parseCapabilities(draft.capabilitiesText),
      });

      setModules((current) =>
        current.map((entry) => (entry.moduleKey === saved.moduleKey ? saved : entry))
      );
      setSelectedKey(saved.moduleKey);
      addToast({
        type: 'success',
        title: 'Modulo atualizado',
        message: `${saved.displayName} salvo com contrato de runtime real.`,
        duration: 5000,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha ao salvar',
        message: error instanceof Error ? error.message : 'Nao foi possivel persistir o modulo.',
        duration: 6000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckHealth = async (moduleKey?: RealModuleKey) => {
    setIsChecking(true);
    try {
      const checked = await moduleRegistryService.checkModules(moduleKey);
      setModules((current) => {
        const nextMap = new Map(current.map((entry) => [entry.moduleKey, entry]));
        checked.forEach((entry) => nextMap.set(entry.moduleKey, entry));
        return Array.from(nextMap.values());
      });
      addToast({
        type: 'success',
        title: 'Health-check concluido',
        message: moduleKey
          ? 'Modulo validado com sucesso.'
          : 'Todos os modulos configurados foram verificados.',
        duration: 5000,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Falha no health-check',
        message: error instanceof Error ? error.message : 'Nao foi possivel validar os modulos.',
        duration: 6000,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefreshNexus = async () => {
    setIsLoadingNexus(true);
    setNexusError(null);
    try {
      const feed = await moduleRegistryService.getNexusSignals(NEXUS_SIGNAL_LIMIT);
      setNexusSummary(feed.summary);
      setNexusSignals(feed.signals);
      addToast({
        type: 'success',
        title: 'Nexus atualizado',
        message: 'Feed de sinais sincronizado com o observador operacional.',
        duration: 5000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar os sinais do Nexus.';
      setNexusError(message);
      addToast({
        type: 'error',
        title: 'Falha no Nexus',
        message,
        duration: 6000,
      });
    } finally {
      setIsLoadingNexus(false);
    }
  };

  const handleCheckManifests = async (moduleKey?: RealModuleKey) => {
    setIsCheckingManifest(true);
    setManifestError(null);
    try {
      const manifests = await moduleRegistryService.getModuleManifests(moduleKey);
      setModuleManifests((current) => {
        const next = { ...current };
        manifests.forEach((entry) => {
          next[entry.moduleKey] = entry;
        });
        return next;
      });
      addToast({
        type: 'success',
        title: 'Manifesto verificado',
        message: moduleKey
          ? `${moduleKey} carregado com sucesso.`
          : 'Manifestos carregados com sucesso.',
        duration: 5000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel validar manifestos.';
      setManifestError(message);
      addToast({
        type: 'error',
        title: 'Falha ao validar manifesto',
        message,
        duration: 6000,
      });
    } finally {
      setIsCheckingManifest(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando governanca de modulos..." />;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        {loadError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-sky-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Governanca de Modulos Reais</h2>
            <p className="text-sm text-slate-600">
              Separacao operacional entre ERP Core, MPV Ciclo e Cerebro Nexus com health-check,
              contrato de runtime e referencia segura de credenciais.
            </p>
          </div>
          <button
            className="ml-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isChecking}
            onClick={() => void handleCheckHealth()}
            type="button"
          >
            {isChecking ? 'Validando...' : 'Verificar Todos'}
          </button>
          <button
            className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCheckingManifest}
            onClick={() => void handleCheckManifests()}
            type="button"
          >
            {isCheckingManifest ? 'Lendo manifestos...' : 'Verificar Manifestos'}
          </button>
          <button
            className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingNexus}
            onClick={() => void handleRefreshNexus()}
            type="button"
          >
            {isLoadingNexus ? 'Lendo Nexus...' : 'Atualizar Nexus'}
          </button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sinais Nexus</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{nexusSummary?.totalSignals ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Historico materializado por tenant.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Criticos</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{nexusSummary?.severityCounts?.CRITICAL ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Eventos que exigem acao imediata.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Ultima Severidade</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {getNexusSeverityLabel(nexusSummary?.lastSeverity)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {nexusSummary?.lastSignalAtIso ?? 'Sem observacao registrada.'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Ultimo Evento</p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {nexusSummary?.lastEventType ?? 'Aguardando eventos'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {nexusSummary?.lastSummary ?? 'O observador passa a popular este quadro assim que novos audits entram.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          {modules.map((entry) => {
            const Icon = MODULE_ICON[entry.moduleKey];
            const healthStatus = entry.lastHealthCheck?.status ?? 'UNCONFIGURED';
            const HealthIcon = HEALTH_ICON[healthStatus];
            const active = entry.moduleKey === selectedKey;

            return (
              <button
                className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                  active
                    ? 'border-sky-300 bg-sky-50 shadow-sky-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                key={entry.moduleKey}
                onClick={() => setSelectedKey(entry.moduleKey)}
                type="button"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <Icon className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">{entry.displayName}</h3>
                    <p className="text-xs text-slate-500">{entry.owningSystem}</p>
                  </div>
                </div>
                <p className="mb-3 text-xs text-slate-600">{entry.description}</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${HEALTH_STYLE[healthStatus]}`}
                  >
                    <HealthIcon className="mr-1.5 h-3.5 w-3.5" />
                    {getHealthLabel(healthStatus)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {entry.environment}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {entry.criticality}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {entry.lastHealthCheck?.message ?? 'Sem validacao executada.'}
                </p>
              </button>
            );
          })}
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedModule || !draft ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Selecione um modulo para editar o runtime.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedModule.displayName}</h3>
                  <p className="text-sm text-slate-600">{selectedModule.description}</p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isChecking}
                    onClick={() => void handleCheckHealth(selectedModule.moduleKey)}
                    type="button"
                  >
                    {isChecking ? 'Validando...' : 'Health-check'}
                  </button>
                  <button
                    className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isCheckingManifest}
                    onClick={() => void handleCheckManifests(selectedModule.moduleKey)}
                    type="button"
                  >
                    {isCheckingManifest ? 'Lendo...' : 'Manifest'}
                  </button>
                  <button
                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                    type="button"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Runtime'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Base URL
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => handleDraftChange('baseUrl', event.target.value)}
                    placeholder="https://api.seu-modulo.com"
                    value={draft.baseUrl}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Health Path
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => handleDraftChange('healthPath', event.target.value)}
                    placeholder="/health"
                    value={draft.healthPath}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Manifest Path
                  </span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => handleDraftChange('manifestPath', event.target.value)}
                    placeholder="/manifest"
                    value={draft.manifestPath}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Rota para o JSON de manifesto do modulo (exemplo: /manifest).
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Ambiente
                  </span>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => handleDraftChange('environment', event.target.value as RealModuleEnvironment)}
                    value={draft.environment}
                  >
                    <option value="LOCAL">LOCAL</option>
                    <option value="HOMOLOGACAO">HOMOLOGACAO</option>
                    <option value="PRODUCAO">PRODUCAO</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Modo de Autenticacao
                  </span>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => handleDraftChange('authMode', event.target.value as RealModuleAuthMode)}
                    value={draft.authMode}
                  >
                    <option value="NONE">NONE</option>
                    <option value="BEARER">BEARER</option>
                    <option value="API_KEY">API_KEY</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Referencia de Credencial
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  onChange={(event) => handleDraftChange('credentialRef', event.target.value)}
                  placeholder="projects/.../secrets/MODULO_API_TOKEN"
                  value={draft.credentialRef}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  O frontend guarda apenas a referencia segura; o segredo real deve ficar em Secret
                  Manager/variavel protegida.
                </p>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Capacidades do Modulo
                </span>
                <textarea
                  className="min-h-36 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  onChange={(event) => handleDraftChange('capabilitiesText', event.target.value)}
                  placeholder="health&#10;order-lock&#10;audit-export"
                  value={draft.capabilitiesText}
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  checked={draft.enabled}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                  onChange={(event) => handleDraftChange('enabled', event.target.checked)}
                  type="checkbox"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Modulo habilitado para runtime real</p>
                  <p className="text-xs text-slate-500">
                    Modulos desabilitados permanecem separados, mas nao entram na verificacao operacional.
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-bold text-slate-800">Ultima configuracao</h4>
                  <p className="text-xs text-slate-600">
                    {selectedModule.lastConfiguredAt
                      ? `${selectedModule.lastConfiguredAt} por ${selectedModule.lastConfiguredBy ?? 'sistema'}`
                      : 'Ainda nao configurado.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-bold text-slate-800">Ultimo health-check</h4>
                  {selectedModule.lastHealthCheck ? (
                    <div className="space-y-1 text-xs text-slate-600">
                      <p>Status HTTP: {selectedModule.lastHealthCheck.httpStatus ?? 'N/A'}</p>
                      <p>Latencia: {selectedModule.lastHealthCheck.latencyMs ?? 0} ms</p>
                      <p>Alvo: {selectedModule.lastHealthCheck.targetUrl ?? 'Nao definido'}</p>
                      <p>Mensagem: {selectedModule.lastHealthCheck.message}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">Nenhuma validacao registrada.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-bold text-slate-800">Manifesto operacional</h4>
                  {selectedManifest ? (
                    <div className="space-y-1 text-xs text-slate-600">
                      <p>Fonte: {selectedManifest.source}</p>
                      <p>Status: {selectedManifest.status}</p>
                      <p>URL: {selectedManifest.sourceUrl || 'Nao informado'}</p>
                      <p>Atualizado: {selectedManifest.checkedAt}</p>
                      <p>Mensagem: {selectedManifest.message}</p>
                      {selectedManifest.runtimeHealthMessage ? (
                        <p>Health do runtime: {selectedManifest.runtimeHealthMessage}</p>
                      ) : null}
                      <details className="mt-2">
                        <summary className="cursor-pointer">Ver manifesto JSON</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded border border-slate-200 bg-slate-900 p-2 text-[11px] text-green-100">
                          {JSON.stringify(selectedManifest.manifest ?? {}, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Nenhum manifesto carregado. Clique em &quot;Manifest&quot; para consultar agora.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">Painel de Sinais do Nexus</h4>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      Ultimos {nexusSignals.length}
                    </span>
                  </div>
                  {isLoadingNexus ? (
                    <p className="text-xs text-slate-600">Carregando feed do observador...</p>
                  ) : nexusError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      {nexusError}
                    </div>
                  ) : nexusSignals.length === 0 ? (
                    <p className="text-xs text-slate-600">
                      Ainda nao ha sinais materializados. Gere novos eventos auditaveis no Ciclo para alimentar o Nexus.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {nexusSignals.map((signal) => (
                        <article
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                          key={signal.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${NEXUS_SEVERITY_STYLE[signal.severity]}`}
                            >
                              {getNexusSeverityLabel(signal.severity)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {signal.domain}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              #{signal.sequence} • {signal.eventType}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-900">{signal.summary}</p>
                          <p className="mt-1 text-xs text-slate-600">{signal.recommendedAction}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>Observado: {signal.observedAtIso}</span>
                            <span>Status: {signal.auditStatus}</span>
                            <span>Stream: {signal.stream}</span>
                          </div>
                          {signal.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {signal.tags.slice(0, 6).map((tag) => (
                                <span
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                                  key={`${signal.id}-${tag}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {manifestError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {manifestError}
                </div>
              ) : null}

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                O objetivo desta camada e manter `MPV Ciclo` e `Cerebro Nexus` como modulos reais e
                independentes, enquanto `PROJETO_CICLO` permanece como shell operacional canonico.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ModuleGovernanceView;
