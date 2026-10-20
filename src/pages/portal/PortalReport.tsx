import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  newIdempotencyKey, portalApi, reportsApi,
  type DailyReportRow, type ReportFileRow, type ReportLineRow, type Target, type Worksite,
} from '@/lib/v2/api';
import { prepareImage } from '@/lib/v2/image';
import { formatDateDe, todayInZurich } from '@/lib/v2/time';
import { EXTRACTION_LABELS } from '@/lib/v2/labels';
import { Empty, Field, StatusBadge, Tag, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { ReportLineEditor, type WorkerOption } from '@/components/v2/ReportLines';
import { usePortal } from './context';

const PortalReport = () => {
  const { profile } = usePortal();
  const [targets, setTargets] = useState<Target[]>([]);
  const [reports, setReports] = useState<DailyReportRow[]>([]);
  const [current, setCurrent] = useState<{ report: DailyReportRow; lines: ReportLineRow[]; files: ReportFileRow[] } | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<WorkerOption[]>([]);
  const [targetKey, setTargetKey] = useState('');
  const [date, setDate] = useState(todayInZurich());
  const [docNumber, setDocNumber] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const idempotencyKey = useRef(newIdempotencyKey());
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(() => reportsApi.list(undefined, true).then(setReports).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { portalApi.targets().then(setTargets).catch((e) => setError(errorMessage(e))); void refreshList(); }, [refreshList]);

  const open = useCallback(async (id: string) => {
    const data = await reportsApi.get(id);
    setCurrent(data);
    const urls: Record<string, string> = {};
    await Promise.all(data.files.map(async (f) => { try { urls[f.id] = await reportsApi.signedUrl(f.storage_path); } catch { /* preview optional */ } }));
    setPreviews(urls);
    const sites: Worksite[] = await portalApi.worksites(data.report.report_date).catch(() => []);
    const site = sites.find((s) => s.id === (data.report.assignment_id ?? data.report.project_id));
    const members = (site?.team ?? []).map((t) => ({ id: t.worker_id, name: t.name }));
    if (profile.worker_id && !members.some((m) => m.id === profile.worker_id)) members.unshift({ id: profile.worker_id, name: `${profile.full_name ?? 'Ich'} (ich)` });
    setTeam(members);
  }, [profile]);

  const editable = !!current && ['draft', 'rejected'].includes(current.report.status);

  const start = async () => {
    setError('');
    const target = targets.find((t) => `${t.kind}:${t.id}` === targetKey);
    if (!target) return setError('Bitte Auftrag oder Projekt wählen.');
    setBusy('create');
    try {
      const id = await reportsApi.create({ target, date, documentNumber: docNumber, idempotencyKey: idempotencyKey.current });
      idempotencyKey.current = newIdempotencyKey();
      await open(id);
      await refreshList();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !current) return;
    setBusy('upload');
    setError('');
    try {
      let page = current.files.length + 1;
      for (const file of Array.from(files)) {
        const blob = await prepareImage(file);
        await reportsApi.uploadFile(current.report.id, blob, file.name, page);
        page += 1;
      }
      await open(current.report.id);
      toast.success('Foto gespeichert.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const extract = async () => {
    if (!current) return;
    setBusy('extract');
    setError('');
    try {
      const result = await reportsApi.extract(current.report.id);
      if (result.status === 'not_configured') toast.info('KI ist nicht eingerichtet. Bitte Stunden manuell erfassen.');
      else if (result.status === 'failed') setError(result.error ?? 'KI-Auswertung fehlgeschlagen. Bitte manuell erfassen.');
      else toast.success('Vorschlag erstellt – bitte jede Zeile prüfen.');
      await open(current.report.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const addLine = async () => {
    if (!current) return;
    const nextNo = Math.max(0, ...current.lines.map((l) => l.line_no)) + 1;
    try {
      await reportsApi.saveLine({ report_id: current.report.id, line_no: nextNo, break_minutes: 60, worker_id: current.lines.length === 0 ? profile.worker_id : null });
      await open(current.report.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const submit = async () => {
    if (!current) return;
    setBusy('submit');
    setError('');
    try {
      await reportsApi.updateHeader(current.report.id, { document_number: current.report.document_number, notes: current.report.notes });
      const result = await reportsApi.submit(current.report.id);
      toast.success(result.status === 'needs_review' ? 'Eingereicht – wird von der Verwaltung geprüft (mögliches Duplikat).' : 'Rapport eingereicht.');
      await open(current.report.id);
      await refreshList();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  if (current) {
    const r = current.report;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setCurrent(null); void refreshList(); }}>← Zurück</Button>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Tagesrapport {formatDateDe(r.report_date)}</CardTitle>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">{r.subcontract_assignments?.assignment_number ?? r.projects?.project_name}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.status === 'rejected' && r.review_comment && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">Abgelehnt: {r.review_comment}</p>}
            {r.status === 'needs_review' && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">Mögliches Duplikat – die Verwaltung entscheidet.</p>}
            {r.status === 'approved' && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Genehmigt. Die Stunden sind erfasst.</p>}
            <div className="grid grid-cols-3 gap-2">
              {current.files.map((f) => previews[f.id]
                ? <a key={f.id} href={previews[f.id]} target="_blank" rel="noreferrer"><img src={previews[f.id]} alt={`Seite ${f.page_no}`} className="aspect-[3/4] w-full rounded-md border border-border object-cover" /></a>
                : <div key={f.id} className="flex aspect-[3/4] items-center justify-center rounded-md border border-border text-xs text-muted-foreground">Seite {f.page_no}</div>)}
            </div>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <input ref={fileInput} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
                <Button disabled={busy !== ''} onClick={() => fileInput.current?.click()}><Camera className="mr-2 h-4 w-4" />Foto aufnehmen</Button>
                <Button variant="secondary" disabled={busy !== ''} onClick={() => { if (fileInput.current) { fileInput.current.removeAttribute('capture'); fileInput.current.click(); fileInput.current.setAttribute('capture', 'environment'); } }}><ImagePlus className="mr-2 h-4 w-4" />Aus Galerie</Button>
                {current.files.length > 0 && current.lines.length === 0 && (
                  <Button variant="outline" disabled={busy !== ''} onClick={extract}><Sparkles className="mr-2 h-4 w-4" />Mit KI auslesen</Button>
                )}
              </div>
            )}
            {r.extraction_status !== 'not_requested' && <Tag tone={r.extraction_status === 'succeeded' ? 'info' : 'neutral'}>{EXTRACTION_LABELS[r.extraction_status] ?? r.extraction_status}</Tag>}
            {r.lines_from_ai && <p className="text-xs text-muted-foreground">KI-Zeilen sind nur Vorschläge. Prüfe Name, Zeiten und Pause und bestätige jede Zeile.</p>}
            {editable && (
              <Field label="Rapport-Nr. (optional)">
                <Input value={r.document_number ?? ''} onChange={(e) => setCurrent({ ...current, report: { ...r, document_number: e.target.value } })} />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Stunden pro Person</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {current.lines.length === 0 && <Empty>Noch keine Zeilen. Foto aufnehmen und auslesen lassen oder manuell erfassen.</Empty>}
            {current.lines.map((line) => (
              <ReportLineEditor key={line.id} line={line} workers={team} editable={editable}
                onSave={async (l) => { try { await reportsApi.saveLine(l); await open(r.id); } catch (e) { setError(errorMessage(e)); } }}
                onDelete={async (l) => { await reportsApi.deleteLine(l.id); await open(r.id); }} />
            ))}
            {editable && (
              <>
                <Button variant="outline" className="w-full" onClick={addLine}>+ Zeile hinzufügen</Button>
                {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
                <Button className="w-full" disabled={busy !== '' || current.lines.length === 0} onClick={submit}>Rapport einreichen</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Neuer Tagesrapport</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Auftrag / Projekt">
            <select className={nativeFieldClass} value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
              <option value="">Bitte wählen …</option>
              {targets.map((t) => <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{t.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum"><Input type="date" value={date} max={todayInZurich()} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Rapport-Nr. (optional)"><Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} /></Field>
          </div>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <Button className="w-full" disabled={busy !== ''} onClick={start}>Weiter zu Foto &amp; Stunden</Button>
          <p className="text-xs text-muted-foreground">Fotografiere den handschriftlichen Tagesrapport. Die Stunden werden danach von dir geprüft; nichts wird automatisch genehmigt.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Meine Rapporte</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 && <Empty>Noch keine Rapporte.</Empty>}
          {reports.map((r) => (
            <button key={r.id} type="button" onClick={() => void open(r.id)} className="flex w-full items-center justify-between rounded-lg border border-border/70 p-3 text-left hover:bg-muted/30">
              <span>
                <span className="block text-sm font-medium">{formatDateDe(r.report_date)}</span>
                <span className="block text-xs text-muted-foreground">{r.subcontract_assignments?.assignment_number ?? r.projects?.project_name}</span>
              </span>
              <StatusBadge status={r.status} />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalReport;
