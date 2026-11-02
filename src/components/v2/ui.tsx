import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/15 text-blue-300',
  warn: 'bg-amber-500/15 text-amber-300',
  good: 'bg-emerald-500/15 text-emerald-300',
  bad: 'bg-red-500/15 text-red-300',
};

const STATUS_TONE: Record<string, [string, string]> = {
  draft: ['Entwurf', 'neutral'],
  submitted: ['Eingereicht', 'warn'],
  needs_review: ['Prüfung nötig', 'warn'],
  approved: ['Genehmigt', 'good'],
  rejected: ['Abgelehnt', 'bad'],
  duplicate: ['Duplikat', 'bad'],
  running: ['Läuft', 'info'],
  pending: ['Ausstehend', 'warn'],
  unpaid: ['Offen', 'warn'],
  paid: ['Bar bezahlt', 'good'],
  counter_offered: ['Gegenvorschlag', 'info'],
  worker_countered: ['Gegenvorschlag Mitarbeiter', 'info'],
  planned: ['Geplant', 'neutral'],
  active: ['Aktiv', 'good'],
  completed: ['Abgeschlossen', 'neutral'],
  cancelled: ['Storniert', 'bad'],
};

export const StatusBadge = ({ status, label }: { status: string; label?: string }) => {
  const [text, tone] = STATUS_TONE[status] ?? [status, 'neutral'];
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone])}>{label ?? text}</span>;
};

export const Tag = ({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>
);

export const Stat = ({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) => (
  <div className="rounded-xl border border-border/70 bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'good' && 'text-emerald-400', tone === 'warn' && 'text-amber-400', tone === 'bad' && 'text-red-400')}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Unbekannter Fehler');

export const currentMonth = (): string => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }).slice(0, 7);

export const nativeFieldClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block space-y-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
  </label>
);
