#!/usr/bin/env node
// Renders a diagram to PNG in the background (headless, no visible window)
// using the official mermaid.js CDN build + system Chrome — for the AGENT's
// own visual verification (Read + vision), not a human-facing artifact.
// Not part of the automatic Paso 5 flow — invoke on demand when a visual
// check is actually useful (debugging a layout issue, confirming a fix).
//
// Usage: node screenshot.mjs <file.md | file.mmd> <output.png> [width] [height]
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , inputPath, outputPath, widthArg, heightArg] = process.argv;

if (!inputPath || !outputPath) {
  console.error('Usage: node screenshot.mjs <file.md | file.mmd> <output.png> [width] [height]');
  process.exit(1);
}

const width = widthArg || '2000';
const height = heightArg || '1400';

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

const html = `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;">
<pre class="mermaid">
${code}
</pre>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true });</script>
</body></html>
`;

const tempHtml = join(tmpdir(), `architecture-map-screenshot-${Date.now()}.html`);
writeFileSync(tempHtml, html, 'utf-8');

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
];

let chromeBin = null;
for (const candidate of CHROME_CANDIDATES) {
  if (candidate.startsWith('/')) {
    if (existsSync(candidate)) {
      chromeBin = candidate;
      break;
    }
  } else {
    try {
      execFileSync('which', [candidate], { stdio: 'ignore' });
      chromeBin = candidate;
      break;
    } catch {
      // not found, try next
    }
  }
}

if (!chromeBin) {
  console.error('No se encontró Chrome/Chromium instalado. No se puede tomar el screenshot.');
  unlinkSync(tempHtml);
  process.exit(1);
}

try {
  execFileSync(
    chromeBin,
    [
      '--headless',
      '--disable-gpu',
      '--virtual-time-budget=6000',
      `--screenshot=${outputPath}`,
      `--window-size=${width},${height}`,
      `file://${tempHtml}`,
    ],
    { stdio: 'ignore' },
  );
  console.log(`wrote ${outputPath}`);
} catch (e) {
  console.error('Falló el render:', e.message);
  process.exit(1);
} finally {
  unlinkSync(tempHtml);
}
