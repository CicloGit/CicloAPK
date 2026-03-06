import {
  backendApi,
  NexusSignalFeedPayload,
  NexusSignalPayload,
  NexusSignalSummaryPayload,
  SupportModuleRuntimePayload,
  SupportModuleUpsertPayload,
  SupportModuleManifestPayload,
} from './backendApi';
import {
  RealModuleHealthCheck,
  RealModuleRuntime,
  RealModuleKey,
  RealModuleManifest,
  RealModuleNexusFeed,
  RealModuleNexusSignal,
  RealModuleNexusSummary,
} from '../types';

const toHealthCheck = (
  payload: SupportModuleRuntimePayload['lastHealthCheck']
): RealModuleHealthCheck | null => {
  if (!payload) {
    return null;
  }

  return {
    status: payload.status,
    checkedAt: payload.checkedAt,
    message: payload.message,
    targetUrl: payload.targetUrl,
    latencyMs: payload.latencyMs,
    httpStatus: payload.httpStatus,
  };
};

const toRuntime = (payload: SupportModuleRuntimePayload): RealModuleRuntime => ({
  moduleKey: payload.moduleKey,
  displayName: payload.displayName,
  description: payload.description,
  owningSystem: payload.owningSystem,
  criticality: payload.criticality,
  baseUrl: payload.baseUrl,
  healthPath: payload.healthPath,
  environment: payload.environment,
  authMode: payload.authMode,
  credentialRef: payload.credentialRef,
  enabled: payload.enabled,
  capabilities: Array.isArray(payload.capabilities) ? payload.capabilities.map(String) : [],
  manifestPath: payload.manifestPath ?? '/manifest',
  lastConfiguredAt: payload.lastConfiguredAt,
  lastConfiguredBy: payload.lastConfiguredBy,
  lastHealthCheck: toHealthCheck(payload.lastHealthCheck),
});

const toManifest = (payload: SupportModuleManifestPayload): RealModuleManifest => ({
  moduleKey: payload.moduleKey,
  displayName: payload.displayName,
  description: payload.description,
  owningSystem: payload.owningSystem,
  capabilities: Array.isArray(payload.capabilities) ? payload.capabilities.map(String) : [],
  healthPath: payload.healthPath,
  manifestPath: payload.manifestPath,
  source: payload.source,
  status: payload.status,
  sourceUrl: payload.sourceUrl,
  checkedAt: payload.checkedAt,
  message: payload.message,
  runtimeHealthMessage: payload.runtimeHealthMessage,
  runtimeTargetUrl: payload.runtimeTargetUrl,
  manifest: payload.manifest,
});

const toNexusSignal = (payload: NexusSignalPayload): RealModuleNexusSignal => ({
  id: payload.id,
  tenantId: payload.tenantId,
  auditId: payload.auditId,
  sequence: payload.sequence,
  stream: payload.stream,
  eventType: payload.eventType,
  operationType: payload.operationType,
  auditStatus: payload.auditStatus,
  actorUid: payload.actorUid,
  actorRole: payload.actorRole,
  eventCreatedAtIso: payload.eventCreatedAtIso,
  observedAtIso: payload.observedAtIso,
  severity: payload.severity,
  domain: payload.domain,
  summary: payload.summary,
  recommendedAction: payload.recommendedAction,
  tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
});

const toNexusSummary = (payload: NexusSignalSummaryPayload): RealModuleNexusSummary => ({
  tenantId: payload.tenantId,
  totalSignals: payload.totalSignals,
  lastSignalAtIso: payload.lastSignalAtIso,
  lastSeverity: payload.lastSeverity,
  lastEventType: payload.lastEventType,
  lastSummary: payload.lastSummary,
  lastAuditSequence: payload.lastAuditSequence,
  severityCounts: payload.severityCounts,
  domainCounts: payload.domainCounts,
  statusCounts: payload.statusCounts,
});

const toNexusFeed = (payload: NexusSignalFeedPayload): RealModuleNexusFeed => ({
  summary: toNexusSummary(payload.summary),
  signals: Array.isArray(payload.signals) ? payload.signals.map(toNexusSignal) : [],
});

export const moduleRegistryService = {
  async listModules(): Promise<RealModuleRuntime[]> {
    const payload = await backendApi.supportListModules();
    return payload.map(toRuntime);
  },

  async saveModule(payload: SupportModuleUpsertPayload): Promise<RealModuleRuntime> {
    const saved = await backendApi.supportUpsertModule(payload);
    return toRuntime(saved);
  },

  async checkModules(moduleKey?: RealModuleKey): Promise<RealModuleRuntime[]> {
    const payload = await backendApi.supportCheckModules(moduleKey ? { moduleKey } : undefined);
    return payload.map(toRuntime);
  },

  async getModuleManifests(moduleKey?: RealModuleKey): Promise<RealModuleManifest[]> {
    const payload = await backendApi.supportModulesManifest(moduleKey ? { moduleKey } : undefined);
    return payload.map(toManifest);
  },

  async getNexusSignals(limit = 25): Promise<RealModuleNexusFeed> {
    const payload = await backendApi.supportNexusSignals(limit);
    return toNexusFeed(payload);
  },
};
