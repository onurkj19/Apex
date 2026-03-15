import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { FileText } from 'lucide-react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import { contractApi } from '@/lib/erp-api';
import type { Contract, ContractStatus } from '@/lib/erp-types';

const statuses: ContractStatus[] = ['Active', 'Failed', 'Completed'];
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const getPdfFileName = (contract: Contract) => {
  const source = contract.contract_file_path || contract.contract_file_url || '';
  if (!source) return 'Dokumenti.pdf';
  const lastSegment = source.split('/').pop() || source;
  return decodeURIComponent(lastSegment);
};

const ContractPdfPreview = ({ url }: { url: string }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument(url);

    const buildPreview = async () => {
      try {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 80;
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        if (!cancelled) setThumbnail(dataUrl);
        await pdf.destroy();
      } catch {
        if (!cancelled) setThumbnail(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void buildPreview();
    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  if (thumbnail) {
    return <img src={thumbnail} alt="PDF preview" className="h-12 w-12 rounded-md border object-cover" />;
  }

  return (
    <div className="h-12 w-12 rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
      <FileText className="h-6 w-6" />
      <span className="sr-only">{isLoading ? 'Duke ngarkuar preview' : 'Pa preview'}</span>
    </div>
  );
};

const ContractsPage = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ContractStatus>('Active');
  const [contractTitle, setContractTitle] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = async () => setContracts(await contractApi.list());
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!contractTitle.trim() || !contractAddress.trim()) {
      alert('Shkruaj titullin dhe adresen e kontrates.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash kete kontrate?')) return;
    setLoading(true);
    try {
      const uploaded = await contractApi.uploadPdf(file);
      await contractApi.create({
        contract_title: contractTitle.trim(),
        contract_address: contractAddress.trim(),
        status,
        contract_file_url: uploaded.url,
        contract_file_path: uploaded.path,
      });
      setFile(null);
      setContractTitle('');
      setContractAddress('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (contract: Contract) => {
    if (!contract.contract_title?.trim() || !contract.contract_address?.trim()) {
      alert('Titulli dhe adresa jane te detyrueshme.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash editimin e kontrates?')) return;
    setActionLoadingId(`edit-${contract.id}`);
    try {
      await contractApi.update(contract.id, {
        status: contract.status,
        contract_title: contract.contract_title.trim(),
        contract_address: contract.contract_address.trim(),
      });
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
              <Label>Titulli i kontrates</Label>
              <Input value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} placeholder="p.sh. Kontrate montimi skelash" required />
            </div>
            <div className="space-y-2">
              <Label>Adresa</Label>
              <Input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="p.sh. Bahnhofstrasse 10, Zurich" required />
            </div>
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
            <div key={c.id} className="border rounded-md p-3 space-y-3">
              {editingId === c.id ? (
                <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    value={c.contract_title ?? ''}
                    onChange={(e) =>
                      setContracts((prev) => prev.map((x) => (x.id === c.id ? { ...x, contract_title: e.target.value } : x)))
                    }
                    placeholder="Titulli i kontrates"
                  />
                  <Input
                    value={c.contract_address ?? ''}
                    onChange={(e) =>
                      setContracts((prev) => prev.map((x) => (x.id === c.id ? { ...x, contract_address: e.target.value } : x)))
                    }
                    placeholder="Adresa"
                  />
                  <Select value={c.status} onValueChange={(v) => setContracts((prev) => prev.map((x) => x.id === c.id ? { ...x, status: v as ContractStatus } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={actionLoadingId === `edit-${c.id}`} onClick={() => saveEdit(c)}>
                      {actionLoadingId === `edit-${c.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-${c.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{c.contract_title || 'Pa titull'}</p>
                    <p className="text-sm text-muted-foreground">{c.contract_address || 'Pa adrese'}</p>
                    <p className="text-sm font-medium mt-1">Status: {c.status}</p>
                  </div>
                  {c.contract_file_url && (
                    <a
                      href={c.contract_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block w-full max-w-sm rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="p-3 flex items-center gap-3">
                        <ContractPdfPreview url={c.contract_file_url} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{getPdfFileName(c)}</p>
                          <p className="text-xs text-muted-foreground">PDF Dokument - Kliko per ta hapur</p>
                        </div>
                      </div>
                    </a>
                  )}
                  <div className="flex gap-2 items-center">
                    <RowActionsMenu
                      disabled={actionLoadingId === `delete-${c.id}`}
                      actions={[
                        { label: 'Edito', onClick: () => setEditingId(c.id) },
                        {
                          label: actionLoadingId === `delete-${c.id}` ? 'Duke fshire...' : 'Fshi',
                          onClick: () => removeContract(c.id),
                          disabled: actionLoadingId === `delete-${c.id}`,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>
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
