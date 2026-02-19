import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [,, csvArg] = process.argv;
if (!csvArg) {
  console.error('Uso: node set-claims-batch.mjs <arquivo.csv>');
  process.exit(1);
}

const csvPath = path.resolve(process.cwd(), csvArg);
if (!fs.existsSync(csvPath)) {
  console.error(`CSV nao encontrado: ${csvPath}`);
  process.exit(1);
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const auth = getAuth();
const db = getFirestore();

const parseCsv = (content) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });
    row.__line = index + 2;
    return row;
  });
};

const normalizeRole = (rawRole) => {
  const value = String(rawRole || 'PRODUCER')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const roleMap = {
    PRODUCER: 'PRODUCER',
    PRODUTOR: 'PRODUCER',
    SUPPLIER: 'SUPPLIER',
    FORNECEDOR: 'SUPPLIER',
    INTEGRATOR: 'INTEGRATOR',
    INTEGRADORA: 'INTEGRATOR',
    TECHNICIAN: 'TECHNICIAN',
    TECNICO: 'TECHNICIAN',
    INVESTOR: 'INVESTOR',
    INVESTIDOR: 'INVESTOR',
    MANAGER: 'MANAGER',
    GESTOR: 'MANAGER',
    TRAFFIC_MANAGER: 'TRAFFIC_MANAGER',
    OPERATOR: 'OPERATOR',
    OPERADOR: 'OPERATOR',
    ADMIN: 'ADMIN',
    ADMINISTRADOR: 'ADMIN',
  };

  return roleMap[value] ?? null;
};

const profileRoleFromClaims = (claimsRole) => {
  const map = {
    PRODUCER: 'Produtor',
    SUPPLIER: 'Fornecedor',
    INTEGRATOR: 'Integradora',
    TECHNICIAN: 'Técnico',
    INVESTOR: 'Investidor',
    MANAGER: 'Gestor',
    TRAFFIC_MANAGER: 'Gestor de Trafego',
    OPERATOR: 'Operador',
    ADMIN: 'Administrador',
  };
  return map[claimsRole] ?? 'Produtor';
};

const toBoolean = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'y'].includes(normalized);
};

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
if (rows.length === 0) {
  console.error('CSV sem linhas validas.');
  process.exit(1);
}

let success = 0;
let failed = 0;

for (const row of rows) {
  const uid = String(row.uid ?? '').trim();
  const tenantId = String(row.tenantId ?? '').trim();
  const role = normalizeRole(row.role);
  const seedProducer = toBoolean(row.seedProducer);

  if (!uid || !tenantId || !role) {
    failed += 1;
    console.error(
      `[linha ${row.__line}] ignorada: uid/tenantId/role invalidos -> uid=${uid}, tenantId=${tenantId}, role=${row.role}`
    );
    continue;
  }

  const claims = {
    role,
    tenantId,
    producerScopes: role === 'PRODUCER' ? { seedProducer } : {},
  };

  try {
    await auth.setCustomUserClaims(uid, claims);
    await db.collection('users').doc(uid).set(
      {
        role: profileRoleFromClaims(role),
        tenantId,
        producerScopes: claims.producerScopes,
        claimsUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    success += 1;
    console.log(`[ok] uid=${uid} role=${role} tenantId=${tenantId} seedProducer=${seedProducer}`);
  } catch (error) {
    failed += 1;
    console.error(`[erro] uid=${uid}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\nResumo: ${success} sucesso(s), ${failed} falha(s).`);
process.exit(failed > 0 ? 2 : 0);

