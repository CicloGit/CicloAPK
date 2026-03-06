#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseProjectIdFromBaseUrl = (value) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return '';
  }
  const match = normalized.match(/https:\/\/[a-z0-9-]+-([a-z0-9-]+)\.cloudfunctions\.net/i);
  return match?.[1] ?? '';
};

const parseProjectIdFromFirebaserc = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    return String(parsed?.projects?.default ?? '').trim();
  } catch {
    return '';
  }
};

const resolveProjectId = () => {
  const envProject = String(process.env.FIREBASE_PROJECT_ID ?? '').trim();
  if (envProject) return envProject;

  const viteProject = String(process.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  if (viteProject) return viteProject;

  const fromApiBase =
    parseProjectIdFromBaseUrl(process.env.GO_LIVE_API_BASE_URL) ||
    parseProjectIdFromBaseUrl(process.env.VITE_BACKEND_BASE_URL);
  if (fromApiBase) return fromApiBase;

  const candidates = [
    path.join(process.cwd(), '.firebaserc'),
    path.join(process.cwd(), 'Nova pasta', '.firebaserc'),
    path.join(__dirname, '..', 'Nova pasta', '.firebaserc'),
  ];

  for (const candidate of candidates) {
    const fromFile = parseProjectIdFromFirebaserc(candidate);
    if (fromFile) {
      return fromFile;
    }
  }

  return '';
};

const projectId = resolveProjectId();

const webUrl = String(
  process.env.GO_LIVE_WEB_URL ||
    (projectId ? `https://${projectId}.web.app` : '')
).trim();
const apiBase = String(
  process.env.GO_LIVE_API_BASE_URL ||
    process.env.VITE_BACKEND_BASE_URL ||
    (projectId ? `https://us-central1-${projectId}.cloudfunctions.net/api` : '')
).trim();
const agroBase = String(
  process.env.GO_LIVE_AGRO_BASE_URL ||
    (projectId ? `https://us-central1-${projectId}.cloudfunctions.net/agroApi` : '')
).trim();
const marketHealthUrl = String(
  process.env.GO_LIVE_MARKET_HEALTH_URL ||
    (projectId ? `https://us-central1-${projectId}.cloudfunctions.net/api/v1/market/health` : '')
).trim();
const marketSummaryUrl = String(
  process.env.GO_LIVE_MARKET_SUMMARY_URL ||
    (projectId ? `https://us-central1-${projectId}.cloudfunctions.net/api/v1/public/market/summary` : '')
).trim();
const supportManifestUrl = String(
  process.env.GO_LIVE_SUPPORT_MANIFEST_URL ||
    (projectId ? `https://us-central1-${projectId}.cloudfunctions.net/api/v1/support/manifest` : '')
).trim();

const required = [
  ['GO_LIVE_WEB_URL', webUrl],
  ['GO_LIVE_API_BASE_URL', apiBase],
  ['GO_LIVE_AGRO_BASE_URL', agroBase],
  ['GO_LIVE_MARKET_HEALTH_URL', marketHealthUrl],
  ['GO_LIVE_MARKET_SUMMARY_URL', marketSummaryUrl],
  ['GO_LIVE_SUPPORT_MANIFEST_URL', supportManifestUrl],
];

const supportModuleNexusGateway = String(process.env.SUPPORT_MODULE_NEXUS_GATEWAY_URL ?? '').trim();
if (supportModuleNexusGateway && !supportModuleNexusGateway.startsWith('https://')) {
  console.error('[go-live-smoke] FAIL: SUPPORT_MODULE_NEXUS_GATEWAY_URL must use HTTPS.');
  process.exit(1);
}

const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length > 0) {
  console.error(`[go-live-smoke] FAIL: missing endpoint env(s): ${missing.join(', ')}`);
  process.exit(1);
}

const withTimeout = async (fn, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const fetchText = async (url) => withTimeout(async (signal) => {
  const res = await fetch(url, { method: 'GET', signal });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
});

const fetchJson = async (url) => withTimeout(async (signal) => {
  const res = await fetch(url, { method: 'GET', signal });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
});

const fetchJsonPost = async (url, body = {}) => withTimeout(async (signal) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
});

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseBool = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return null;
};

const normalizeModuleBaseUrl = (value) => String(value ?? '').trim().replace(/\/+$/, '');

const supportModuleSmokeChecks = [
  {
    key: 'ERP_CORE',
    required: false,
    label: 'ERP Core',
  },
  {
    key: 'MPV_CICLO',
    required: true,
    label: 'MPV Ciclo',
  },
  {
    key: 'CEREBRO_NEXUS',
    required: false,
    label: 'Cerebro Nexus',
  },
];

const resolveSupportModuleTarget = (spec) => {
  const prefix = `SUPPORT_MODULE_${spec.key}`;
  const rawEnabled = process.env[`${prefix}_ENABLED`];
  const baseUrl = normalizeModuleBaseUrl(process.env[`${prefix}_BASE_URL`] ?? '');
  const healthPath = String(process.env[`${prefix}_HEALTH_PATH`] ?? '/health').trim() || '/health';
  const manifestPath = String(process.env[`${prefix}_MANIFEST_PATH`] ?? '/manifest').trim() || '/manifest';
  const enabled = parseBool(rawEnabled);

  return {
    key: spec.key,
    label: spec.label,
    required: spec.required,
    baseUrl,
    healthPath: healthPath.startsWith('/') ? healthPath : `/${healthPath}`,
    manifestPath: manifestPath.startsWith('/') ? manifestPath : `/${manifestPath}`,
    isEnabled: enabled === null ? Boolean(baseUrl) : enabled,
    shouldCheck: spec.required || enabled === true || (Boolean(baseUrl) && enabled !== false),
  };
};

const buildModuleChecks = () => {
  const checks = [];

  for (const spec of supportModuleSmokeChecks) {
    const config = resolveSupportModuleTarget(spec);
    if (!config.shouldCheck) {
      continue;
    }

    const target = `${config.baseUrl}${config.healthPath}`;
    checks.push({
      name: `support-${spec.key.toLowerCase()}`,
      run: async () => {
        assert(Boolean(config.baseUrl), `${config.label} base URL not configured.`);
        const response = await fetchJson(target);
        assert(response.ok, `${config.label} health failed (${response.status})`);
        assert(
          response.json && typeof response.json.status === 'string',
          `${config.label} health payload missing status.`
        );
      },
    });
    checks.push({
      name: `support-${spec.key.toLowerCase()}-manifest`,
      run: async () => {
        assert(Boolean(config.baseUrl), `${config.label} base URL not configured.`);
        const manifestUrl = `${config.baseUrl}${config.manifestPath}`;
        const manifestResponse = await fetchJson(manifestUrl);
        assert(manifestResponse.ok, `${config.label} manifest failed (${manifestResponse.status})`);
        assert(manifestResponse.json !== null, `${config.label} manifest payload empty.`);
      },
    });
  }

  if (supportModuleNexusGateway) {
    const gatewayBase = supportModuleNexusGateway.replace(/\/+$/, '');
    checks.push({
      name: 'support-nexus-gateway-health',
      run: async () => {
        const response = await fetchJsonPost(`${gatewayBase}/v1/support/modules/health`, {});
        assert(response.ok, `Support Nexus gateway health failed (${response.status})`);
        assert(Array.isArray(response.json?.data), 'Support Nexus gateway health payload.data should be an array.');
      },
    });
    checks.push({
      name: 'support-nexus-gateway-manifest',
      run: async () => {
        const response = await fetchJsonPost(`${gatewayBase}/v1/support/modules/manifest`, {});
        assert(response.ok, `Support Nexus gateway manifest failed (${response.status})`);
        assert(Array.isArray(response.json?.data), 'Support Nexus gateway manifest payload.data should be an array.');
      },
    });
  }

  return checks;
};

const checks = [
  {
    name: 'hosting-web',
    run: async () => {
      const response = await fetchText(webUrl);
      assert(response.ok, `web app unavailable (${response.status})`);
      assert(
        response.text.includes('<html') || response.text.includes('<!doctype html'),
        'web app response does not look like HTML'
      );
    },
  },
  {
    name: 'api-health',
    run: async () => {
      const response = await fetchJson(`${apiBase.replace(/\/$/, '')}/health`);
      assert(response.ok, `api health failed (${response.status})`);
      assert(response.json && response.json.status === 'ok', 'api health payload missing status=ok');
    },
  },
  {
    name: 'agro-health',
    run: async () => {
      const response = await fetchJson(`${agroBase.replace(/\/$/, '')}/health`);
      assert(response.ok, `agro health failed (${response.status})`);
      assert(response.json && response.json.status === 'ok', 'agro health payload missing status=ok');
    },
  },
  {
    name: 'market-health',
    run: async () => {
      const response = await fetchJson(marketHealthUrl);
      assert(response.ok, `market health failed (${response.status})`);
      assert(response.json && response.json.data, 'market health payload missing data');
    },
  },
  {
    name: 'public-market-summary',
    run: async () => {
      const response = await fetchJson(marketSummaryUrl);
      assert(response.ok, `public market summary failed (${response.status})`);
      assert(
        response.json && response.json.data && response.json.data.countsByCategory,
        'public market summary payload missing countsByCategory'
      );
    },
  },
  {
    name: 'support-manifest',
    run: async () => {
      const response = await fetchJson(supportManifestUrl);
      assert(response.ok, `support manifest failed (${response.status})`);
      assert(response.json && response.json.data, 'support manifest payload missing data');
      assert(response.json.data.moduleKey === 'ERP_CORE', 'support manifest payload missing moduleKey=ERP_CORE');
    },
  },
  ...buildModuleChecks(),
];

const failures = [];
for (const check of checks) {
  try {
    await check.run();
    console.log(`[go-live-smoke] OK: ${check.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${check.name}: ${message}`);
    console.error(`[go-live-smoke] FAIL: ${check.name} -> ${message}`);
  }
}

if (failures.length > 0) {
  console.error(`[go-live-smoke] FAIL: ${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log('[go-live-smoke] OK: all checks passed.');
