import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectApi } from '@/lib/erp-api';
import type { Project, ProjectStatus } from '@/lib/erp-types';
import { z } from 'zod';

const statuses: ProjectStatus[] = ['Ne pritje', 'I pranuar', 'I refuzuar', 'Ne pune', 'I perfunduar', 'I deshtuar'];
const projectSchema = z.object({
  project_name: z.string().min(3, 'Emri i projektit duhet te kete te pakten 3 karaktere'),
  location: z.string().min(2, 'Lokacioni eshte i detyrueshem'),
});

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    project_name: '',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'Ne pritje' as ProjectStatus,
    images: [] as File[],
  });

  const load = async () => setProjects(await projectApi.list());
  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = projectSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Te dhena te pavlefshme');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash projektin?')) return;
    setLoading(true);
    try {
      await projectApi.create({
        project_name: form.project_name.trim(),
        location: form.location.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        imageFiles: form.images,
      });
      setForm({ project_name: '', location: '', description: '', start_date: '', end_date: '', status: 'Ne pritje', images: [] });
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
      await projectApi.update(project.id, {
        project_name: project.project_name,
        location: project.location,
        description: project.description,
        start_date: (project as any).start_date || null,
        end_date: (project as any).end_date || null,
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
              <Label>Emri i projektit</Label>
              <Input value={form.project_name} onChange={(e) => setForm((s) => ({ ...s, project_name: e.target.value }))} required />
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
                <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <Input value={p.project_name} onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, project_name: e.target.value } : x))} />
                  <Input value={p.location} onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, location: e.target.value } : x))} />
                  <Input value={p.description || ''} onChange={(e) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))} />
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
