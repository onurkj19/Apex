import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientApi, projectApi, financeApi, PROJECT_RECYCLE_RETENTION_DAYS } from '@/lib/erp-api';
import { projectFilesApi, type ProjectFile, type ProjectFileType } from '@/lib/erp/project-files';
import { DestructiveConfirmDialog } from '@/components/admin/DestructiveConfirmDialog';
import type { Project, ProjectStatus } from '@/lib/erp-types';
import { z } from 'zod';
import { cn, formatChf } from '@/lib/utils';
import { progressForProjectStatus } from '@/lib/project-progress';
import { Progress } from '@/components/ui/progress';
import { projectStatusBadgeClass } from '@/lib/project-status-styles';
import { netRevenueFromGrossInclMwst } from '@/lib/vat-ch';
import { toLocalDateKey } from '@/lib/notification-dates';
import { de } from 'date-fns/locale';
import {
  Plus, Wallet, MapPin, LayoutList, Columns3,
  Paperclip, Trash2, Upload, ExternalLink, Hash,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

const statuses: ProjectStatus[] = ['Ne pritje', 'I pranuar', 'I refuzuar', 'Ne pune', 'I perfunduar', 'I deshtuar'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIORITY_CLASS: Record<Priority, string> = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  Medium: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
  High: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
  Urgent: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300',
};

const KANBAN_STATUSES: ProjectStatus[] = ['Ne pritje', 'I pranuar', 'Ne pune', 'I perfunduar'];

const projectSchema = z.object({
  client_id: z.string().min(1, 'Zgjidh klientin'),
  location: z.string().min(2, 'Lokacioni eshte i detyrueshem'),
});

type ClientOption = { id: string; company_name: string };

const buildProjectTitle = (clientName: string, location: string, startDate?: string | null) => {
  const datePart = startDate || new Date().toISOString().slice(0, 10);
  return `${clientName} - ${location} - ${datePart}`;
};

type ClientGroup = { key: string; label: string; items: Project[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

const FILE_TYPE_LABELS: Record<ProjectFileType, string> = {
  image: 'Foto', video: 'Video', pdf: 'PDF', plan: 'Plan', safety: 'Siguria', other: 'Tjetër',
};
const FILE_TYPE_ICON: Record<ProjectFileType, string> = {
  image: '🖼️', video: '🎬', pdf: '📄', plan: '📐', safety: '🦺', other: '📎',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DescriptionWithToggle = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <CardDescription>
      Të grupuara sipas klientit; renditje sipas datës së krijimit.{' '}
      {expanded && (
        <>
          Kur një projekt kalon në <strong>I përfunduar</strong>, shuma e kontratës shtohet në financat sipas rregullave të sistemit.{' '}
          <strong>Pagesat</strong> regjistrohen në Financat si hyrje me projekt të lidhur; këtu shfaqen marrë / mbetur vs. çmimi i kontratës.{' '}
          <strong>Progress %</strong> përditësohet nga statusi. MwSt 8.1%: fitimi në P/L me neto.{' '}
        </>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-primary underline-offset-2 hover:underline text-xs font-medium"
      >
        {expanded ? 'Shfaq më pak' : 'Shfaq më shumë'}
      </button>
    </CardDescription>
  );
};

// File attachments panel for a single project
const ProjectFilesPanel = ({ projectId }: { projectId: string }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [typeHint, setTypeHint] = useState<ProjectFileType>('other');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    projectFilesApi.list(projectId).then(setFiles).catch(() => {});
  }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await projectFilesApi.upload(projectId, file, typeHint);
      setFiles((prev) => [uploaded, ...prev]);
    } catch (err: any) {
      alert('Upload dështoi: ' + (err?.message || err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (f: ProjectFile) => {
    if (!confirm(`Fshi "${f.file_name}"?`)) return;
    await projectFilesApi.delete(f);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeHint} onValueChange={(v) => setTypeHint(v as ProjectFileType)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FILE_TYPE_LABELS) as ProjectFileType[]).map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {FILE_TYPE_ICON[t]} {FILE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Duke ngarkuar...' : 'Ngarko skedar'}
        </Button>
        <input ref={inputRef} type="file" accept="*/*" className="hidden" onChange={handleUpload} />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nuk ka skedarë të ngarkuar.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-base shrink-0">{FILE_TYPE_ICON[f.file_type]}</span>
              <div className="min-w-0 flex-1">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-medium hover:underline text-xs block"
                >
                  {f.file_name}
                </a>
                <span className="text-[10px] text-muted-foreground">{FILE_TYPE_LABELS[f.file_type]}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(f)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Kanban board
const KanbanBoard = ({
  projects, clients, receivedByProject,
}: {
  projects: Project[];
  clients: ClientOption[];
  receivedByProject: Record<string, number>;
}) => {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[700px]">
        {KANBAN_STATUSES.map((status) => {
          const col = projects.filter((p) => p.status === status);
          return (
            <div key={status} className="flex-1 min-w-[200px] space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Badge variant="outline" className={cn('text-xs border', projectStatusBadgeClass(status))}>
                  {status}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((p) => {
                  const clientName = clients.find((c) => c.id === p.client_id)?.company_name ?? '';
                  const contract = Number(p.revenue || 0);
                  const received = receivedByProject[p.id] ?? 0;
                  const pct = contract > 0 ? Math.min(100, Math.round((received / contract) * 100)) : 0;
                  const priority = ((p as any).priority ?? 'Medium') as Priority;
                  return (
                    <div key={p.id} className="rounded-xl border bg-card p-3 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                      {(p as any).project_number && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          {(p as any).project_number}
                        </div>
                      )}
                      <div className="font-medium text-sm leading-snug line-clamp-2">{p.project_name}</div>
                      {clientName && <div className="text-xs text-muted-foreground">{clientName}</div>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] border px-1.5 py-0', PRIORITY_CLASS[priority])}>
                          {priority}
                        </Badge>
                        {p.location && (
                          <a
                            href={mapsUrl(p.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="h-3 w-3" />
                            Maps
                          </a>
                        )}
                      </div>
                      {contract > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{formatChf(contract)}</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1" />
                        </div>
                      )}
                      <Progress value={p.progress} className="h-1.5" />
                    </div>
                  );
                })}
                {col.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Nuk ka projekte
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editConfirmProject, setEditConfirmProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('files');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [monthView, setMonthView] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [receivedByProject, setReceivedByProject] = useState<Record<string, number>>({});
  const [paymentDraft, setPaymentDraft] = useState<Record<string, string>>({});
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: '',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    contract_price: '',
    status: 'Ne pritje' as ProjectStatus,
    priority: 'Medium' as Priority,
    images: [] as File[],
    revenue_includes_vat_8_1: false,
  });

  const load = async () => {
    const [projectRows, clientRows] = await Promise.all([projectApi.list(), clientApi.list()]);
    setProjects(projectRows);
    setClients((clientRows || []).map((c: any) => ({ id: c.id, company_name: c.company_name })));
    const ids = projectRows.map((p) => p.id);
    const sums = await projectApi.sumIncomeReceivedByProjectIds(ids);
    setReceivedByProject(sums);
  };
  useEffect(() => { load(); }, []);

  const savePanelPayment = async (projectId: string) => {
    const raw = (paymentDraft[projectId] ?? '').trim().replace(',', '.');
    if (raw === '') { setError('Shkruaj shumën (p.sh. 1500) ose 0 për të hequr pagesën e regjistruar nga paneli.'); return; }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) { setError('Shuma duhet të jetë një numër ≥ 0.'); return; }
    setSavingPaymentId(projectId);
    setError('');
    try {
      await financeApi.upsertProjectPanelIncome(projectId, n);
      setPaymentDraft((d) => { const next = { ...d }; delete next[projectId]; return next; });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ruajtja e pagesës dështoi.');
    } finally { setSavingPaymentId(null); }
  };

  // ── Filters ──
  const projectsFiltered = useMemo(() => {
    let list = projects;
    if (selectedDay) {
      const key = toLocalDateKey(selectedDay);
      list = list.filter((p) => {
        const s = p.start_date ? String(p.start_date).slice(0, 10) : '';
        const e = p.end_date ? String(p.end_date).slice(0, 10) : '';
        return s === key || e === key;
      });
    }
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.project_name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (clients.find((c) => c.id === p.client_id)?.company_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, selectedDay, statusFilter, searchQuery, clients]);

  const clientGroups = useMemo((): ClientGroup[] => {
    const map = new Map<string, ClientGroup>();
    for (const p of projectsFiltered) {
      const key = p.client_id ?? '__none__';
      const label = p.client_id ? clients.find((c) => c.id === p.client_id)?.company_name ?? 'Klient' : 'Pa klient';
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'sq'));
  }, [projectsFiltered, clients]);

  const projectDayMatcher = useMemo(() => {
    const keys = new Set<string>();
    for (const p of projects) {
      if (p.start_date) keys.add(String(p.start_date).slice(0, 10));
      if (p.end_date) keys.add(String(p.end_date).slice(0, 10));
    }
    return (date: Date) => keys.has(toLocalDateKey(date));
  }, [projects]);

  // ── Create ──
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = projectSchema.safeParse({ client_id: form.client_id, location: form.location });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme'); return; }
    if (!clients.find((c) => c.id === form.client_id)) { setError('Klienti i zgjedhur nuk u gjet.'); return; }
    setCreateDialogOpen(true);
  };

  const performCreate = async () => {
    const parsed = projectSchema.safeParse({ client_id: form.client_id, location: form.location });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme'); return; }
    const selectedClient = clients.find((c) => c.id === form.client_id);
    if (!selectedClient) { setError('Klienti i zgjedhur nuk u gjet.'); return; }
    const normalizedLocation = form.location.trim();
    const generatedProjectTitle = buildProjectTitle(selectedClient.company_name, normalizedLocation, form.start_date || null);
    setLoading(true);
    try {
      await projectApi.create({
        project_name: generatedProjectTitle,
        client_id: selectedClient.id,
        location: normalizedLocation,
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        revenue: Number(form.contract_price || 0),
        revenue_includes_vat_8_1: form.revenue_includes_vat_8_1,
        status: form.status,
        imageFiles: form.images,
        ...(form.priority !== 'Medium' ? { priority: form.priority } : {}),
      });
      setForm({ client_id: '', location: '', description: '', start_date: '', end_date: '', contract_price: '', status: 'Ne pritje', priority: 'Medium', images: [], revenue_includes_vat_8_1: false });
      setShowCreateForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Projekti nuk u ruajt. Provo perseri.');
    } finally { setLoading(false); }
  };

  // ── Edit ──
  const requestSaveEdit = (project: Project) => { setEditConfirmProject(project); setEditDialogOpen(true); };

  const performSaveEdit = async () => {
    const project = editConfirmProject;
    if (!project) return;
    setActionLoadingId(`edit-${project.id}`);
    try {
      const selectedClient = clients.find((c) => c.id === project.client_id);
      const generatedProjectTitle = buildProjectTitle(
        selectedClient?.company_name || project.project_name,
        project.location,
        (project as any).start_date || null,
      );
      await projectApi.update(project.id, {
        project_name: generatedProjectTitle,
        client_id: project.client_id,
        location: project.location,
        description: project.description,
        start_date: (project as any).start_date || null,
        end_date: (project as any).end_date || null,
        revenue: Number(project.revenue || 0),
        revenue_includes_vat_8_1: Boolean(project.revenue_includes_vat_8_1),
        status: project.status,
        ...((project as any).priority ? { priority: (project as any).priority } : {}),
      });
      setEditingId(null);
      setEditConfirmProject(null);
      await load();
    } finally { setActionLoadingId(null); }
  };

  // ── Delete ──
  const askRemoveProject = (id: string) => { setPendingDeleteId(id); setDeleteDialogOpen(true); };
  const performRemoveProject = async () => {
    if (!pendingDeleteId) return;
    setActionLoadingId(`delete-${pendingDeleteId}`);
    try {
      await projectApi.remove(pendingDeleteId);
      setPendingDeleteId(null);
      await load();
    } finally { setActionLoadingId(null); }
  };

  const accordionKey = clientGroups.map((g) => g.key).join('|');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Menaxhimi i projekteve</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
            <button
              type="button"
              className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-l', viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
          <Button type="button" onClick={() => setShowCreateForm((v) => !v)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            {showCreateForm ? 'Mbyll' : 'Shto projekt'}
          </Button>
        </div>
      </div>

      {/* ── Create form ── */}
      {showCreateForm && (
        <Card>
          <CardHeader><CardTitle>Krijo projekt të ri</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Klienti</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((s) => ({ ...s, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh klientin" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lokacioni</Label>
                <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Data e fillimit</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data e përfundimit</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Çmimi i kontratës (CHF)</Label>
                <Input type="number" step="0.01" value={form.contract_price} onChange={(e) => setForm((s) => ({ ...s, contract_price: e.target.value }))} placeholder="p.sh. 15000" className="text-lg font-semibold tabular-nums" />
              </div>
              <div className="flex items-center gap-3 md:col-span-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                <Switch id="create-vat" checked={form.revenue_includes_vat_8_1} onCheckedChange={(c) => setForm((s) => ({ ...s, revenue_includes_vat_8_1: c }))} />
                <Label htmlFor="create-vat" className="cursor-pointer text-sm font-normal leading-snug">Çmimi përfshin MwSt 8.1% (brutto).</Label>
              </div>
              <div className="space-y-2">
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v as ProjectStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioriteti</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((s) => ({ ...s, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Përshkrimi</Label>
                <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Fotot e projektit</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setForm((s) => ({ ...s, images: Array.from(e.target.files || []) }))} />
                {form.images.length > 0 && <p className="text-sm text-muted-foreground">{form.images.length} foto të zgjedhura</p>}
              </div>
              {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>{loading ? 'Duke ruajtur...' : 'Ruaj projektin'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Search + Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Kërko projekt, klient, lokacion..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Filtrimi sipas statusit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha statuset</SelectItem>
            {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Kanban view ── */}
      {viewMode === 'kanban' && (
        <Card>
          <CardHeader>
            <CardTitle>Kanban Board</CardTitle>
            <CardDescription>{projectsFiltered.length} projekte</CardDescription>
          </CardHeader>
          <CardContent>
            <KanbanBoard projects={projectsFiltered} clients={clients} receivedByProject={receivedByProject} />
          </CardContent>
        </Card>
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista e projekteve</CardTitle>
              <DescriptionWithToggle />
            </CardHeader>
            <CardContent>
              {clientGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedDay ? 'Nuk ka projekte për këtë datë.' : searchQuery ? 'Nuk u gjet asnjë projekt.' : 'Nuk ka projekte ende.'}
                </p>
              ) : (
                <Accordion key={accordionKey} type="multiple" defaultValue={[]} className="w-full">
                  {clientGroups.map((group) => (
                    <AccordionItem key={group.key} value={group.key}>
                      <AccordionTrigger className="text-left hover:no-underline break-words py-3 sm:py-2 [&>svg]:shrink-0">
                        <span className="font-semibold">{group.label}</span>
                        <span className="ml-2 text-sm font-normal text-muted-foreground">({group.items.length})</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-1 pb-4">
                        {group.items.map((p) => {
                          const contract = Number(p.revenue || 0);
                          const received = receivedByProject[p.id] ?? 0;
                          const remaining = Math.max(0, contract - received);
                          const pct = contract > 0 ? Math.min(100, Math.round((received / contract) * 100)) : 0;
                          const isExpanded = expandedProjectId === p.id;
                          const isEditing = editingId === p.id;
                          const priority = ((p as any).priority ?? 'Medium') as Priority;
                          const projectNum = (p as any).project_number;

                          return (
                            <div key={p.id} className="rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
                              {/* ── Card header row ── */}
                              <button
                                type="button"
                                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                                onClick={() => { if (isEditing) return; setExpandedProjectId((prev) => (prev === p.id ? null : p.id)); }}
                              >
                                {projectNum && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0">
                                    <Hash className="h-3 w-3" />{projectNum}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 break-words font-medium leading-snug">{p.project_name}</span>
                                <Badge variant="outline" className={cn('shrink-0 border text-[10px] px-1.5 py-0', PRIORITY_CLASS[priority])}>
                                  {priority}
                                </Badge>
                                <Badge variant="outline" className={cn('shrink-0 border', projectStatusBadgeClass(p.status))}>
                                  {p.status}
                                </Badge>
                                <span className="shrink-0 tabular-nums font-bold text-foreground">{formatChf(contract)}</span>
                                <span className={cn('shrink-0 text-muted-foreground transition-transform duration-200', isExpanded || isEditing ? 'rotate-180' : '')}>▾</span>
                              </button>

                              {/* ── Expanded details ── */}
                              {(isExpanded || isEditing) && (
                                <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-4">
                                  {isEditing ? (
                                    /* Edit form */
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                        <Select value={p.client_id || '__none__'} onValueChange={(v) => {
                                          const client = clients.find((c) => c.id === v);
                                          setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, client_id: v === '__none__' ? null : v, project_name: client?.company_name || x.project_name } : x));
                                        }}>
                                          <SelectTrigger><SelectValue placeholder="Klienti" /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__none__">Pa klient</SelectItem>
                                            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                                          </SelectContent>
                                        </Select>
                                        <Input placeholder="Lokacioni" value={p.location} onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, location: e.target.value } : x)))} />
                                        <Input placeholder="Përshkrimi" value={p.description || ''} onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x)))} />
                                        <Input type="number" step="0.01" placeholder="Çmimi (CHF)" className="font-semibold tabular-nums" value={p.revenue} onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, revenue: Number(e.target.value) } : x)))} />
                                        <Select value={p.status} onValueChange={(v) => {
                                          const st = v as ProjectStatus;
                                          setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: st, progress: progressForProjectStatus(st) } : x)));
                                        }}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>{statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <Select value={(p as any).priority ?? 'Medium'} onValueChange={(v) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, priority: v } : x)))}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>{PRIORITIES.map((pr) => (<SelectItem key={pr} value={pr}>{pr}</SelectItem>))}</SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                                        <Switch id={`vat-${p.id}`} checked={Boolean(p.revenue_includes_vat_8_1)} onCheckedChange={(c) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, revenue_includes_vat_8_1: c } : x)))} />
                                        <Label htmlFor={`vat-${p.id}`} className="cursor-pointer text-sm font-normal">Çmimi përfshin MwSt 8.1%</Label>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" disabled={actionLoadingId === `edit-${p.id}`} onClick={() => requestSaveEdit(p)}>
                                          {actionLoadingId === `edit-${p.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${p.id}`} onClick={() => { setEditingId(null); setExpandedProjectId(p.id); }}>
                                          Anulo
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* View details */
                                    <div className="space-y-4">
                                      {/* Location + Maps */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm text-muted-foreground flex-1">{p.location}</span>
                                        <a
                                          href={mapsUrl(p.location)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline border border-primary/30 rounded-md px-2 py-0.5 bg-primary/5"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          Google Maps
                                        </a>
                                      </div>

                                      {p.revenue_includes_vat_8_1 ? (
                                        <p className="text-xs text-muted-foreground">Brutto (inkl. MwSt) · Neto: {formatChf(netRevenueFromGrossInclMwst(contract))}</p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Çmim pa ndarje MwSt</p>
                                      )}

                                      {/* Payment panel */}
                                      <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-br from-muted/50 via-muted/20 to-transparent p-3 text-sm shadow-sm sm:p-4">
                                        <div className="space-y-2 border-b border-border/40 pb-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-muted-foreground">Faturë (kontratë)</span>
                                            <span className="shrink-0 tabular-nums font-medium">{formatChf(contract)}</span>
                                          </div>
                                          <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                                            <span>Pagesë e marrë</span>
                                            <span className="shrink-0 tabular-nums font-semibold">{formatChf(received)}</span>
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-primary/20 bg-background/95 p-3 ring-1 ring-inset ring-border/35 sm:p-4">
                                          <div className="mb-3 flex gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                              <Wallet className="h-4 w-4" aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                              <p className="text-sm font-medium leading-tight">Përditëso pagesën</p>
                                              <p className="text-[11px] leading-relaxed text-muted-foreground">Shkruaj shumën dhe ruaj — një hyrje në Financat.</p>
                                            </div>
                                          </div>
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                              <Label htmlFor={`pay-in-${p.id}`} className="text-xs text-muted-foreground">Shuma (CHF)</Label>
                                              <Input id={`pay-in-${p.id}`} type="number" min={0} step="0.01" inputMode="decimal" className="h-10 w-full min-w-0 tabular-nums" placeholder="p.sh. 1500" value={paymentDraft[p.id] ?? ''} onChange={(e) => setPaymentDraft((d) => ({ ...d, [p.id]: e.target.value }))} disabled={savingPaymentId === p.id} />
                                            </div>
                                            <Button type="button" variant="secondary" className="h-10 w-full shrink-0 px-4 sm:w-auto sm:min-w-[10rem]" disabled={savingPaymentId === p.id} onClick={() => void savePanelPayment(p.id)}>
                                              {savingPaymentId === p.id ? 'Duke ruajtur...' : 'Ruaj pagesën'}
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-amber-800 dark:text-amber-200">
                                          <span className="font-medium">Mbetur</span>
                                          <span className="shrink-0 tabular-nums text-base font-semibold sm:text-lg">{formatChf(remaining)}</span>
                                        </div>
                                        {contract > 0 && (
                                          <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                              <span>Pagesa ndaj kontratës</span>
                                              <span className="tabular-nums">{pct}%</span>
                                            </div>
                                            <Progress value={pct} className="h-2" />
                                          </div>
                                        )}
                                      </div>

                                      {/* Progress */}
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span className="font-medium uppercase tracking-wide">Progres</span>
                                          <span className="tabular-nums">{p.progress}%</span>
                                        </div>
                                        <Progress value={p.progress} className="h-2.5 w-full" />
                                      </div>

                                      {/* Tabs: Files / Issues */}
                                      <div className="pt-1">
                                        <Tabs value={activeTab === p.id + '-files' ? 'files' : activeTab === p.id + '-issues' ? 'issues' : 'files'} onValueChange={(v) => setActiveTab(p.id + '-' + v)}>
                                          <TabsList className="h-8 text-xs">
                                            <TabsTrigger value="files" className="text-xs gap-1.5 h-7">
                                              <Paperclip className="h-3.5 w-3.5" /> Skedarë
                                            </TabsTrigger>
                                          </TabsList>
                                          <div className="mt-3">
                                            <ProjectFilesPanel projectId={p.id} />
                                          </div>
                                        </Tabs>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>Modifiko</Button>
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={actionLoadingId === `delete-${p.id}`} onClick={() => askRemoveProject(p.id)}>
                                          {actionLoadingId === `delete-${p.id}` ? 'Duke fshirë...' : 'Fshi'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kalendari</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">Ditët me pikë = fillim ose fund projekti.</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-4">
              <Calendar
                mode="single" locale={de} weekStartsOn={1}
                month={monthView} onMonthChange={setMonthView}
                selected={selectedDay} onSelect={setSelectedDay}
                modifiers={{ has_project: projectDayMatcher }}
                modifiersClassNames={{ has_project: 'relative font-medium text-foreground after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[""]' }}
                className="w-full max-w-[min(100%,320px)] rounded-md border bg-muted/20 p-2 sm:p-3"
                classNames={{ day: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative overflow-visible') }}
              />
              {selectedDay && (
                <Button type="button" variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setSelectedDay(undefined)}>
                  Hiq filtrin e datës
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Dialogs ── */}
      <DestructiveConfirmDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} title="Krijo projektin?" description="A dëshiron të krijosh këtë projekt?" confirmLabel="Po, krijo" confirmVariant="default" loading={loading} onConfirm={performCreate} />
      <DestructiveConfirmDialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) setEditConfirmProject(null); }} title="Ruaj ndryshimet?" description="A dëshiron të ruash ndryshimet?" confirmLabel="Po, ruaj" confirmVariant="default" loading={Boolean(editConfirmProject && actionLoadingId === `edit-${editConfirmProject.id}`)} onConfirm={performSaveEdit} />
      <DestructiveConfirmDialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setPendingDeleteId(null); }} title="Fshi projektin?" description={`Projekti kalon në Koshi. Mund ta rikthesh brenda ${PROJECT_RECYCLE_RETENTION_DAYS} ditëve.`} confirmLabel="Po, fshi" loading={Boolean(pendingDeleteId && actionLoadingId === `delete-${pendingDeleteId}`)} onConfirm={performRemoveProject} />
    </div>
  );
};

export default ProjectsPage;
