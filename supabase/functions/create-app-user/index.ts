import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WorkerDefaults = {
  hourly_rate?: number;
  job_role?: string;
  group_name?: string;
};

type CreatePayload = {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'finance' | 'project_manager' | 'viewer' | 'worker';
  worker_id?: string | null;
  worker_defaults?: WorkerDefaults | null;
};

const canCreateUsers = (role: string | null | undefined) => role === 'super_admin' || role === 'admin';

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
    if (callerProfileErr || !callerProfile || !callerProfile.is_active || !canCreateUsers(callerProfile.role)) {
      throw new Error('Vetem admin / super admin mund te krijoje usera te rinj.');
    }

    const payload = (await req.json()) as CreatePayload;
    if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
      throw new Error('Te dhenat kryesore mungojne.');
    }

    const { data: createdAuth, error: createErr } = await adminClient.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
        app_role: payload.role,
      },
    });
    if (createErr || !createdAuth.user) throw createErr || new Error('Nuk u krijua auth user.');

    const authUserId = createdAuth.user.id;
    let linkedWorkerId: string | null = payload.worker_id?.trim() || null;
    let createdNewWorker = false;

    try {
      if (payload.role === 'worker' && !linkedWorkerId) {
        const wd = payload.worker_defaults || {};
        const hourly = typeof wd.hourly_rate === 'number' && Number.isFinite(wd.hourly_rate) && wd.hourly_rate >= 0
          ? wd.hourly_rate
          : 0;
        const jobRole = (wd.job_role || 'Monter Skele').trim() || 'Monter Skele';
        const groupName = (wd.group_name || 'Grupi A').trim() || 'Grupi A';

        const { data: newWorker, error: wErr } = await adminClient
          .from('workers')
          .insert({
            full_name: payload.full_name.trim(),
            hourly_rate: hourly,
            role: jobRole,
            group_name: groupName,
            is_active: true,
          })
          .select('id')
          .single();

        if (wErr || !newWorker) throw wErr || new Error('Nuk u krijua punetori.');
        linkedWorkerId = newWorker.id;
        createdNewWorker = true;
      }

      const { error: upsertErr } = await adminClient.from('users').upsert(
        {
          id: authUserId,
          full_name: payload.full_name,
          email: payload.email.trim().toLowerCase(),
          role: payload.role,
          worker_id: payload.role === 'worker' ? linkedWorkerId : null,
          is_active: true,
        },
        { onConflict: 'id' },
      );
      if (upsertErr) throw upsertErr;

      return new Response(
        JSON.stringify({
          success: true,
          user_id: authUserId,
          worker_id: payload.role === 'worker' ? linkedWorkerId : null,
          created_worker: createdNewWorker,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    } catch (inner: unknown) {
      if (createdNewWorker && linkedWorkerId) {
        await adminClient.from('workers').delete().eq('id', linkedWorkerId);
      }
      await adminClient.auth.admin.deleteUser(authUserId);
      throw inner;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
