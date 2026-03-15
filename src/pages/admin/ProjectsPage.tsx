import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientApi, projectApi } from '@/lib/erp-api';
import type { Project, ProjectStatus } from '@/lib/erp-types';
import { z } from 'zod';

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

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: '',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    contract_price: '',
    status: 'Ne pritje' as ProjectStatus,
    images: [] as File[],
  });

  const load = async () => {
    const [projectRows, clientRows] = await Promise.all([projectApi.list(), clientApi.list()]);
    setProjects(projectRows);
    setClients((clientRows || []).map((c: any) => ({ id: c.id, company_name: c.company_name })));
  };
  useEffect(() => {
    load();
  }, []);

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
    const normalizedLocation = form.location.trim();
    const generatedProjectTitle = buildProjectTitle(
      selectedClient.company_name,
      normalizedLocation,
      form.start_date || null,
    );
    if (!confirm('A je i sigurt qe do ta ruash projektin?')) return;
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
        status: form.status,
        imageFiles: form.images,
      });
      setForm({ client_id: '', location: '', description: '', start_date: '', end_date: '', contract_price: '', status: 'Ne pritje', images: [] });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Projekti nuk u ruajt. Provo perseri.');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (project: Project) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin e projektit?')) return;
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
        status: project.status,
      });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeProject = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete projekt?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await projectApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menaxhimi i projekteve</h2>

      <Card>
        <CardHeader>
          <CardTitle>Krijo projekt te ri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Klienti</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((s) => ({ ...s, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh klientin" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
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
              <Label>Data e perfundimit</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cmimi i kontrates (CHF)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.contract_price}
                onChange={(e) => setForm((s) => ({ ...s, contract_price: e.target.value }))}
                placeholder="p.sh. 15000"
              />
            </div>
            <div className="space-y-2">
              <Label>Statusi</Label>
              <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v as ProjectStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Pershkrimi</Label>
              <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Fotot e projektit (1 ose me shume)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setForm((s) => ({ ...s, images: Array.from(e.target.files || []) }))}
              />
              {form.images.length > 0 && (
                <p className="text-sm text-muted-foreground">{form.images.length} foto te zgjedhura</p>
              )}
            </div>
            {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>{loading ? 'Duke ruajtur...' : 'Ruaj projektin'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lista e projekteve</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="border rounded-md p-3 flex items-center justify-between">
              {editingId === p.id ? (
                <div className="w-full grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <Select
                    value={p.client_id || '__none__'}
                    onValueChange={(v) => {
                      const client = clients.find((c) => c.id === v);
                      setProjects((prev) => prev.map((x) =>
                        x.id === p.id
                          ? { ...x, client_id: v === '__none__' ? null : v, project_name: client?.company_name || x.project_name }
                          : x,
                      ));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Klienti" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Pa klient</SelectItem>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={p.location} onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, location: e.target.value } : x))} />
                  <Input value={p.description || ''} onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))} />
                  <Input
                    type="number"
                    step="0.01"
                    value={p.revenue}
                    onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, revenue: Number(e.target.value) } : x))}
                  />
                  <Select value={p.status} onValueChange={(v) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: v as ProjectStatus } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionLoadingId === `edit-${p.id}`} onClick={() => saveEdit(p)}>
                      {actionLoadingId === `edit-${p.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${p.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{p.project_name}</p>
                    <p className="text-sm text-muted-foreground">{p.location} - {p.status}</p>
                    <p className="text-xs text-muted-foreground">Cmimi kontrates: {Number(p.revenue || 0).toFixed(2)} CHF</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">Progress: {p.progress}%</p>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>Edito</Button>
                    <Button size="sm" variant="destructive" disabled={actionLoadingId === `delete-${p.id}`} onClick={() => removeProject(p.id)}>
                      {actionLoadingId === `delete-${p.id}` ? 'Duke fshire...' : 'Fshi'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka projekte ende.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsPage;
