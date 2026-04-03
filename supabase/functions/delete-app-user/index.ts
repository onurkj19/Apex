import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const canManageUsers = (role: string | null | undefined) => role === 'super_admin' || role === 'admin';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) throw new Error('Authorization header mungon.');
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(url, serviceRole);
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: callerUser, error: callerErr } = await adminClient.auth.getUser(token);
    if (callerErr || !callerUser.user) throw new Error('Nuk je i autorizuar.');

    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('users')
      .select('id, role, is_active')
      .eq('id', callerUser.user.id)
      .single();
    if (callerProfileErr || !callerProfile || !callerProfile.is_active || !canManageUsers(callerProfile.role)) {
      throw new Error('Vetem admin / super admin mund te fshije usera.');
    }

    const body = (await req.json()) as { user_id?: string };
    const targetId = body.user_id?.trim();
    if (!targetId) throw new Error('user_id mungon.');

    if (targetId === callerUser.user.id) {
      throw new Error('Nuk mund te fshish llogarine tende.');
    }

    const { data: target, error: targetErr } = await adminClient
      .from('users')
      .select('id, role, worker_id')
      .eq('id', targetId)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target) throw new Error('Perdoruesi nuk u gjet.');

    if (target.role === 'super_admin') {
      throw new Error('Super admin nuk mund te fshihet.');
    }

    const workerId = target.worker_id as string | null;

    const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(targetId);
    if (delAuthErr) throw delAuthErr;

    // public.users fshihet me CASCADE nga auth; provo te fshish punëtorin e veçuar nëse ekziston
    if (workerId) {
      const { error: wDel } = await adminClient.from('workers').delete().eq('id', workerId);
      if (wDel) {
        console.warn('[delete-app-user] worker delete skipped:', wDel.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
