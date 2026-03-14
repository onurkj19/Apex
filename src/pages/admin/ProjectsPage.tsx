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
  const [form, setForm] = useState({
    project_name: '',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'Ne pritje' as ProjectStatus,
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
    setLoading(true);
    try {
      await projectApi.create(form);
      setForm({ project_name: '', location: '', description: '', start_date: '', end_date: '', status: 'Ne pritje' });
      await load();
    } finally {
      setLoading(false);
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
              <div>
                <p className="font-medium">{p.project_name}</p>
                <p className="text-sm text-muted-foreground">{p.location} - {p.status}</p>
              </div>
              <p className="text-sm">Progress: {p.progress}%</p>
            </div>
          ))}
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka projekte ende.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsPage;
