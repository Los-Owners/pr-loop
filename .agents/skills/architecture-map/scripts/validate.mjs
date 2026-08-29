#!/usr/bin/env node
// Validates one Mermaid source file against the official mermaid.js parser
// (the same engine GitHub/GitLab/most editors use). Uses a jsdom shim
// because mermaid's flowchart/class/ER/state parsers sanitize labels via
// DOMPurify internally, which needs a window/document — sequenceDiagram
// alone doesn't hit that path, but the others do.
// Usage: node validate.mjs <input.mmd>
// Exit code 0 + "OK" on stdout if valid. Exit code 1 + the parser's error
// message on stderr if invalid.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const mermaid = (await import('mermaid')).default;

const [, , inputPath] = process.argv;

if (!inputPath) {
  console.error('Usage: node validate.mjs <input.mmd>');
  process.exit(1);
}

const source = readFileSync(inputPath, 'utf-8');

try {
  await mermaid.parse(source);
  console.log('OK');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
