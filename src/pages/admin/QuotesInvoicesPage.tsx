import { FormEvent, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invoiceApi, projectApi, quoteApi } from '@/lib/erp-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const generateQuotePdf = (payload: any) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('APEX GERUSTE - OFERTE', 20, 20);
  doc.setFontSize(11);
  doc.text(`Projekti: ${payload.projectName}`, 20, 35);
  doc.text(`Metra katrore: ${payload.square_meters}`, 20, 45);
  doc.text(`Montimi: ${payload.assembly_price} CHF`, 20, 55);
  doc.text(`Demontimi: ${payload.disassembly_price} CHF`, 20, 65);
  doc.text(`Transporti: ${payload.transport_cost} CHF`, 20, 75);
  doc.setFontSize(13);
  doc.text(`TOTALI: ${payload.total_amount} CHF`, 20, 90);
  doc.save(`oferte-${Date.now()}.pdf`);
};

const generateInvoicePdf = (payload: any) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('APEX GERUSTE - FATURE', 20, 20);
  doc.setFontSize(11);
  doc.text(`Nr Fature: ${payload.invoice_number}`, 20, 35);
  doc.text(`Projekti: ${payload.projectName}`, 20, 45);
  doc.text(`Shuma: ${payload.amount} CHF`, 20, 55);
  doc.text(`Data: ${payload.issued_at}`, 20, 65);
  doc.save(`fature-${payload.invoice_number}.pdf`);
};

const QuotesInvoicesPage = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState({
    project_id: '',
    square_meters: '',
    assembly_price: '',
    disassembly_price: '',
    transport_cost: '',
  });

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
    const total =
      Number(form.assembly_price || 0) +
      Number(form.disassembly_price || 0) +
      Number(form.transport_cost || 0);

    const created = await quoteApi.create({
      project_id: form.project_id || null,
      square_meters: Number(form.square_meters),
      assembly_price: Number(form.assembly_price),
      disassembly_price: Number(form.disassembly_price),
      transport_cost: Number(form.transport_cost),
    });
    const project = projects.find((p) => p.id === created.project_id);
    generateQuotePdf({
      ...created,
      total_amount: total.toFixed(2),
      projectName: project?.project_name || 'Pa projekt',
    });
    setForm({ project_id: '', square_meters: '', assembly_price: '', disassembly_price: '', transport_cost: '' });
    await load();
  };

  const onGenerateInvoice = async (projectId: string) => {
    await projectApi.updateStatus(projectId, 'I perfunduar');
    const created = await invoiceApi.generateFromCompletedProject(projectId);
    if (!created) return;
    const project = projects.find((p) => p.id === projectId);
    generateInvoicePdf({
      ...created,
      projectName: project?.project_name || 'Pa projekt',
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ofertat dhe faturat</h2>

      <Card>
        <CardHeader><CardTitle>Gjenero oferte</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreateQuote} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Projekti</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm((s) => ({ ...s, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>m² Skela</Label><Input type="number" value={form.square_meters} onChange={(e) => setForm((s) => ({ ...s, square_meters: e.target.value }))} required /></div>
            <div><Label>Cmimi montimit</Label><Input type="number" value={form.assembly_price} onChange={(e) => setForm((s) => ({ ...s, assembly_price: e.target.value }))} required /></div>
            <div><Label>Cmimi demontimit</Label><Input type="number" value={form.disassembly_price} onChange={(e) => setForm((s) => ({ ...s, disassembly_price: e.target.value }))} required /></div>
            <div><Label>Transporti</Label><Input type="number" value={form.transport_cost} onChange={(e) => setForm((s) => ({ ...s, transport_cost: e.target.value }))} required /></div>
            <div className="md:col-span-5"><Button type="submit">Ruaj + shkarko PDF</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Oferte te regjistruara</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {quotes.map((q) => (
            <div key={q.id} className="border rounded p-3 flex justify-between">
              <span>Quote {q.id.slice(0, 8)} - {Number(q.total_amount).toFixed(2)} CHF</span>
              <span className="text-sm text-muted-foreground">{new Date(q.created_at).toLocaleDateString('sq-AL')}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fatura automatike</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2 mb-4">
            {projects.map((p) => (
              <div key={p.id} className="border rounded p-3 flex items-center justify-between">
                <span>{p.project_name}</span>
                <Button variant="outline" onClick={() => onGenerateInvoice(p.id)}>Perfundo + Gjenero fature</Button>
              </div>
            ))}
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className="border rounded p-3 flex justify-between">
              <span>{inv.invoice_number} - {Number(inv.amount).toFixed(2)} CHF</span>
              <span className="text-sm text-muted-foreground">{inv.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesInvoicesPage;
