import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const cache = new Map();
const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const transpileTree = (entry, outDir, seen = new Set()) => {
  if (seen.has(entry)) return;
  seen.add(entry);
  const source = fs.readFileSync(entry, 'utf8');
  const importPattern = /from\s+['"]((?:\.{1,2}\/|@\/)[^'"]+)['"]/g;
  let rewritten = source;
  for (const match of source.matchAll(importPattern)) {
    const spec0 = match[1].replace(/\.ts$/, '');
    const target = spec0.startsWith('@/') ? path.resolve(ROOT, 'src', spec0.slice(2)) : path.resolve(path.dirname(entry), spec0);
    const resolved = ['.ts', '/index.ts'].map((s) => target + s).find((p) => fs.existsSync(p));
    if (resolved) transpileTree(resolved, outDir, seen);
  }
  rewritten = source.replace(importPattern, (_m, spec) => {
    const clean = spec.replace(/\.ts$/, '');
    if (clean.startsWith('@/')) {
      const abs = path.resolve(ROOT, 'src', clean.slice(2));
      let rel = path.relative(path.dirname(entry), abs);
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `from '${rel}.js'`;
    }
    return `from '${clean}.js'`;
  });
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
  const cacheRoot = path.join(ROOT, 'node_modules', '.cache', 'apex-ts');
  fs.mkdirSync(cacheRoot, { recursive: true });
  const outDir = fs.mkdtempSync(path.join(cacheRoot, 'run-'));
  transpileTree(entry, outDir);
  const out = path.join(outDir, entry.replace(/^\//, '').replace(/\.ts$/, '.js'));
  fs.writeFileSync(path.join(outDir, 'package.json'), '{"type":"module"}');
  const mod = await import(pathToFileURL(out).href);
  cache.set(entry, mod);
  return mod;
};
