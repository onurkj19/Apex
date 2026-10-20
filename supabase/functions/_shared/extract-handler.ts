import {
  EXTRACTION_PROMPT,
  normalizeExtraction,
  parseModelJson,
  type NormalizedExtraction,
  type WorkerRef,
} from './extraction.ts';

// Minimal structural type: the real supabase-js client (and the in-memory test double) both satisfy it.
type Db = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ExtractDeps {
  admin: Db;
  env: (key: string) => string | undefined;
  fetchImpl: typeof fetch;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const APPROVER_ROLES = ['super_admin', 'admin', 'project_manager'];
const IMAGE_MIME = /^image\/(jpeg|png|webp)$/;
const MAX_BYTES = 10 * 1024 * 1024;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
};

export const handleExtract = async (req: Request, deps: ExtractDeps): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);
  const { admin, env, fetchImpl } = deps;

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json({ success: false, error: 'Nicht angemeldet.' }, 401);
  const token = authHeader.slice(7).trim();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ success: false, error: 'Nicht angemeldet.' }, 401);
  const userId: string = userData.user.id;

  const { data: profile } = await admin.from('users').select('id, role, is_active').eq('id', userId).maybeSingle();
  if (!profile || !profile.is_active) return json({ success: false, error: 'Konto nicht aktiv.' }, 403);

  let body: { report_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Ungültige Anfrage.' }, 400);
  }
  const reportId = typeof body.report_id === 'string' ? body.report_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) return json({ success: false, error: 'report_id fehlt.' }, 400);

  const { data: report } = await admin.from('daily_reports').select('*').eq('id', reportId).maybeSingle();
  const isApprover = APPROVER_ROLES.includes(profile.role);
  if (!report || (report.created_by !== userId && !isApprover)) {
    return json({ success: false, error: 'Rapport nicht gefunden.' }, 404);
  }
  if (!['draft', 'needs_review', 'submitted'].includes(report.status)) {
    return json({ success: false, error: 'Rapport kann nicht mehr analysiert werden.' }, 409);
  }

  const { count: lineCount } = await admin
    .from('daily_report_lines')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId);
  if ((lineCount ?? 0) > 0) {
    return json({ success: true, status: 'lines_exist', extraction_status: report.extraction_status });
  }

  const apiKey = env('AI_API_KEY');
  const model = env('AI_MODEL');
  const baseUrl = (env('AI_API_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');

  const { data: claimed } = await admin
    .from('daily_reports')
    .update({ extraction_status: apiKey && model ? 'processing' : 'not_configured', extraction_error: null })
    .eq('id', reportId)
    .in('extraction_status', ['not_requested', 'failed', 'not_configured', 'pending'])
    .select('id');
  if (!claimed || claimed.length === 0) {
    return json({ success: true, status: 'already_processed', extraction_status: report.extraction_status });
  }

  if (!apiKey || !model) {
    await admin.from('daily_report_extractions').insert({ report_id: reportId, status: 'not_configured', error: 'AI nicht konfiguriert' });
    return json({ success: true, status: 'not_configured' });
  }

  const fail = async (message: string, provider?: string) => {
    await admin.from('daily_reports').update({ extraction_status: 'failed', extraction_error: message.slice(0, 500) }).eq('id', reportId);
    await admin.from('daily_report_extractions').insert({ report_id: reportId, status: 'failed', provider, model, error: message.slice(0, 1000) });
    return json({ success: true, status: 'failed', error: message });
  };

  try {
    const { data: files } = await admin
      .from('daily_report_files')
      .select('storage_path, mime_type, page_no')
      .eq('report_id', reportId)
      .order('page_no', { ascending: true });
    const images = (files ?? []).filter((f: { mime_type: string | null }) => f.mime_type && IMAGE_MIME.test(f.mime_type));
    if (images.length === 0) return await fail('Keine auswertbare Bilddatei (JPEG/PNG/WebP).');

    const content: unknown[] = [{ type: 'text', text: EXTRACTION_PROMPT }];
    for (const file of images.slice(0, 4)) {
      const { data: blob, error } = await admin.storage.from('daily-reports').download(file.storage_path);
      if (error || !blob) return await fail('Bilddatei konnte nicht geladen werden.');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length > MAX_BYTES) return await fail('Bilddatei ist zu gross.');
      content.push({ type: 'image_url', image_url: { url: `data:${file.mime_type};base64,${toBase64(bytes)}` } });
    }

    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content }] }),
    });
    if (!response.ok) return await fail(`KI-Anbieter antwortete mit Status ${response.status}.`, baseUrl);
    const payload = await response.json();
    const answer: string = payload?.choices?.[0]?.message?.content ?? '';
    const raw = parseModelJson(answer);
    if (!raw) return await fail('KI-Antwort konnte nicht gelesen werden.', baseUrl);

    const { data: workerRows } = await admin.from('workers').select('id, full_name').eq('is_active', true);
    const workers: WorkerRef[] = workerRows ?? [];
    const result: NormalizedExtraction = normalizeExtraction(raw, workers);

    if (result.lines.length > 0) {
      const rows = result.lines.map((line, index) => ({
        report_id: reportId,
        line_no: index + 1,
        worker_id: line.worker_id,
        worker_name_raw: line.worker_name_raw,
        start_time: line.start_time,
        end_time: line.end_time,
        break_minutes: line.break_minutes,
        reported_total_minutes: line.reported_total_minutes,
        confidence: line.confidence,
        flags: line.flags,
        source: 'ai',
        verified: false,
        notes: line.notes,
      }));
      const { error: insertError } = await admin.from('daily_report_lines').insert(rows);
      if (insertError) return await fail('Zeilen konnten nicht gespeichert werden.', baseUrl);
    }

    const warnings: string[] = [];
    if (result.report_date && result.report_date !== report.report_date) {
      warnings.push(`KI erkannte Datum ${result.report_date}, Rapport-Datum ist ${report.report_date}.`);
    }
    if (result.site) warnings.push(`Baustelle laut Rapport: ${result.site}`);
    const update: Record<string, unknown> = {
      extraction_status: 'succeeded',
      extraction_error: null,
      lines_from_ai: true,
      report_kind: result.lines.length > 1 ? 'group' : 'individual',
    };
    if (!report.document_number && result.document_number) update.document_number = result.document_number;
    if (!report.external_company && result.external_company) update.external_company = result.external_company;
    if (!report.team_leader_name && result.team_leader) update.team_leader_name = result.team_leader;
    if (warnings.length > 0) update.notes = [report.notes, ...warnings].filter(Boolean).join('\n');
    await admin.from('daily_reports').update(update).eq('id', reportId);
    await admin.from('daily_report_extractions').insert({
      report_id: reportId,
      provider: baseUrl,
      model,
      status: 'succeeded',
      raw_result: { raw, normalized: result },
    });
    return json({ success: true, status: 'succeeded', lines: result.lines.length });
  } catch (error) {
    return await fail(error instanceof Error ? error.message : 'Unbekannter Fehler');
  }
};
