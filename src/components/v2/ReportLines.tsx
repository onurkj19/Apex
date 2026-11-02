import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ReportLineRow } from '@/lib/v2/api';
import { calculateWorkedMinutes } from '@/lib/v2/time';
import { hoursFromMinutes } from '@/lib/v2/decimal';
import { FLAG_LABELS } from '@/lib/v2/labels';
import { Tag, nativeFieldClass } from './ui';

export interface WorkerOption {
  id: string;
  name: string;
}

interface Props {
  line: ReportLineRow;
  workers: WorkerOption[];
  editable: boolean;
  onSave: (line: ReportLineRow) => Promise<void> | void;
  onDelete?: (line: ReportLineRow) => Promise<void> | void;
  extra?: React.ReactNode;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

export const ReportLineEditor = ({ line, workers, editable, onSave, onDelete, extra }: Props) => {
  const [draft, setDraft] = useState<ReportLineRow>(line);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(line);
    setDirty(false);
  }, [line]);

  const patch = (p: Partial<ReportLineRow>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const check = calculateWorkedMinutes({ start: hhmm(draft.start_time), end: hhmm(draft.end_time), breakMinutes: draft.break_minutes });
  const minutes = check.ok === false ? null : check.minutes;
  const mismatch = minutes !== null && draft.reported_total_minutes !== null && Math.abs(minutes - draft.reported_total_minutes) > 6;
  const flags = [...new Set([...(draft.flags ?? []), ...(mismatch ? ['total_mismatch'] : [])])];

  const save = async () => {
    setBusy(true);
    try {
      await onSave(draft);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Zeile {draft.line_no}</span>
        {draft.source === 'ai' && <Tag tone="info">KI-Vorschlag</Tag>}
        {draft.confidence !== null && <Tag tone={draft.confidence < 0.8 ? 'warn' : 'neutral'}>Sicherheit {Math.round(draft.confidence * 100)} %</Tag>}
        {flags.map((f) => <Tag key={f} tone="warn">{FLAG_LABELS[f] ?? f}</Tag>)}
        {dirty && <Tag tone="bad">Nicht gespeichert</Tag>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 space-y-1">
          <span className="text-xs text-muted-foreground">Mitarbeiter {draft.worker_name_raw ? `(Rapport: „${draft.worker_name_raw}“)` : ''}</span>
          <select className={nativeFieldClass} disabled={!editable} value={draft.worker_id ?? ''} onChange={(e) => patch({ worker_id: e.target.value || null })}>
            <option value="">– nicht zugeordnet –</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        {!draft.worker_id && editable && (
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-muted-foreground">Name laut Rapport</span>
            <Input value={draft.worker_name_raw ?? ''} onChange={(e) => patch({ worker_name_raw: e.target.value })} />
          </label>
        )}
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Beginn</span>
          <Input type="time" disabled={!editable} value={hhmm(draft.start_time)} onChange={(e) => patch({ start_time: e.target.value || null })} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Ende</span>
          <Input type="time" disabled={!editable} value={hhmm(draft.end_time)} onChange={(e) => patch({ end_time: e.target.value || null })} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Pause (Min.)</span>
          <Input inputMode="numeric" disabled={!editable} value={String(draft.break_minutes)} onChange={(e) => patch({ break_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Total laut Rapport (Std.)</span>
          <Input inputMode="decimal" disabled={!editable} value={draft.reported_total_minutes === null ? '' : String(draft.reported_total_minutes / 60)}
            onChange={(e) => {
              const v = e.target.value.replace(',', '.');
              patch({ reported_total_minutes: v === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 60) });
            }} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">{minutes === null ? <span className="text-amber-300">{check.ok === false ? check.error : ''}</span> : <>Berechnet: <b className="tabular-nums">{hoursFromMinutes(minutes)} Std.</b></>}</p>
        {editable && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={draft.verified} onChange={(e) => patch({ verified: e.target.checked })} />
            Geprüft &amp; korrekt
          </label>
        )}
      </div>
      {extra}
      {editable && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy || !dirty} onClick={save}>Speichern</Button>
          {onDelete && <Button size="sm" variant="ghost" onClick={() => onDelete(draft)}><Trash2 className="mr-1 h-4 w-4" />Entfernen</Button>}
        </div>
      )}
    </div>
  );
};
