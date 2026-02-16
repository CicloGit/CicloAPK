import fs from 'node:fs';
import path from 'node:path';
import { openApiDocument } from './openApiDocument';

const outputPath = path.resolve(process.cwd(), 'docs/openapi.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));
console.log(`OpenAPI exportado em ${outputPath}`);
