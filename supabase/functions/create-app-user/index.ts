import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreatePayload = {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'finance' | 'project_manager' | 'viewer' | 'worker';
  worker_id?: string | null;
};

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
    if (callerProfileErr || !callerProfile || !callerProfile.is_active || callerProfile.role !== 'super_admin') {
      throw new Error('Vetem super admin mund te krijoje usera te rinj.');
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
      },
    });
    if (createErr || !createdAuth.user) throw createErr || new Error('Nuk u krijua auth user.');

    const { error: upsertErr } = await adminClient.from('users').upsert(
      {
        id: createdAuth.user.id,
        full_name: payload.full_name,
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
        worker_id: payload.role === 'worker' ? payload.worker_id || null : null,
        is_active: true,
      },
      { onConflict: 'id' },
    );
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, user_id: createdAuth.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
