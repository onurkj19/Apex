// Mock-backed UI smoke test. Uses an in-memory Supabase stand-in: it does NOT enforce RLS or DB rules.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:5199/';
const OUT = process.env.E2E_OUT || 'e2e/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/google-chrome', args: ['--no-sandbox'] });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`); };

async function open(role, route, viewport) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}?role=${role}#${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const calls = (page) => page.evaluate(() => window.__calls);
const mobile = { width: 390, height: 844 };
const desktop = { width: 1366, height: 900 };

for (const [route, text] of [['/portal', null], ['/portal/stunden', null], ['/portal/rapport', null], ['/portal/urlaub', null], ['/portal/mehr', null]]) {
  const { ctx, page, errors } = await open('worker', route, mobile);
  const body = (await page.textContent('body')) || '';
  await page.screenshot({ path: `${OUT}/worker${route.replace(/\//g, '_')}.png` });
  check(`worker ${route} renders`, body.length > 50 && errors.length === 0, errors.join(' | '));
  await ctx.close();
}

{
  const { ctx, page, errors } = await open('worker', '/portal/stunden', mobile);
  const body = (await page.textContent('body')) || '';
  check('worker hours page lists seeded entries', /Bahnhofstrasse|U-1001|Kunde AG/.test(body));
  const btn = page.getByRole('button', { name: /erfassen|speichern|einreichen|hinzufügen/i }).first();
  check('worker hours page has an action button', (await btn.count()) > 0);
  await ctx.close();
}

{
  const { ctx, page, errors } = await open('worker', '/portal/rapport', mobile);
  const body = (await page.textContent('body')) || '';
  check('worker report page shows seeded report', /R-5|Tagesrapport/.test(body));
  await ctx.close();
}

const adminRoutes = ['stunden', 'tagesrapporte', 'samstag', 'lohn', 'unterakkord', 'finanz-unterakkord', 'urlaub', 'kalender', 'pdf-berichte'];
for (const r of adminRoutes) {
  const { ctx, page, errors } = await open('admin', `/admin/${r}`, desktop);
  const body = (await page.textContent('body')) || '';
  await page.screenshot({ path: `${OUT}/admin_${r}.png` });
  check(`admin /${r} renders without console errors`, body.length > 100 && errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

{
  const { ctx, page } = await open('admin', '/admin/samstag', desktop);
  await page.locator('input[type=month]').first().fill('2026-07');
  await page.waitForTimeout(600);
  const body = (await page.textContent('body')) || '';
  check('saturday page shows seeded payment (210.00)', /210[.,]00|Arben/.test(body));
  const pay = page.getByRole('button', { name: /als bar bezahlt markieren/i }).first();
  if (await pay.count()) {
    const cb = page.locator('input[type=checkbox]').first();
    if (await cb.count()) await cb.check().catch(() => {});
    await pay.click().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/admin_samstag_dialog.png` });
    const confirm = page.getByRole('button', { name: /bestätigen|bezahlt|speichern/i }).last();
    if (await confirm.count()) await confirm.click().catch(() => {});
    await page.waitForTimeout(500);
    const c = await calls(page);
    check('saturday: mark-paid invokes mark_saturday_paid RPC', c.some((x) => x.fn === 'rpc:mark_saturday_paid'));
  } else check('saturday: "Als bar bezahlt markieren" button present', false);
  await ctx.close();
}

{
  const { ctx, page } = await open('admin', '/admin/pdf-berichte', desktop);
  await page.locator('input[type=month]').first().fill('2026-07');
  await page.locator('select').nth(1).selectOption({ index: 1 });
  await page.waitForTimeout(400);
  const gen = page.getByRole('button', { name: /pdf herunterladen/i }).first();
  if (await gen.count()) {
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await gen.click().catch(() => {});
    const d = await dl;
    check('pdf-berichte: PDF download triggered', !!d && /\.pdf$/i.test(d.suggestedFilename()), d ? d.suggestedFilename() : 'no download');
    if (d) { const p = `${OUT}/${d.suggestedFilename()}`; await d.saveAs(p); const head = fs.readFileSync(p).subarray(0, 5).toString(); check('downloaded file is a PDF', head === '%PDF-'); }
  } else check('pdf-berichte: PDF button present', false);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
