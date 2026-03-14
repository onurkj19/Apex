import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contractApi } from '@/lib/erp-api';
import type { ContractStatus } from '@/lib/erp-types';

const statuses: ContractStatus[] = ['Active', 'Failed', 'Completed'];

const ContractsPage = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ContractStatus>('Active');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = async () => setContracts(await contractApi.list());
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!confirm('A je i sigurt qe do ta ruash kete kontrate?')) return;
    setLoading(true);
    try {
      const uploaded = await contractApi.uploadPdf(file);
      await contractApi.create({
        status,
        contract_file_url: uploaded.url,
        contract_file_path: uploaded.path,
      });
      setFile(null);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (contract: any) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin e kontrates?')) return;
    setActionLoadingId(`edit-${contract.id}`);
    try {
      await contractApi.update(contract.id, { status: contract.status });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeContract = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kontraten?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await contractApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Kontratat</h2>
      <Card>
        <CardHeader><CardTitle>Ngarko kontrate PDF</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Dokumenti PDF</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div className="space-y-2">
              <Label>Statusi</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>{loading ? 'Duke ngarkuar...' : 'Ruaj kontraten'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lista e kontratave</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {contracts.map((c) => (
            <div key={c.id} className="border rounded-md p-3 flex items-center justify-between">
              {editingId === c.id ? (
                <div className="w-full flex items-center gap-2">
                  <Select value={c.status} onValueChange={(v) => setContracts((prev: any[]) => prev.map((x) => x.id === c.id ? { ...x, status: v } : x))}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" disabled={actionLoadingId === `edit-${c.id}`} onClick={() => saveEdit(c)}>
                    {actionLoadingId === `edit-${c.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${c.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">Status: {c.status}</p>
                    <p className="text-sm text-muted-foreground">{c.contract_file_url}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {c.contract_file_url && <a className="text-sm underline" target="_blank" href={c.contract_file_url}>Shiko PDF</a>}
                    <Button size="sm" variant="outline" onClick={() => setEditingId(c.id)}>Edito</Button>
                    <Button size="sm" variant="destructive" disabled={actionLoadingId === `delete-${c.id}`} onClick={() => removeContract(c.id)}>
                      {actionLoadingId === `delete-${c.id}` ? 'Duke fshire...' : 'Fshi'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {contracts.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka kontrata.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractsPage;
