import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function projectApiMock({ error = null } = {}) {
  const calls = [];
  const chain = new Proxy({}, {
    get(_, method) {
      if (method === 'then') return resolve => resolve({ data: [], error });
      return (...args) => { calls.push([method, ...args]); return chain; };
    },
  });
  let source = await readFile(new URL('../src/lib/erp/projects.ts', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const notifications = [];
  const prefix = `const supabase = globalThis.__projectRecoveryMock; const createAdminChangeNotification = (...args) => globalThis.__projectRecoveryNotifications.push(args);`;
  globalThis.__projectRecoveryMock = { from: () => chain, auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) } };
  globalThis.__projectRecoveryNotifications = notifications;
  const { projectApi } = await import('data:text/javascript;base64,' + Buffer.from(prefix + js).toString('base64') + '#' + Math.random());
  return { api: projectApi, calls, notifications };
}

test('opening the recycle bin only reads projects, even old deleted projects', async () => {
  const { api, calls } = await projectApiMock();
  await api.listDeleted();
  assert.equal(calls.some(([method]) => ['delete', 'update', 'insert'].includes(method)), false);
  assert.equal('purgeExpiredDeletedProjects' in api, false);
  const page = await readFile(new URL('../src/pages/admin/RecycleBinPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /purgeExpiredDeletedProjects|\.delete\(/);
});

test('removing and restoring a project only change its deletion marker and verify an affected row', async () => {
  const { api, calls } = await projectApiMock();
  await api.remove('project-1');
  await api.restore('project-1');
  assert.equal(calls.some(([method]) => method === 'delete'), false);
  const updates = calls.filter(([method]) => method === 'update');
  assert.deepEqual(Object.keys(updates[0][1]).sort(), ['deleted_at', 'deleted_by']);
  assert.deepEqual(updates[1][1], { deleted_at: null, deleted_by: null });
  assert.equal(calls.filter(([method]) => method === 'single').length, 2);
});

test('a denied or stale restore fails without a success notification', async () => {
  const failure = new Error('No matching authorized row');
  const { api, notifications } = await projectApiMock({ error: failure });
  await assert.rejects(api.restore('project-1'), failure);
  assert.equal(notifications.length, 0);
});
