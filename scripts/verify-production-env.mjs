#!/usr/bin/env node

const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'VITE_BACKEND_BASE_URL',
  'VITE_USE_FIREBASE_EMULATORS',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'SETTLEMENT_PROVIDER',
];

const SUPPORT_MODULE_CHECKS = [
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

const parseBoolean = (value) => {
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

const parseSupportModuleConfig = (key) => {
  const prefix = `SUPPORT_MODULE_${key}`;
  const rawEnabled = String(process.env[`${prefix}_ENABLED`] ?? '').trim();
  const rawBaseUrl = String(process.env[`${prefix}_BASE_URL`] ?? '').trim();
  const rawManifestPath = String(process.env[`${prefix}_MANIFEST_PATH`] ?? '').trim();
  const rawEnv = String(process.env[`${prefix}_ENVIRONMENT`] ?? '').trim().toUpperCase();
  const rawAuthMode = String(process.env[`${prefix}_AUTH_MODE`] ?? 'NONE').trim().toUpperCase() || 'NONE';
  const rawCredentialRef = String(process.env[`${prefix}_CREDENTIAL_REF`] ?? '').trim();
  const hasConfig =
    Boolean(rawEnabled) ||
    Boolean(rawBaseUrl) ||
    Boolean(process.env[`${prefix}_HEALTH_PATH`]) ||
    Boolean(process.env[`${prefix}_ENVIRONMENT`]) ||
    Boolean(process.env[`${prefix}_AUTH_MODE`]) ||
    Boolean(process.env[`${prefix}_CREDENTIAL_REF`]) ||
    Boolean(process.env[`${prefix}_CAPABILITIES`]);

  const enabledFromEnv = parseBoolean(rawEnabled);
  const isEnabled = enabledFromEnv === null ? Boolean(rawBaseUrl) : enabledFromEnv;

  return {
    key,
    hasConfig,
    isEnabled: isEnabled,
    baseUrl: rawBaseUrl,
    manifestPath: rawManifestPath,
    environment: rawEnv,
    authMode: rawAuthMode,
    credentialRef: rawCredentialRef,
  };
};

const errors = [];

const get = (name) => String(process.env[name] ?? '').trim();

for (const key of REQUIRED_VARS) {
  if (!get(key)) {
    errors.push(`Missing required env: ${key}`);
  }
}

const useEmulators = get('VITE_USE_FIREBASE_EMULATORS').toLowerCase();
if (useEmulators && useEmulators !== 'false') {
  errors.push('VITE_USE_FIREBASE_EMULATORS must be "false" in production.');
}

const projectId = get('FIREBASE_PROJECT_ID');
const frontendProjectId = get('VITE_FIREBASE_PROJECT_ID');
if (projectId && frontendProjectId && projectId !== frontendProjectId) {
  errors.push('FIREBASE_PROJECT_ID and VITE_FIREBASE_PROJECT_ID must match.');
}

const backendBaseUrl = get('VITE_BACKEND_BASE_URL');
if (backendBaseUrl && projectId && !backendBaseUrl.includes(projectId)) {
  errors.push('VITE_BACKEND_BASE_URL must include FIREBASE_PROJECT_ID.');
}

const settlementProvider = get('SETTLEMENT_PROVIDER').toUpperCase();
if (settlementProvider !== 'FIRESTORE_LEDGER') {
  errors.push('SETTLEMENT_PROVIDER must be FIRESTORE_LEDGER in production.');
}

const enforceAppCheck = get('FUNCTIONS_ENFORCE_APP_CHECK');
if (enforceAppCheck && enforceAppCheck.toLowerCase() !== 'true') {
  errors.push('FUNCTIONS_ENFORCE_APP_CHECK must be "true" when explicitly configured.');
}

const supportModuleNexusGateway = get('SUPPORT_MODULE_NEXUS_GATEWAY_URL');
if (supportModuleNexusGateway && !supportModuleNexusGateway.startsWith('https://')) {
  errors.push('SUPPORT_MODULE_NEXUS_GATEWAY_URL must use HTTPS when set.');
}

for (const check of SUPPORT_MODULE_CHECKS) {
  const config = parseSupportModuleConfig(check.key);

  if (check.required && !config.baseUrl) {
    errors.push(`${check.label}: SUPPORT_MODULE_${check.key}_BASE_URL is required in production.`);
  }

  if (config.hasConfig || config.isEnabled) {
    if (config.authMode && !['NONE', 'BEARER', 'API_KEY'].includes(config.authMode)) {
      errors.push(`${check.label}: SUPPORT_MODULE_${check.key}_AUTH_MODE must be NONE, BEARER or API_KEY.`);
    }

    if (config.environment && !['HOMOLOGACAO', 'PRODUCAO', 'LOCAL'].includes(config.environment)) {
      errors.push(
        `${check.label}: SUPPORT_MODULE_${check.key}_ENVIRONMENT must be LOCAL, HOMOLOGACAO, or PRODUCAO.`
      );
    }

    if (config.baseUrl && !config.baseUrl.startsWith('https://')) {
      errors.push(`${check.label}: SUPPORT_MODULE_${check.key}_BASE_URL must use HTTPS.`);
    }

    if (config.manifestPath && !config.manifestPath.startsWith('/')) {
      errors.push(`${check.label}: SUPPORT_MODULE_${check.key}_MANIFEST_PATH must be a path starting with '/'.`);
    }

    if (config.isEnabled && config.baseUrl && config.authMode !== 'NONE' && !config.credentialRef) {
      errors.push(
        `${check.label}: SUPPORT_MODULE_${check.key}_CREDENTIAL_REF is required when AUTH_MODE is not NONE.`
      );
    }

    if (config.isEnabled && !config.baseUrl && config.authMode !== 'NONE') {
      errors.push(`${check.label}: SUPPORT_MODULE_${check.key}_BASE_URL is required for AUTH_MODE ${config.authMode}.`);
    }
  }

  if (config.baseUrl === '' && !check.required && !config.hasConfig) {
    continue;
  }

  if (!config.baseUrl && config.isEnabled) {
    errors.push(`${check.label}: support module enabled but without base URL.`);
  }
}

  if (errors.length > 0) {
  console.error(`[production-env] FAIL: ${errors.length} issue(s) found.`);
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('[production-env] OK: required production environment variables validated.');
