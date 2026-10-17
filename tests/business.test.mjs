import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(file) {
 const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
 return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
const {toIsoDate}=await load('../src/lib/erp/time.ts');
test('work date is Zurich date even when UTC is the previous day',()=>{
 assert.equal(toIsoDate(new Date('2026-07-01T22:30:00Z')),'2026-07-02');
 assert.equal(toIsoDate(new Date('2026-01-01T23:30:00Z')),'2026-01-02');
});

const {paymentSummary}=await load('../src/lib/payment-summary.ts');
test('unverified and not-received automatic entries never count as confirmed receipts',()=>{
 const row=(amount,status)=>({amount,finance_type:'income',payment_reconciliation:status?{status}:null});
 assert.deepEqual(paymentSummary([row(1000),row(500,'confirmed'),row(800,'unverified'),row(200,'not_received'),{amount:99,finance_type:'expense'}]),{recorded:2500,confirmed:1500,unverified:800,notReceived:200});
});
