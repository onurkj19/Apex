import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const cache = new Map();

const transpileTree = (entry, outDir, seen = new Set()) => {
  if (seen.has(entry)) return;
  seen.add(entry);
  const source = fs.readFileSync(entry, 'utf8');
  const importPattern = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
  let rewritten = source;
  for (const match of source.matchAll(importPattern)) {
    const target = path.resolve(path.dirname(entry), match[1].replace(/\.ts$/, ''));
    const resolved = ['.ts', '/index.ts'].map((s) => target + s).find((p) => fs.existsSync(p));
    if (resolved) transpileTree(resolved, outDir, seen);
  }
  rewritten = source.replace(importPattern, (_m, spec) => `from '${spec.replace(/\.ts$/, '')}.js'`);
  const js = ts.transpileModule(rewritten, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const rel = entry.replace(/^\//, '').replace(/\.ts$/, '.js');
  const out = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, js);
};

/** Loads a TypeScript module (and its relative imports) without a build step. */
export const loadTs = async (relativeToRoot) => {
  const entry = path.resolve(new URL('../../', import.meta.url).pathname, relativeToRoot);
  if (cache.has(entry)) return cache.get(entry);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-ts-'));
  transpileTree(entry, outDir);
  const out = path.join(outDir, entry.replace(/^\//, '').replace(/\.ts$/, '.js'));
  fs.writeFileSync(path.join(outDir, 'package.json'), '{"type":"module"}');
  const mod = await import(pathToFileURL(out).href);
  cache.set(entry, mod);
  return mod;
};
