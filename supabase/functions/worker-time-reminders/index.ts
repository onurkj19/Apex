import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReminderMode = 'start' | 'stop';

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const mode = (((await req.json().catch(() => ({}))) as { mode?: ReminderMode }).mode || 'start') as ReminderMode;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const today = toIsoDate(new Date());

    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('role', 'worker')
      .eq('is_active', true);
    if (usersError) throw usersError;

    let sent = 0;
    for (const user of users || []) {
      const { data: todayEntries, error: entriesError } = await adminClient
        .from('worker_time_entries')
        .select('id, status, end_at')
        .eq('worker_user_id', user.id)
        .eq('work_date', today)
        .order('created_at', { ascending: false })
        .limit(1);
      if (entriesError) throw entriesError;

      const latest = (todayEntries || [])[0];
      const shouldSendStartReminder = mode === 'start' && !latest;
      const shouldSendStopReminder = mode === 'stop' && Boolean(latest && latest.status === 'running' && !latest.end_at);
      if (!shouldSendStartReminder && !shouldSendStopReminder) continue;

      const title = mode === 'start' ? 'Kujtese Start' : 'Kujtese Stop';
      const message =
        mode === 'start'
          ? 'Ora 07:00 po afrohet. Kliko Start per regjistrim.'
          : 'Ora 17:15. Kliko Stop dhe dergo oret per aprovim.';

      const dedupeKey = `worker-time-reminder:${mode}:${today}:${user.id}`;
      const { data: existing, error: existingError } = await adminClient
        .from('notifications')
        .select('id')
        .eq('title', title)
        .eq('message', message)
        .contains('metadata', { reminder_key: dedupeKey })
        .limit(1);
      if (existingError) throw existingError;
      if ((existing || []).length > 0) continue;

      const { error: notifError } = await adminClient.from('notifications').insert({
        type: 'admin_change',
        title,
        message,
        is_read: false,
        is_archived: false,
        metadata: {
          target_user_id: user.id,
          target_user_email: user.email,
          reminder_mode: mode,
          reminder_date: today,
          reminder_key: dedupeKey,
          actor_admin_name: 'Sistemi',
          actor_admin_email: 'system@apex.local',
          action_at: new Date().toISOString(),
        },
      });
      if (notifError) throw notifError;
      sent += 1;
    }

    return new Response(JSON.stringify({ success: true, mode, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
