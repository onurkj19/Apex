import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const shared={};new Function('exports',compile('../src/lib/payment-summary.ts'))(shared);
function setup() {
 let handler;const writes=[];let fromCalls=0;
 const source={
  projects:[{id:'p',status:'I perfunduar',deleted_at:null}],
  finances:[{id:'a',amount:200,finance_type:'income',finance_date:'2026-09-30'}, {id:'b',amount:800,finance_type:'income',finance_date:'2026-09-10',payment_reconciliation:{status:'unverified'}}, {id:'c',amount:40,finance_type:'expense',finance_date:'2026-09-30'}, {id:'d',amount:500,finance_type:'income',finance_date:'2026-10-01'}],
  work_logs:[{id:'w',work_date:'2026-09-30',hours_worked:8,total_amount:400}],
 };
 const client={auth:{getUser:async token=>token==='invalid'?{error:new Error('invalid'),data:{user:null}}:{error:null,data:{user:{id:token}}}},from(table){
  fromCalls++;let filters=[];let start=0,end=Infinity;let insert;
  const q={select(){return q},is(k,v){filters.push(row=>(row[k]??null)===v);return q},eq(k,v){filters.push(row=>row[k]===v);return q},gte(k,v){filters.push(row=>row[k]>=v);return q},lt(k,v){filters.push(row=>row[k]<v);return q},lte(k,v){filters.push(row=>row[k]<=v);return q},order(){return q},range(a,b){start=a;end=b;return q},upsert(value){insert=value;return q},update(value){insert=value;return q},single:async()=>({data:{role:'worker',is_active:true},error:null}),maybeSingle:async()=>({data:null,error:null}),then(resolve){if(insert)writes.push({table,value:insert});return Promise.resolve({data:(source[table]||[]).filter(row=>filters.every(f=>f(row))).slice(start,end+1),error:null}).then(resolve)}};
  return q;
 }};
 const env={SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'};
 const Deno={env:{get:key=>env[key]},serve:fn=>{handler=fn}};
 const require=name=>name.startsWith('https:')?{createClient:()=>client}:shared;
 new Function('require','exports','Deno','fetch',compile('../supabase/functions/monthly-report/index.ts'))(require,{},Deno,()=>{throw new Error('Tests must never send email')});
 return {call:handler,writes,get fromCalls(){return fromCalls}};
}
const request=(token,body={})=>new Request('https://example.invalid/report',{method:'POST',headers:token?{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('monthly report requires authentication before reading business data',async()=>{
 const app=setup();assert.equal((await app.call(request())).status,401);assert.equal(app.fromCalls,0);
 assert.equal((await app.call(request('invalid'))).status,401);assert.equal(app.fromCalls,0);
});
test('workers cannot generate or email company financial reports',async()=>{
 const app=setup();assert.equal((await app.call(request('worker'))).status,403);assert.equal(app.writes.length,0);
});
test('closed-month report excludes unverified receipts and next-month rows',async()=>{
 const app=setup();const response=await app.call(request('test-service-key',{monthKey:'2026-09'}));assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.reportData.finance_summary.revenue,200);assert.equal(data.reportData.finance_summary.unverified_income,800);assert.equal(data.reportData.finance_summary.cash_flow,160);assert.equal(data.reportData.finance_summary.worker_cost,400);assert.equal(data.emailed,false);assert.equal(app.writes[0].value.sent_at,null);
});
test('invalid report month is rejected without saving a report',async()=>{
 const app=setup();assert.equal((await app.call(request('test-service-key',{monthKey:'2026-13'}))).status,400);assert.equal(app.writes.length,0);
});

test('the scheduled default reports the previous closed month',async()=>{
 const app=setup();const response=await app.call(request('test-service-key'));const data=await response.json();
 const [y,m]=shared.zurichDate().slice(0,7).split('-').map(Number);
 const expected=`${m===1?y-1:y}-${String(m===1?12:m-1).padStart(2,'0')}`;
 assert.equal(data.monthKey,expected);
});
