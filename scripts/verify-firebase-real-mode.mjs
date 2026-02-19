#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const appDir = path.join(repoRoot, 'Nova pasta');

const targetDirs = [
  path.join(appDir, 'services'),
  path.join(appDir, 'components'),
  path.join(appDir, 'config'),
  path.join(appDir, 'contexts'),
];

const fileExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const findings = [];

function getEnsureSeedBody(content) {
  const token = 'async function ensureSeedData()';
  const start = content.indexOf(token);
  if (start === -1) {
    return null;
  }

  const openBrace = content.indexOf('{', start);
  if (openBrace === -1) {
    return null;
  }

  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < content.length; i += 1) {
    const char = content[i];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) {
    return null;
  }

  return content.slice(openBrace + 1, end - 1);
}

function walk(currentDir) {
  if (!fs.existsSync(currentDir)) {
    return;
  }

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!fileExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(repoRoot, fullPath);

    if (entry.name === 'constants.ts') {
      findings.push({
        file: relPath,
        line: 1,
        reason: 'Arquivo legado de mocks detectado (constants.ts)',
      });
    }

    lines.forEach((line, index) => {
      if (/from ['"]\.\.\/constants['"]/.test(line) || /from ['"]\.\.\/\.\.\/constants['"]/.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          reason: 'Importa mock de constants',
        });
      }

      if (/return\s+seed[A-Za-z0-9_]+/.test(line) || /\?\?\s*seed[A-Za-z0-9_]+/.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          reason: 'Retorna fallback seed local',
        });
      }

      if (/\blet\s+seeded\s*=\s*false\b/.test(line) || /\basync function ensureSeedData\s*\(/.test(line) || /\bawait ensureSeedData\s*\(/.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          reason: 'Mecanismo de seed local detectado',
        });
      }

      if (
        /\bconst\s+seed[A-Z][A-Za-z0-9_]*\s*:\s*[^=]+\s*=\s*\[/.test(line) ||
        /\bconst\s+seed[A-Z][A-Za-z0-9_]*\s*=\s*\[/.test(line) ||
        /\bconst\s+seed[A-Z][A-Za-z0-9_]*\s*:\s*[^=]+\s*=\s*\{/.test(line)
      ) {
        findings.push({
          file: relPath,
          line: index + 1,
          reason: 'Dataset seed local detectado',
        });
      }

      if (/\bmock[A-Z][A-Za-z0-9_]+\b/.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          reason: 'Referencia a mock local detectada',
        });
      }
    });

    const ensureSeedBody = getEnsureSeedBody(content);
    if (ensureSeedBody && /\b(setDoc|addDoc|updateDoc|deleteDoc|runTransaction)\s*\(/.test(ensureSeedBody)) {
      findings.push({
        file: path.relative(repoRoot, fullPath),
        line: 1,
        reason: 'ensureSeedData escreve dados (seed automatico)',
      });
    }
  }
}

for (const dir of targetDirs) {
  walk(dir);
}

if (findings.length === 0) {
  console.log('[real-mode] OK: nenhum mock/seed local detectado nos modulos auditados.');
  process.exit(0);
}

console.error(`[real-mode] FAIL: ${findings.length} ocorrencias de mock detectadas.`);
for (const finding of findings) {
  console.error(` - ${finding.file}:${finding.line} -> ${finding.reason}`);
}

if (process.env.ALLOW_MOCKS_IN_PRODUCTION === '1') {
  console.warn('[real-mode] WARNING: bypass ativo via ALLOW_MOCKS_IN_PRODUCTION=1.');
  process.exit(0);
}

console.error(
  '[real-mode] Bloqueando deploy de producao. Migre os modulos para Firebase real ou use bypass controlado.'
);
process.exit(1);
