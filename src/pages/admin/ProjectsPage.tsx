import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { clientApi, projectApi, financeApi, PROJECT_RECYCLE_RETENTION_DAYS } from '@/lib/erp-api';
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
import { Plus, Wallet } from 'lucide-react';

const statuses: ProjectStatus[] = ['Ne pritje', 'I pranuar', 'I refuzuar', 'Ne pune', 'I perfunduar', 'I deshtuar'];
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
  const [monthView, setMonthView] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  /** Shuma e hyrjeve nga financat për çdo project_id (pagesa të regjistruara). */
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
  useEffect(() => {
    load();
  }, []);

  const savePanelPayment = async (projectId: string) => {
    const raw = (paymentDraft[projectId] ?? "").trim().replace(",", ".");
    if (raw === "") {
      setError("Shkruaj shumën (p.sh. 1500) ose 0 për të hequr pagesën e regjistruar nga paneli.");
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      setError("Shuma duhet të jetë një numër ≥ 0.");
      return;
    }
    setSavingPaymentId(projectId);
    setError("");
    try {
      await financeApi.upsertProjectPanelIncome(projectId, n);
      setPaymentDraft((d) => {
        const next = { ...d };
        delete next[projectId];
        return next;
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ruajtja e pagesës dështoi.");
    } finally {
      setSavingPaymentId(null);
    }
  };

  const projectsFiltered = useMemo(() => {
    if (!selectedDay) return projects;
    const key = toLocalDateKey(selectedDay);
    return projects.filter((p) => {
      const s = p.start_date ? String(p.start_date).slice(0, 10) : '';
      const e = p.end_date ? String(p.end_date).slice(0, 10) : '';
      return s === key || e === key;
    });
  }, [projects, selectedDay]);

  const clientGroups = useMemo((): ClientGroup[] => {
    const map = new Map<string, ClientGroup>();
    for (const p of projectsFiltered) {
      const key = p.client_id ?? '__none__';
      const label =
        p.client_id ? clients.find((c) => c.id === p.client_id)?.company_name ?? 'Klient' : 'Pa klient';
      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = projectSchema.safeParse({ client_id: form.client_id, location: form.location });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
    const selectedClient = clients.find((c) => c.id === form.client_id);
    if (!selectedClient) {
      setError('Klienti i zgjedhur nuk u gjet.');
      return;
    }
    setCreateDialogOpen(true);
  };

  const performCreate = async () => {
    const parsed = projectSchema.safeParse({ client_id: form.client_id, location: form.location });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
    const selectedClient = clients.find((c) => c.id === form.client_id);
    if (!selectedClient) {
      setError('Klienti i zgjedhur nuk u gjet.');
      return;
    }
    const normalizedLocation = form.location.trim();
    const generatedProjectTitle = buildProjectTitle(
      selectedClient.company_name,
      normalizedLocation,
      form.start_date || null,
    );
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
      });
      setForm({
        client_id: '',
        location: '',
        description: '',
        start_date: '',
        end_date: '',
        contract_price: '',
        status: 'Ne pritje',
        images: [],
        revenue_includes_vat_8_1: false,
      });
      setShowCreateForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Projekti nuk u ruajt. Provo perseri.');
    } finally {
      setLoading(false);
    }
  };

  const requestSaveEdit = (project: Project) => {
    setEditConfirmProject(project);
    setEditDialogOpen(true);
  };

  const performSaveEdit = async () => {
    const project = editConfirmProject;
    if (!project) return;
    setActionLoadingId(`edit-${project.id}`);
    try {
      // '__none__' është vlera e UI për "Pa klient" — konvertoje në null për DB
      const resolvedClientId =
        !project.client_id || project.client_id === '__none__' ? null : project.client_id;
      const selectedClient = resolvedClientId
        ? clients.find((c) => c.id === resolvedClientId)
        : null;
      const generatedProjectTitle = buildProjectTitle(
        selectedClient?.company_name || project.location,
        project.location,
        (project as any).start_date || null,
      );
      await projectApi.update(project.id, {
        project_name: generatedProjectTitle,
        client_id: resolvedClientId,
        location: project.location,
        description: project.description,
        start_date: (project as any).start_date || null,
        end_date: (project as any).end_date || null,
        revenue: Number(project.revenue || 0),
        revenue_includes_vat_8_1: Boolean(project.revenue_includes_vat_8_1),
        status: project.status,
      });
      setEditingId(null);
      setEditConfirmProject(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const askRemoveProject = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const performRemoveProject = async () => {
    if (!pendingDeleteId) return;
    setActionLoadingId(`delete-${pendingDeleteId}`);
    try {
      await projectApi.remove(pendingDeleteId);
      setPendingDeleteId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const accordionKey = clientGroups.map((g) => g.key).join('|');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Menaxhimi i projekteve</h2>
        <Button type="button" onClick={() => setShowCreateForm((v) => !v)} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          {showCreateForm ? 'Mbyll formularin' : 'Shto projekt të ri'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Krijo projekt të ri</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Klienti</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((s) => ({ ...s, client_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidh klientin" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lokacioni</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                  required
                />
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
                <Input
                  type="number"
                  step="0.01"
                  value={form.contract_price}
                  onChange={(e) => setForm((s) => ({ ...s, contract_price: e.target.value }))}
                  placeholder="p.sh. 15000"
                  className="text-lg font-semibold tabular-nums"
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                <Switch
                  id="create-vat"
                  checked={form.revenue_includes_vat_8_1}
                  onCheckedChange={(c) => setForm((s) => ({ ...s, revenue_includes_vat_8_1: c }))}
                />
                <Label htmlFor="create-vat" className="cursor-pointer text-sm font-normal leading-snug">
                  Çmimi përfshin MwSt 8.1% (brutto). Për fitim/humbje përdoret netoja = çmimi ÷ 1.081.
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Statusi</Label>
                <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v as ProjectStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Përshkrimi</Label>
                <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Fotot e projektit (1 ose më shumë)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setForm((s) => ({ ...s, images: Array.from(e.target.files || []) }))}
                />
                {form.images.length > 0 && (
                  <p className="text-sm text-muted-foreground">{form.images.length} foto të zgjedhura</p>
                )}
              </div>
              {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Duke ruajtur...' : 'Ruaj projektin'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Anulo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lista e projekteve</CardTitle>
            <DescriptionWithToggle />
          </CardHeader>
          <CardContent>
            {clientGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedDay ? 'Nuk ka projekte për këtë datë.' : 'Nuk ka projekte ende.'}
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
                        return (
                          <div
                            key={p.id}
                            className="rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
                          >
                            {/* --- Rreshti i kokës (gjithmonë i dukshëm) --- */}
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                              onClick={() => {
                                if (isEditing) return;
                                setExpandedProjectId((prev) => (prev === p.id ? null : p.id));
                              }}
                            >
                              <span className="min-w-0 flex-1 break-words font-medium leading-snug">{p.project_name}</span>
                              <Badge variant="outline" className={cn('shrink-0 border', projectStatusBadgeClass(p.status))}>
                                {p.status}
                              </Badge>
                              <span className="shrink-0 tabular-nums font-bold text-foreground">
                                {formatChf(contract)}
                              </span>
                              <span className={cn('shrink-0 text-muted-foreground transition-transform duration-200', isExpanded || isEditing ? 'rotate-180' : '')}>
                                ▾
                              </span>
                            </button>

                            {/* --- Detajet dhe edit-i (shfaqen kur është hapur) --- */}
                            {(isExpanded || isEditing) && (
                              <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-4">
                                {isEditing ? (
                                  /* ── Formulari i editimit ── */
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                      <Select
                                        value={p.client_id || '__none__'}
                                        onValueChange={(v) => {
                                          const newClientId = v === '__none__' ? null : v;
                                          const client = newClientId ? clients.find((c) => c.id === newClientId) : null;
                                          setProjects((prev) =>
                                            prev.map((x) =>
                                              x.id === p.id
                                                ? { ...x, client_id: newClientId, project_name: client?.company_name || x.project_name }
                                                : x,
                                            ),
                                          );
                                        }}
                                      >
                                        <SelectTrigger><SelectValue placeholder="Klienti" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Pa klient</SelectItem>
                                          {clients.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        placeholder="Lokacioni"
                                        value={p.location}
                                        onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, location: e.target.value } : x)))}
                                      />
                                      <Input
                                        placeholder="Përshkrimi"
                                        value={p.description || ''}
                                        onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x)))}
                                      />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Çmimi (CHF)"
                                        className="font-semibold tabular-nums"
                                        value={p.revenue}
                                        onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, revenue: Number(e.target.value) } : x)))}
                                      />
                                      <Select
                                        value={p.status}
                                        onValueChange={(v) => {
                                          const st = v as ProjectStatus;
                                          setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: st, progress: progressForProjectStatus(st) } : x)));
                                        }}
                                      >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                                      <Switch
                                        id={`vat-${p.id}`}
                                        checked={Boolean(p.revenue_includes_vat_8_1)}
                                        onCheckedChange={(c) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, revenue_includes_vat_8_1: c } : x)))}
                                      />
                                      <Label htmlFor={`vat-${p.id}`} className="cursor-pointer text-sm font-normal">
                                        Çmimi përfshin MwSt 8.1%
                                      </Label>
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
                                  /* ── Pamja e detajeve ── */
                                  <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">{p.location}</p>
                                    {p.revenue_includes_vat_8_1 ? (
                                      <p className="text-xs text-muted-foreground">
                                        Brutto (inkl. MwSt) · Neto për P/L: {formatChf(netRevenueFromGrossInclMwst(contract))}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Çmim pa ndarje MwSt (neto për P/L)</p>
                                    )}

                                    {/* Pagesa */}
                                    <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-br from-muted/50 via-muted/20 to-transparent p-3 text-sm shadow-sm sm:p-4">
                                      <div className="space-y-2 border-b border-border/40 pb-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-muted-foreground">Faturë (kontratë)</span>
                                          <span className="shrink-0 tabular-nums font-medium">{formatChf(contract)}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                                          <span>Pagesë e marrë (total)</span>
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
                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                              Shkruaj shumën dhe ruaj — një hyrje në Financat.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                                          <div className="min-w-0 flex-1 space-y-1.5">
                                            <Label htmlFor={`pay-in-${p.id}`} className="text-xs text-muted-foreground">Shuma (CHF)</Label>
                                            <Input
                                              id={`pay-in-${p.id}`}
                                              type="number"
                                              min={0}
                                              step="0.01"
                                              inputMode="decimal"
                                              className="h-10 w-full min-w-0 tabular-nums"
                                              placeholder="p.sh. 1500"
                                              value={paymentDraft[p.id] ?? ""}
                                              onChange={(e) => setPaymentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                                              disabled={savingPaymentId === p.id}
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            className="h-10 w-full shrink-0 px-4 sm:w-auto sm:min-w-[10rem]"
                                            disabled={savingPaymentId === p.id}
                                            onClick={() => void savePanelPayment(p.id)}
                                          >
                                            {savingPaymentId === p.id ? "Duke ruajtur..." : "Ruaj pagesën"}
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

                                    {/* Progresi */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span className="font-medium uppercase tracking-wide">Progres</span>
                                        <span className="tabular-nums">{p.progress}%</span>
                                      </div>
                                      <Progress value={p.progress} className="h-2.5 w-full" />
                                    </div>

                                    {/* Butonat */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
                                        Modifiko
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={actionLoadingId === `delete-${p.id}`}
                                        onClick={() => askRemoveProject(p.id)}
                                      >
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

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kalendari</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Ditët me pikë = fillim ose fund projekti. Kliko një ditë për të filtruar listën.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            <Calendar
              mode="single"
              locale={de}
              weekStartsOn={1}
              month={monthView}
              onMonthChange={setMonthView}
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={{ has_project: projectDayMatcher }}
              modifiersClassNames={{
                has_project:
                  'relative font-medium text-foreground after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[""]',
              }}
              className="w-full max-w-[min(100%,320px)] rounded-md border bg-muted/20 p-2 sm:p-3"
              classNames={{
                day: cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative overflow-visible',
                ),
              }}
            />
            {selectedDay && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setSelectedDay(undefined)}
              >
                Hiq filtrin e datës
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <DestructiveConfirmDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Krijo projektin?"
        description="A dëshiron të krijosh këtë projekt me të dhënat e dhëna?"
        confirmLabel="Po, krijo"
        confirmVariant="default"
        loading={loading}
        onConfirm={performCreate}
      />
      <DestructiveConfirmDialog
        open={editDialogOpen}
        onOpenChange={(o) => {
          setEditDialogOpen(o);
          if (!o) setEditConfirmProject(null);
        }}
        title="Ruaj ndryshimet?"
        description="A dëshiron të ruash ndryshimet për këtë projekt?"
        confirmLabel="Po, ruaj"
        confirmVariant="default"
        loading={Boolean(editConfirmProject && actionLoadingId === `edit-${editConfirmProject.id}`)}
        onConfirm={performSaveEdit}
      />
      <DestructiveConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(o) => {
          setDeleteDialogOpen(o);
          if (!o) setPendingDeleteId(null);
        }}
        title="Fshi projektin?"
        description={`Projekti kalon në Koshi (Recycle Bin). Mund ta rikthesh brenda ${PROJECT_RECYCLE_RETENTION_DAYS} ditëve nga faqja Koshi. Pas ${PROJECT_RECYCLE_RETENTION_DAYS} ditëve fshihet përfundimisht.`}
        confirmLabel="Po, fshi"
        loading={Boolean(pendingDeleteId && actionLoadingId === `delete-${pendingDeleteId}`)}
        onConfirm={performRemoveProject}
      />
    </div>
  );
};

export default ProjectsPage;
