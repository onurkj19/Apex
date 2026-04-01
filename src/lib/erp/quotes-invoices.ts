import supabase from '@/lib/supabase';
import type { Invoice, Quote } from '@/lib/erp-types';
import { createAdminChangeNotification } from '@/lib/erp/notifications';

export const quoteApi = {
  async list(): Promise<Quote[]> {
    const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Quote[];
  },
  async uploadDocument(file: File) {
    const path = `quotes/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-documents').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('erp-documents').getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async create(payload: Partial<Quote>) {
    const { data, error } = await supabase.from('quotes').insert(payload).select('*').single();
    if (error) throw error;
    await createAdminChangeNotification('Oferte e re u shtua', `${payload.quote_title || 'Oferte'} u ruajt`, { quote: payload });
    return data as Quote;
  },
  async update(id: string, payload: Partial<Quote>) {
    const { error } = await supabase.from('quotes').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Oferta u editua', `${payload.quote_title || `Oferta ${id}`} u perditesua`, { quote_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Oferta u fshi', `Oferta me ID ${id} u fshi`, { quote_id: id });
  },
};

export const invoiceApi = {
  async list(): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Invoice[];
  },
  async create(payload: Partial<Invoice>) {
    const { data, error } = await supabase.from('invoices').insert(payload).select('*').single();
    if (error) throw error;
    await createAdminChangeNotification('Fature e re u shtua', `${payload.invoice_title || payload.invoice_number || 'Fature'} u ruajt`, { invoice: payload });
    return data as Invoice;
  },
  async uploadDocument(file: File) {
    const path = `invoices/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-documents').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('erp-documents').getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async update(id: string, payload: Partial<Invoice>) {
    const { error } = await supabase.from('invoices').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Fatura u editua', `${payload.invoice_title || payload.invoice_number || `Fatura ${id}`} u perditesua`, { invoice_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Fatura u fshi', `Fatura me ID ${id} u fshi`, { invoice_id: id });
  },
  async generateFromCompletedProject(projectId: string) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, project_name, revenue, client_id, status')
      .eq('id', projectId)
      .single();
    if (projectError) throw projectError;
    if (project.status !== 'I perfunduar') return null;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    return invoiceApi.create({
      project_id: project.id,
      client_id: project.client_id,
      invoice_number: invoiceNumber,
      amount: Number(project.revenue || 0),
      status: 'pending',
    });
  },
};
