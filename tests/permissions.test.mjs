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
const P = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('V2 routes: payroll/saturday screens only for admin, super_admin, finance', () => {
  for (const path of ['/admin/samstag', '/admin/lohn', '/admin/finanz-unterakkord']) {
    for (const role of ['admin', 'super_admin', 'finance']) assert.equal(P.canAccessRoute(role, path), true, `${role} ${path}`);
    for (const role of ['project_manager', 'viewer', 'worker', 'team_leader', null]) assert.equal(P.canAccessRoute(role, path), false, `${role} ${path}`);
  }
});
test('V2 routes: approvals for admin, super_admin, project_manager only', () => {
  for (const path of ['/admin/stunden', '/admin/tagesrapporte', '/admin/urlaub']) {
    for (const role of ['admin', 'super_admin', 'project_manager']) assert.equal(P.canAccessRoute(role, path), true);
    for (const role of ['finance', 'viewer', 'worker', 'team_leader']) assert.equal(P.canAccessRoute(role, path), false);
  }
});
test('team leaders and workers are routed to the portal and never see admin screens', () => {
  assert.equal(P.homeRouteForRole('worker'), '/portal');
  assert.equal(P.homeRouteForRole('team_leader'), '/portal');
  assert.equal(P.homeRouteForRole('admin'), '/admin/dashboard');
  assert.equal(P.canAccessRoute('team_leader', '/admin/projects'), false);
  assert.equal(P.canAccessRoute('team_leader', '/admin/dashboard'), false);
  assert.equal(P.canPaySaturday('finance'), false);
  assert.equal(P.canPaySaturday('admin'), true);
  assert.equal(P.canEditPayroll('finance'), false);
});
