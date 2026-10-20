import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  payrollApi, reportsApi,
  type ApprovalPreview, type DailyReportRow, type ReportFileRow, type ReportLineRow,
} from '@/lib/v2/api';
import { formatDateDe } from '@/lib/v2/time';
import { BLOCKER_LABELS, DUPLICATE_LABELS, EXTRACTION_LABELS } from '@/lib/v2/labels';
import { Empty, PageHeader, StatusBadge, Tag, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { ReportLineEditor, type WorkerOption } from '@/components/v2/ReportLines';

const FILTERS: [string, string[]][] = [
  ['Zu prüfen', ['submitted', 'needs_review']],
  ['Entwürfe', ['draft']],
  ['Genehmigt', ['approved']],
  ['Abgelehnt', ['rejected', 'duplicate']],
  ['Alle', []],
];

const DailyReportsPage = () => {
  const [filter, setFilter] = useState(0);
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [detail, setDetail] = useState<{ report: DailyReportRow; lines: ReportLineRow[]; files: ReportFileRow[] } | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ApprovalPreview | null>(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  const loadList = useCallback(async () => {
    try { setRows(await reportsApi.list(FILTERS[filter][1])); } catch (e) { setError(errorMessage(e)); }
  }, [filter]);
  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { payrollApi.workers().then((w) => setWorkers(w.map((x) => ({ id: x.id, name: x.full_name })))).catch(() => undefined); }, []);

  const open = useCallback(async (id: string) => {
    setError('');
    try {
      const data = await reportsApi.get(id);
      setDetail(data);
      const next: Record<string, string> = {};
      await Promise.all(data.files.map(async (f) => { try { next[f.id] = await reportsApi.signedUrl(f.storage_path); } catch { /* optional */ } }));
      setUrls(next);
      setPreview(['submitted', 'needs_review'].includes(data.report.status) ? await reportsApi.preview(id).catch(() => null) : null);
    } catch (e) { setError(errorMessage(e)); }
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    try { await fn(); toast.success(ok); if (detail) await open(detail.report.id); await loadList(); } catch (e) { setError(errorMessage(e)); }
  };

  if (detail) {
    const r = detail.report;
    const reviewable = ['submitted', 'needs_review'].includes(r.status);
    const editable = reviewable || r.status === 'draft';
    const planByLine = new Map((preview?.plan ?? []).map((p) => [p.line_id, p]));
    const signals = r.duplicate_signals ?? [];
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => { setDetail(null); void loadList(); }}>← Zur Liste</Button>
        <PageHeader title={`Tagesrapport ${formatDateDe(r.report_date)}`} description={`${r.subcontract_assignments?.assignment_number ?? r.projects?.project_name ?? ''} · eingereicht von ${r.workers?.full_name ?? '–'}${r.document_number ? ` · Nr. ${r.document_number}` : ''}`}
          actions={<StatusBadge status={r.status} />} />
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        {signals.length > 0 && (
          <Card className="border-amber-500/40"><CardHeader className="pb-2"><CardTitle className="text-base">Mögliche Duplikate</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {signals.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <Tag tone={s.strength === 'strong' ? 'bad' : s.strength === 'weak' ? 'warn' : 'neutral'}>{s.strength === 'strong' ? 'stark' : s.strength === 'weak' ? 'schwach' : 'Info'}</Tag>
                  <span>{DUPLICATE_LABELS[s.type] ?? s.type}{s.detail ? ` – ${s.detail}` : ''}</span>
                  {s.report_id && <Button size="sm" variant="link" onClick={() => void open(s.report_id!)}>Anderen Rapport ansehen</Button>}
                </div>
              ))}
              {r.duplicate_resolution === 'pending' && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="destructive" onClick={() => void act(() => reportsApi.resolveDuplicate(r.id, 'discard_this', comment), 'Dieser Rapport verworfen.')}>Diesen Rapport verwerfen</Button>
                  <Button size="sm" variant="outline" onClick={() => void act(() => reportsApi.resolveDuplicate(r.id, 'discard_other', comment), 'Anderer Rapport verworfen.')}>Den anderen verwerfen</Button>
                  <Button size="sm" variant="outline" onClick={() => void act(() => reportsApi.resolveDuplicate(r.id, 'keep_both', comment), 'Beide behalten.')}>Beide behalten (kein Duplikat)</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Foto / Beleg</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {detail.files.length === 0 && <Empty>Keine Datei hochgeladen.</Empty>}
              {detail.files.map((f) => urls[f.id]
                ? (f.mime_type === 'application/pdf'
                  ? <a key={f.id} className="text-sm underline" href={urls[f.id]} target="_blank" rel="noreferrer">PDF öffnen ({f.original_name})</a>
                  : <a key={f.id} href={urls[f.id]} target="_blank" rel="noreferrer"><img src={urls[f.id]} alt={`Seite ${f.page_no}`} className="w-full rounded-md border border-border" /></a>)
                : <p key={f.id} className="text-xs text-muted-foreground">Seite {f.page_no} nicht verfügbar</p>)}
              <Tag tone={r.extraction_status === 'succeeded' ? 'info' : 'neutral'}>{EXTRACTION_LABELS[r.extraction_status] ?? r.extraction_status}</Tag>
              {r.extraction_error && <p className="text-xs text-red-300">{r.extraction_error}</p>}
              {r.notes && <p className="whitespace-pre-line text-xs text-muted-foreground">{r.notes}</p>}
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Zeilen prüfen ({detail.lines.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {detail.lines.length === 0 && <Empty>Keine Zeilen vorhanden.</Empty>}
              {detail.lines.map((line) => {
                const plan = planByLine.get(line.id);
                return (
                  <ReportLineEditor key={line.id} line={line} workers={workers} editable={editable}
                    onSave={async (l) => { await act(() => reportsApi.saveLine(l), 'Zeile gespeichert.'); }}
                    onDelete={async (l) => { await act(() => reportsApi.deleteLine(l.id), 'Zeile entfernt.'); }}
                    extra={plan && (
                      <div className="space-y-2 rounded-md bg-muted/40 p-2 text-sm">
                        {plan.action === 'blocker' && <p className="text-amber-300">Blockiert: {BLOCKER_LABELS[plan.reason ?? ''] ?? plan.reason}</p>}
                        {plan.action === 'create' && <p className="text-emerald-300">Wird als neuer Stundeneintrag erstellt.</p>}
                        {plan.action === 'already' && <p className="text-muted-foreground">Stundeneintrag bereits erstellt.</p>}
                        {plan.action === 'skip' && <p className="text-muted-foreground">Wird übersprungen.</p>}
                        {(plan.action === 'link' || plan.action === 'replace') && <p className="text-blue-300">{plan.action === 'link' ? 'Wird mit bestehendem Eintrag verknüpft.' : 'Ersetzt den bestehenden Eintrag.'}</p>}
                        {reviewable && plan.action !== 'already' && (
                          <select className={nativeFieldClass} value={line.resolution ?? ''} onChange={(e) => void act(() => reportsApi.resolveLine(line.id, e.target.value || null), 'Auflösung gespeichert.')}>
                            <option value="">Auflösung: keine</option>
                            <option value="skip">Zeile überspringen</option>
                            <option value="link_existing">Mit bestehendem Eintrag verknüpfen</option>
                            <option value="replace_existing">Bestehenden Eintrag ersetzen</option>
                          </select>
                        )}
                      </div>
                    )} />
                );
              })}
            </CardContent>
          </Card>
        </div>

        {reviewable && (
          <Card><CardContent className="space-y-3 pt-4">
            <Input placeholder="Kommentar (bei Ablehnung Pflicht)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!preview?.can_approve} onClick={() => void act(() => reportsApi.approve(r.id, comment), 'Rapport genehmigt, Stunden erstellt.')}>Genehmigen &amp; Stunden erstellen</Button>
              <Button variant="destructive" onClick={() => void act(() => reportsApi.reject(r.id, comment), 'Rapport abgelehnt.')}>Ablehnen</Button>
              {!preview?.can_approve && <span className="self-center text-xs text-muted-foreground">Genehmigung erst möglich, wenn alle Zeilen bestätigt, zugeordnet und Konflikte aufgelöst sind.</span>}
            </div>
          </CardContent></Card>
        )}
        {r.review_comment && <p className="text-sm text-muted-foreground">Prüfkommentar: {r.review_comment}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Tagesrapporte" description="Fotografierte und manuell erfasste Tagesrapporte prüfen. KI-Vorschläge werden nie automatisch genehmigt." />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([label], i) => (
          <button key={label} type="button" onClick={() => setFilter(i)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === i ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted text-muted-foreground'}`}>{label}</button>
        ))}
      </div>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <Card><CardContent className="space-y-2 pt-4">
        {rows.length === 0 && <Empty>Keine Rapporte.</Empty>}
        {rows.map((r) => (
          <button key={r.id} type="button" onClick={() => void open(r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-left hover:bg-muted/30">
            <span>
              <span className="block text-sm font-medium">{formatDateDe(r.report_date)} · {r.subcontract_assignments?.assignment_number ?? r.projects?.project_name}</span>
              <span className="block text-xs text-muted-foreground">{r.workers?.full_name ?? '–'} · {r.report_kind === 'group' ? 'Gruppenrapport' : 'Einzelrapport'}{r.lines_from_ai ? ' · KI-Vorschlag' : ''}</span>
            </span>
            <span className="flex items-center gap-2">
              {r.duplicate_resolution === 'pending' && <Tag tone="bad">Duplikat?</Tag>}
              <StatusBadge status={r.status} />
            </span>
          </button>
        ))}
      </CardContent></Card>
    </div>
  );
};

export default DailyReportsPage;
