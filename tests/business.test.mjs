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

const {monthWindow,comparablePeriods,periodSummary,receivedByProject,isConfirmedReceipt}=await load('../src/lib/payment-summary.ts');
test('month boundaries handle December and reject invalid months',()=>{
 assert.deepEqual(monthWindow('2026-12'),{start:'2026-12-01',end:'2027-01-01'});
 assert.throws(()=>monthWindow('2026-13'));
});
test('month-to-date comparisons use the same day count including leap years',()=>{
 assert.equal(comparablePeriods('2026-03-31').previousEnd,'2026-02-28');
 assert.equal(comparablePeriods('2024-03-31').previousEnd,'2024-02-29');
 assert.equal(comparablePeriods('2026-01-17').previousStart,'2025-12-01');
 assert.equal(comparablePeriods('2026-10-17').previousEnd,'2026-09-17');
});
test('period summary includes final calendar day and excludes next month',()=>{
 const rows=[{amount:100,finance_type:'income',finance_date:'2026-09-30'}, {amount:500,finance_type:'income',finance_date:'2026-10-01'}, {amount:20,finance_type:'expense',finance_date:'2026-09-30'}];
 assert.equal(periodSummary(rows,'2026-09-01','2026-09-30').cashFlow,80);
});
test('project receipts exclude unverified records in object and array relationship shapes',()=>{
 const rows=[{project_id:'a',amount:0.1,finance_type:'income'}, {project_id:'a',amount:0.2,finance_type:'income'}, {project_id:'a',amount:99,finance_type:'income',payment_reconciliation:[{status:'unverified'}]}, {project_id:'a',amount:5,finance_type:'income',payment_reconciliation:{status:'not_received'}}];
 assert.deepEqual(receivedByProject(rows),{a:0.3});
 assert.equal(isConfirmedReceipt({amount:1,finance_type:'income',payment_reconciliation:[{status:'confirmed'}]}),true);
 assert.throws(()=>paymentSummary([{amount:'NaN',finance_type:'income'}]));
});
