import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invoiceApi, projectApi, quoteApi } from '@/lib/erp-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { AlertTriangle, Ban, CheckCircle2, Clock3, FileCheck2, FileText, Hourglass, Send, XCircle } from 'lucide-react';
import type { Invoice, InvoiceStatus, Project, Quote, QuoteStatus } from '@/lib/erp-types';

const quoteStatuses: QuoteStatus[] = ['Draft', 'Derguar', 'Pranuar', 'Perfunduar', 'Refuzuar'];
const invoiceStatuses: InvoiceStatus[] = ['pending', 'paid', 'partial', 'overdue', 'cancelled'];
const ALL_QUOTE_STATUSES = '__all_quote_statuses__';
const ALL_INVOICE_STATUSES = '__all_invoice_statuses__';

const getDocName = (path?: string | null, url?: string | null) => {
  const source = path || url || '';
  if (!source) return 'Dokumenti';
  const last = source.split('/').pop() || source;
  return decodeURIComponent(last);
};

const quoteStatusBadgeClass: Record<QuoteStatus, string> = {
  Draft: 'bg-slate-100 text-slate-800 border-slate-200',
  Derguar: 'bg-blue-100 text-blue-800 border-blue-200',
  Pranuar: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Perfunduar: 'bg-green-100 text-green-800 border-green-200',
  Refuzuar: 'bg-red-100 text-red-800 border-red-200',
};

const invoiceStatusBadgeClass: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-blue-100 text-blue-800 border-blue-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
};

const getQuoteStatusIcon = (status: QuoteStatus) => {
  const iconClass = 'h-3.5 w-3.5';
  switch (status) {
    case 'Draft':
      return <FileText className={iconClass} />;
    case 'Derguar':
      return <Send className={iconClass} />;
    case 'Pranuar':
      return <FileCheck2 className={iconClass} />;
    case 'Perfunduar':
      return <CheckCircle2 className={iconClass} />;
    case 'Refuzuar':
      return <XCircle className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
};

const getInvoiceStatusIcon = (status: InvoiceStatus) => {
  const iconClass = 'h-3.5 w-3.5';
  switch (status) {
    case 'pending':
      return <Clock3 className={iconClass} />;
    case 'paid':
      return <CheckCircle2 className={iconClass} />;
    case 'partial':
      return <Hourglass className={iconClass} />;
    case 'overdue':
      return <AlertTriangle className={iconClass} />;
    case 'cancelled':
      return <Ban className={iconClass} />;
    default:
      return <Clock3 className={iconClass} />;
  }
};

const QuotesInvoicesPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>(ALL_QUOTE_STATUSES);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>(ALL_INVOICE_STATUSES);
  const [quoteForm, setQuoteForm] = useState({
    quote_title: '',
    status: 'Draft' as QuoteStatus,
    project_id: '',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_title: '',
    invoice_number: '',
    amount: '',
    status: 'pending' as InvoiceStatus,
    project_id: '',
  });

  const visibleQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        if (quoteStatusFilter === ALL_QUOTE_STATUSES) return true;
        return (q.status || 'Draft') === quoteStatusFilter;
      }),
    [quotes, quoteStatusFilter],
  );

  const visibleInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        if (invoiceStatusFilter === ALL_INVOICE_STATUSES) return true;
        return inv.status === invoiceStatusFilter;
      }),
    [invoices, invoiceStatusFilter],
  );

  const load = async () => {
    const [projectRows, quoteRows, invoiceRows] = await Promise.all([
      projectApi.list(),
      quoteApi.list(),
      invoiceApi.list(),
    ]);
    setProjects(projectRows);
    setQuotes(quoteRows);
    setInvoices(invoiceRows);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateQuote = async (e: FormEvent) => {
    e.preventDefault();
    if (!quoteFile) {
      alert('Ngarko dokumentin e ofertes (Excel/PDF).');
      return;
    }
    if (!quoteForm.quote_title.trim()) {
      alert('Shkruaj titullin e ofertes.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash oferten?')) return;

    setIsSubmittingQuote(true);
    try {
      const uploaded = await quoteApi.uploadDocument(quoteFile);
      await quoteApi.create({
        quote_title: quoteForm.quote_title.trim(),
        status: quoteForm.status,
        project_id: quoteForm.project_id || null,
        quote_file_url: uploaded.url,
        quote_file_path: uploaded.path,
      });
      setQuoteForm({ quote_title: '', status: 'Draft', project_id: '' });
      setQuoteFile(null);
      await load();
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const onCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoiceFile) {
      alert('Ngarko dokumentin e fatures (Excel/PDF).');
      return;
    }
    if (!invoiceForm.invoice_title.trim()) {
      alert('Shkruaj titullin e fatures.');
      return;
    }
    if (!invoiceForm.invoice_number.trim()) {
      alert('Shkruaj numrin e fatures.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash faturen?')) return;

    setIsSubmittingInvoice(true);
    try {
      const uploaded = await invoiceApi.uploadDocument(invoiceFile);
      await invoiceApi.create({
        invoice_title: invoiceForm.invoice_title.trim(),
        invoice_number: invoiceForm.invoice_number.trim(),
        amount: Number(invoiceForm.amount || 0),
        status: invoiceForm.status,
        project_id: invoiceForm.project_id || null,
        invoice_file_url: uploaded.url,
        invoice_file_path: uploaded.path,
      });
      setInvoiceForm({
        invoice_title: '',
        invoice_number: '',
        amount: '',
        status: 'pending',
        project_id: '',
      });
      setInvoiceFile(null);
      await load();
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const saveQuoteEdit = async (q: Quote) => {
    if (!q.quote_title?.trim()) {
      alert('Titulli i ofertes eshte i detyrueshem.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash editimin e ofertes?')) return;
    setActionLoadingId(`quote-save-${q.id}`);
    try {
      await quoteApi.update(q.id, {
        quote_title: q.quote_title.trim(),
        status: q.status,
        project_id: q.project_id || null,
      });
      setEditingQuoteId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeQuote = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish oferten?')) return;
    setActionLoadingId(`quote-delete-${id}`);
    try {
      await quoteApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const saveInvoiceEdit = async (inv: Invoice) => {
    if (!inv.invoice_title?.trim()) {
      alert('Titulli i fatures eshte i detyrueshem.');
      return;
    }
    if (!inv.invoice_number?.trim()) {
      alert('Numri i fatures eshte i detyrueshem.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash editimin e fatures?')) return;
    setActionLoadingId(`invoice-save-${inv.id}`);
    try {
      await invoiceApi.update(inv.id, {
        invoice_title: inv.invoice_title.trim(),
        invoice_number: inv.invoice_number.trim(),
        amount: Number(inv.amount || 0),
        status: inv.status,
        project_id: inv.project_id || null,
      });
      setEditingInvoiceId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeInvoice = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish faturen?')) return;
    setActionLoadingId(`invoice-delete-${id}`);
    try {
      await invoiceApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ofertat dhe faturat</h2>

      <Card>
        <CardHeader><CardTitle>Ngarko oferte te gatshme (Excel/PDF)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreateQuote} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Titulli i ofertes</Label>
              <Input
                value={quoteForm.quote_title}
                onChange={(e) => setQuoteForm((s) => ({ ...s, quote_title: e.target.value }))}
                placeholder="p.sh. Oferte scaffolding Zurich Q2"
                required
              />
            </div>
            <div>
              <Label>Statusi i ofertes</Label>
              <Select value={quoteForm.status} onValueChange={(v) => setQuoteForm((s) => ({ ...s, status: v as QuoteStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {quoteStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projekti</Label>
              <Select value={quoteForm.project_id || '__none_quote__'} onValueChange={(v) => setQuoteForm((s) => ({ ...s, project_id: v === '__none_quote__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none_quote__">Pa projekt</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dokumenti</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.ods"
                onChange={(e) => setQuoteFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={isSubmittingQuote}>
                {isSubmittingQuote ? 'Duke ngarkuar...' : 'Ruaj oferten'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ofertat e regjistruara</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Filtro statusin</Label>
            <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_QUOTE_STATUSES}>Te gjitha statuset</SelectItem>
                {quoteStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {visibleQuotes.map((q) => (
            <div key={q.id} className="border rounded p-3">
              {editingQuoteId === q.id ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    value={q.quote_title ?? ''}
                    onChange={(e) => setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, quote_title: e.target.value } : x)))}
                    placeholder="Titulli i ofertes"
                  />
                  <Select
                    value={q.status || 'Draft'}
                    onValueChange={(v) => setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: v as QuoteStatus } : x)))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{quoteStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select
                    value={q.project_id || '__none_quote_edit__'}
                    onValueChange={(v) => setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, project_id: v.startsWith('__none') ? null : v } : x)))}
                  >
                    <SelectTrigger><SelectValue placeholder="Projekti" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none_quote_edit__">Pa projekt</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => saveQuoteEdit(q)} disabled={actionLoadingId === `quote-save-${q.id}`}>
                      {actionLoadingId === `quote-save-${q.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingQuoteId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{q.quote_title || 'Pa titull'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className={`gap-1 ${quoteStatusBadgeClass[q.status || 'Draft']}`}>
                        {getQuoteStatusIcon(q.status || 'Draft')}
                        {q.status || 'Draft'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Data: {q.created_at ? new Date(q.created_at).toLocaleDateString('sq-AL') : '-'}
                      </span>
                    </div>
                  </div>
                  {(q.quote_file_url || q.pdf_url) && (
                    <a
                      href={q.quote_file_url || q.pdf_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="group block w-full max-w-sm rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{getDocName(q.quote_file_path, q.quote_file_url || q.pdf_url)}</p>
                          <p className="text-xs text-muted-foreground">Dokument oferte - Kliko per ta hapur</p>
                        </div>
                      </div>
                    </a>
                  )}
                  <div className="flex gap-2">
                    <RowActionsMenu
                      disabled={actionLoadingId === `quote-delete-${q.id}`}
                      actions={[
                        { label: 'Edito', onClick: () => setEditingQuoteId(q.id) },
                        {
                          label: actionLoadingId === `quote-delete-${q.id}` ? 'Duke fshire...' : 'Fshi',
                          onClick: () => removeQuote(q.id),
                          disabled: actionLoadingId === `quote-delete-${q.id}`,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          {visibleQuotes.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka oferta per kete filter.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ngarko fature te gatshme (Excel/PDF)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreateInvoice} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Titulli i fatures</Label>
              <Input
                value={invoiceForm.invoice_title}
                onChange={(e) => setInvoiceForm((s) => ({ ...s, invoice_title: e.target.value }))}
                placeholder="p.sh. Fature mars - klienti X"
                required
              />
            </div>
            <div>
              <Label>Nr. fatures</Label>
              <Input
                value={invoiceForm.invoice_number}
                onChange={(e) => setInvoiceForm((s) => ({ ...s, invoice_number: e.target.value }))}
                placeholder="p.sh. INV-2026-0012"
                required
              />
            </div>
            <div>
              <Label>Statusi i pageses</Label>
              <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm((s) => ({ ...s, status: v as InvoiceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {invoiceStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shuma (opsionale)</Label>
              <Input
                type="number"
                step="0.01"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Projekti</Label>
              <Select value={invoiceForm.project_id || '__none_invoice__'} onValueChange={(v) => setInvoiceForm((s) => ({ ...s, project_id: v === '__none_invoice__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none_invoice__">Pa projekt</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <Label>Dokumenti</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.ods"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="md:col-span-5">
              <Button type="submit" disabled={isSubmittingInvoice}>
                {isSubmittingInvoice ? 'Duke ngarkuar...' : 'Ruaj faturen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Faturat e regjistruara</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Filtro statusin</Label>
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_INVOICE_STATUSES}>Te gjitha statuset</SelectItem>
                {invoiceStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {visibleInvoices.map((inv) => (
            <div key={inv.id} className="border rounded p-3">
              {editingInvoiceId === inv.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input
                    value={inv.invoice_title || ''}
                    onChange={(e) => setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, invoice_title: e.target.value } : x)))}
                    placeholder="Titulli i fatures"
                  />
                  <Input
                    value={inv.invoice_number}
                    onChange={(e) => setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, invoice_number: e.target.value } : x)))}
                    placeholder="Nr. fatures"
                  />
                  <Select
                    value={inv.status}
                    onValueChange={(v) => setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, status: v as InvoiceStatus } : x)))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{invoiceStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(inv.amount ?? 0)}
                    onChange={(e) => setInvoices((prev) => prev.map((x) => (x.id === inv.id ? { ...x, amount: Number(e.target.value) } : x)))}
                    placeholder="Shuma"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => saveInvoiceEdit(inv)} disabled={actionLoadingId === `invoice-save-${inv.id}`}>
                      {actionLoadingId === `invoice-save-${inv.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingInvoiceId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{inv.invoice_title || 'Pa titull'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">Nr: {inv.invoice_number}</span>
                      <Badge variant="outline" className={`gap-1 ${invoiceStatusBadgeClass[inv.status]}`}>
                        {getInvoiceStatusIcon(inv.status)}
                        {inv.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Shuma: {Number(inv.amount || 0).toFixed(2)} CHF</span>
                    </div>
                  </div>
                  {(inv.invoice_file_url || inv.pdf_url) && (
                    <a
                      href={inv.invoice_file_url || inv.pdf_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="group block w-full max-w-sm rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{getDocName(inv.invoice_file_path, inv.invoice_file_url || inv.pdf_url)}</p>
                          <p className="text-xs text-muted-foreground">Dokument fature - Kliko per ta hapur</p>
                        </div>
                      </div>
                    </a>
                  )}
                  <div className="flex gap-2">
                    <RowActionsMenu
                      disabled={actionLoadingId === `invoice-delete-${inv.id}`}
                      actions={[
                        { label: 'Edito', onClick: () => setEditingInvoiceId(inv.id) },
                        {
                          label: actionLoadingId === `invoice-delete-${inv.id}` ? 'Duke fshire...' : 'Fshi',
                          onClick: () => removeInvoice(inv.id),
                          disabled: actionLoadingId === `invoice-delete-${inv.id}`,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          {visibleInvoices.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka fatura per kete filter.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesInvoicesPage;
