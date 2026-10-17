import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { monthWindow, periodSummary, zurichDate, type ReceiptRow } from '../../../src/lib/payment-summary.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});
async function readAll<T>(readPage: (from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<T[]> {
  const rows:T[]=[];
  for(let from=0;;) {
    const {data,error}=await readPage(from,from+999);
    if(error) throw error;
    const page=data||[];rows.push(...page);
    if(page.length===0)return rows;
    from+=page.length;
  }
}
type ProjectRow = {id:string;status:string};
type WorkRow = {id:string;hours_worked:number;total_amount:number};
Deno.serve(async req => {
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'POST required'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL')!;
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false}});
    const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();
    if(!token)return json({error:'Authentication required'},401);
    if(token!==serviceKey) {
      const {data:caller,error}=await supabase.auth.getUser(token);
      if(error||!caller.user)return json({error:'Invalid session'},401);
      const {data:profile,error:profileError}=await supabase.from('users').select('role,is_active').eq('id',caller.user.id).single();
      if(profileError||!profile?.is_active||!['admin','super_admin','finance'].includes(profile.role))return json({error:'Finance access required'},403);
    }
    const today=zurichDate();
    const [year,month]=today.slice(0,7).split('-').map(Number);
    const previousMonth=`${month===1?year-1:year}-${String(month===1?12:month-1).padStart(2,'0')}`;
    const body=await req.json().catch(()=>({})) as {monthKey?:unknown};
    const monthKey=body.monthKey===undefined?previousMonth:String(body.monthKey);
    let window:{start:string;end:string};
    try {window=monthWindow(monthKey);} catch {return json({error:'Invalid month'},400);}
    if(monthKey>today.slice(0,7))return json({error:'Future reports are not receipts'},400);
    const [projects,finance,workRows]=await Promise.all([
      readAll<ProjectRow>((from,to)=>supabase.from('projects').select('id,status').is('deleted_at',null).order('id').range(from,to)),
      readAll<ReceiptRow>((from,to)=>supabase.from('finances').select('id,amount,finance_type,finance_date,payment_reconciliation(status)').gte('finance_date',window.start).lt('finance_date',window.end).lte('finance_date',today).order('id').range(from,to)),
      readAll<WorkRow>((from,to)=>supabase.from('work_logs').select('id,hours_worked,total_amount').gte('work_date',window.start).lt('work_date',window.end).lte('work_date',today).order('id').range(from,to)),
    ]);
    const totals=periodSummary(finance,window.start,today<window.end?today:window.end);
    const reportData={
      month_key:monthKey, generated_at:new Date().toISOString(), basis:'confirmed_and_manually_entered_receipts_v1',
      project_summary:{total:projects.length,completed:projects.filter(p=>p.status==='I perfunduar').length,scope:'current_non_deleted_projects'},
      finance_summary:{revenue:totals.confirmed,recorded_income:totals.recorded,unverified_income:totals.unverified,not_received_income:totals.notReceived,expenses:totals.expenses,cash_flow:totals.cashFlow,worker_cost:workRows.reduce((sum,row)=>sum+Number(row.total_amount||0),0)},
      worker_hours_summary:{total_hours:workRows.reduce((sum,row)=>sum+Number(row.hours_worked||0),0)},
    };
    const {data:previous,error:previousError}=await supabase.from('reports').select('sent_at').eq('month_key',monthKey).maybeSingle();
    if(previousError)throw previousError;
    const {error:saveError}=await supabase.from('reports').upsert({month_key:monthKey,report_data:reportData,sent_at:previous?.sent_at||null},{onConflict:'month_key'});
    if(saveError)throw saveError;
    const resendApiKey=Deno.env.get('RESEND_API_KEY'),reportTo=Deno.env.get('REPORT_RECIPIENT_EMAIL');
    let emailed=false;
    if(resendApiKey&&reportTo&&!previous?.sent_at) {
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendApiKey}`,'Content-Type':'application/json'},body:JSON.stringify({
        from:'ERP Reports <reports@apex-geruste.ch>',to:[reportTo],subject:`Raporti mujor ERP - ${monthKey}`,
        html:`<h2>Raporti mujor — ${monthKey}</h2><p>Hyrje të konfirmuara / manuale: ${totals.confirmed.toFixed(2)} CHF</p><p>Për verifikim: ${totals.unverified.toFixed(2)} CHF</p><p>Të shënuara si të pamarra: ${totals.notReceived.toFixed(2)} CHF</p><p>Shpenzime: ${totals.expenses.toFixed(2)} CHF</p><p>Fluksi neto (hyrje minus shpenzime): ${totals.cashFlow.toFixed(2)} CHF</p><p>Kosto e orëve të regjistruara: ${reportData.finance_summary.worker_cost.toFixed(2)} CHF (veçmas; mund të jetë përfshirë tashmë në shpenzime).</p><p>Ky raport nuk është konfirmim i gjendjes bankare ose llogaritje e fitimit kontabël.</p>`,
      })});
      if(!response.ok)throw new Error(`Email provider rejected report (${response.status})`);
      const {error:markError}=await supabase.from('reports').update({sent_at:new Date().toISOString()}).eq('month_key',monthKey);
      if(markError)throw markError;
      emailed=true;
    }
    return json({success:true,monthKey,reportData,emailed});
  } catch(error:unknown) {return json({error:error instanceof Error?error.message:'Report generation failed'},500);}
});
