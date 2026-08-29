#!/usr/bin/env node
// Opens a diagram in mermaid.live (the official live editor) with the
// content pre-loaded — no manual copy-paste. Encodes the state exactly like
// mermaid-live-editor does: JSON -> deflate (pako, level 9) -> base64url,
// prefixed "pako:", as the URL hash. Reverse-engineered from
// mermaid-js/mermaid-live-editor's src/lib/util/serde.ts and
// src/lib/types.d.ts (State interface).
//
// Usage: node open-live.mjs <file.md | file.mmd>
// If given a .md, extracts the first ```mermaid fence. If given a .mmd,
// uses the file content as-is.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { deflate } from 'pako';
import { fromUint8Array } from 'js-base64';

const inputPath = process.argv[2];

if (!inputPath || !existsSync(inputPath)) {
  console.error('Usage: node open-live.mjs <file.md | file.mmd>');
  process.exit(1);
}

const raw = readFileSync(inputPath, 'utf-8');

let code;
if (inputPath.endsWith('.md')) {
  const match = raw.match(/```mermaid\n([\s\S]*?)```/);
  if (!match) {
    console.error(`No se encontró un bloque \`\`\`mermaid en ${inputPath}`);
    process.exit(1);
  }
  code = match[1];
} else {
  code = raw;
}

const state = {
  code,
  mermaid: '{}',
  updateDiagram: true,
  rough: false,
  autoSync: true,
};

const json = JSON.stringify(state);
const compressed = deflate(new TextEncoder().encode(json), { level: 9 });
const serialized = fromUint8Array(compressed, true);
const url = `https://mermaid.live/edit#pako:${serialized}`;

console.log(url);

try {
  execFileSync('open', [url], { stdio: 'ignore' });
} catch {
  console.error('No se pudo abrir el navegador automáticamente. Copiá la URL de arriba.');
}
