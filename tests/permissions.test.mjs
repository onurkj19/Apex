import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/permissions.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { canAccessRoute, canDeleteFinance } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('workers have only their dashboard; no shop or finance access', () => {
  assert.equal(canAccessRoute('worker', '/admin/dashboard'), true);
  for (const path of ['/admin/shop-orders','/admin/shop-products','/admin/finances','/admin/settings']) assert.equal(canAccessRoute('worker',path),false);
});
test('only administrators manage the shop', () => {
  for (const role of ['finance','project_manager','viewer','worker',null]) assert.equal(canAccessRoute(role,'/admin/shop-orders'),false);
  for (const role of ['admin','super_admin']) assert.equal(canAccessRoute(role,'/admin/shop-orders'),true);
});
test('approval and financial controls remain restricted', () => {
  assert.equal(canAccessRoute('admin','/admin/work-approvals'),false);
  assert.equal(canAccessRoute('super_admin','/admin/work-approvals'),true);
  assert.equal(canAccessRoute('project_manager','/admin/finances'),false);
  assert.equal(canDeleteFinance('worker'),false);
  assert.equal(canDeleteFinance('admin'),true);
});
