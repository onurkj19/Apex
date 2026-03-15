import supabase from '@/lib/supabase';
import type {
  Contract,
  DashboardStats,
  FinanceEntry,
  Invoice,
  InventoryItem,
  NotificationItem,
  Project,
  Quote,
  WorkLog,
  WorkerGroup,
  Worker,
} from '@/lib/erp-types';

export const authApi = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async getAdminSession() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, is_active, full_name, email')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || profile.role !== 'admin' || !profile.is_active) return null;
    return { session: sessionData.session, profile };
  },
};

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const { data, error } = await supabase.from('v_dashboard_stats').select('*').single();
    if (error) throw error;
    return data as DashboardStats;
  },

  async getProjectStatusDistribution() {
    const { data, error } = await supabase.from('projects').select('status');
    if (error) throw error;
    const counts = (data || []).reduce<Record<string, number>>((acc, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async getMonthlyFinance() {
    const { data, error } = await supabase
      .from('finances')
      .select('amount, finance_type, finance_date')
      .gte('finance_date', new Date(new Date().getFullYear(), 0, 1).toISOString());
    if (error) throw error;
    const monthly = new Map<string, { month: string; teArdhura: number; shpenzime: number }>();
    (data || []).forEach((row: any) => {
      const month = new Date(row.finance_date).toLocaleDateString('sq-AL', { month: 'short' });
      if (!monthly.has(month)) monthly.set(month, { month, teArdhura: 0, shpenzime: 0 });
      const item = monthly.get(month)!;
      if (row.finance_type === 'income') item.teArdhura += Number(row.amount || 0);
      else item.shpenzime += Number(row.amount || 0);
    });
    return Array.from(monthly.values());
  },
};

export const projectApi = {
  async list(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Project[];
  },
  async create(payload: Partial<Project> & { imageFiles?: File[] }) {
    const { imageFiles = [], ...projectPayload } = payload;
    const { data: created, error } = await supabase
      .from('projects')
      .insert(projectPayload)
      .select('id')
      .single();
    if (error) throw error;

    if (imageFiles.length > 0) {
      const imageRows: Array<{ project_id: string; image_url: string; image_path: string }> = [];
      for (const file of imageFiles) {
        const path = `projects/${created.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('erp-images').upload(path, file, {
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('erp-images').getPublicUrl(path);
        imageRows.push({
          project_id: created.id,
          image_url: publicUrl.publicUrl,
          image_path: path,
        });
      }
      const { error: imageInsertError } = await supabase.from('project_images').insert(imageRows);
      if (imageInsertError) throw imageInsertError;
    }
  },
  async updateStatus(projectId: string, status: Project['status']) {
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);
    if (error) throw error;
  },
  async update(projectId: string, payload: Partial<Project>) {
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
    if (error) throw error;
  },
  async remove(projectId: string) {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  },
  async getProfitLoss() {
    const [{ data: projects, error: projectsError }, { data: finances, error: financeError }] = await Promise.all([
      supabase.from('projects').select('id, project_name, revenue, worker_cost'),
      supabase.from('finances').select('project_id, amount, finance_type').eq('finance_type', 'expense'),
    ]);
    if (projectsError) throw projectsError;
    if (financeError) throw financeError;

    return (projects || []).map((project: any) => {
      const expense = (finances || [])
        .filter((f: any) => f.project_id === project.id)
        .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const revenue = Number(project.revenue || 0);
      const workerCost = Number(project.worker_cost || 0);
      const profitLoss = revenue - workerCost - expense;
      return {
        id: project.id,
        project_name: project.project_name,
        revenue,
        worker_cost: workerCost,
        expenses: expense,
        profit_loss: profitLoss,
      };
    });
  },
};

export const workerApi = {
  async list(): Promise<Worker[]> {
    const { data, error } = await supabase.from('workers').select('*').order('full_name', { ascending: true });
    if (error) throw error;
    return (data || []) as Worker[];
  },
  async create(payload: Partial<Worker>) {
    const { error } = await supabase.from('workers').insert(payload);
    if (error) throw error;
  },
  async update(workerId: string, payload: Partial<Worker>) {
    const { error } = await supabase.from('workers').update(payload).eq('id', workerId);
    if (error) throw error;
  },
  async remove(workerId: string) {
    const { error } = await supabase.from('workers').delete().eq('id', workerId);
    if (error) throw error;
  },
  async moveGroup(workerId: string, groupName: string) {
    const { error } = await supabase.from('workers').update({ group_name: groupName }).eq('id', workerId);
    if (error) throw error;
  },
};

export const workerGroupApi = {
  async list(activeOnly = false): Promise<WorkerGroup[]> {
    let query = supabase.from('worker_groups').select('*').order('name');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as WorkerGroup[];
  },
  async create(name: string) {
    const { error } = await supabase.from('worker_groups').insert({ name, is_active: true });
    if (error) throw error;
  },
  async setActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('worker_groups').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('worker_groups').delete().eq('id', id);
    if (error) throw error;
  },
};

export const financeApi = {
  async list(): Promise<FinanceEntry[]> {
    const { data, error } = await supabase.from('finances').select('*').order('finance_date', { ascending: false });
    if (error) throw error;
    return (data || []) as FinanceEntry[];
  },
  async create(payload: Partial<FinanceEntry>) {
    const { error } = await supabase.from('finances').insert(payload);
    if (error) throw error;

    if (payload.finance_type === 'expense' && Number(payload.amount || 0) >= 2000) {
      await notificationApi.create({
        type: 'large_expense',
        title: 'Shpenzim i madh i regjistruar',
        message: `${payload.title || 'Shpenzim'} - ${Number(payload.amount || 0).toFixed(2)} CHF`,
        metadata: payload,
      });
    }
  },
  async update(id: string, payload: Partial<FinanceEntry>) {
    const { error } = await supabase.from('finances').update(payload).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('finances').delete().eq('id', id);
    if (error) throw error;
  },
};

export const contractApi = {
  async list(): Promise<Contract[]> {
    const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Contract[];
  },
  async uploadPdf(file: File) {
    const path = `contracts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-documents').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('erp-documents').getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async create(payload: Partial<Contract>) {
    const { error } = await supabase.from('contracts').insert(payload);
    if (error) throw error;
  },
  async update(id: string, payload: Partial<Contract>) {
    const { error } = await supabase.from('contracts').update(payload).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
  },
};

export const inventoryApi = {
  async list(): Promise<InventoryItem[]> {
    const { data, error } = await supabase.from('inventory').select('*').order('category');
    if (error) throw error;
    return (data || []) as InventoryItem[];
  },
  async upsert(payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
  },
  async update(id: string, payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').update(payload).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
  },
};

export const websiteContentApi = {
  async getHomeHero() {
    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .eq('section_key', 'home_hero')
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async uploadImage(file: File) {
    const path = `hero/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('erp-images').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('erp-images').getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async saveHomeHero(payload: { title: string; subtitle: string; image_url?: string; image_path?: string; stats: Record<string, string> }) {
    const { error } = await supabase
      .from('website_content')
      .upsert({ section_key: 'home_hero', ...payload }, { onConflict: 'section_key' });
    if (error) throw error;
  },
};

export const workLogApi = {
  async list(): Promise<WorkLog[]> {
    const { data, error } = await supabase.from('work_logs').select('*').order('work_date', { ascending: false });
    if (error) throw error;
    return (data || []) as WorkLog[];
  },
  async create(payload: Partial<WorkLog>) {
    const { error } = await supabase.from('work_logs').insert(payload);
    if (error) throw error;
  },
  async createMany(payloads: Partial<WorkLog>[]) {
    if (payloads.length === 0) return;
    const { error } = await supabase.from('work_logs').insert(payloads);
    if (error) throw error;
  },
  async getPayrollByMonth() {
    const { data, error } = await supabase
      .from('work_logs')
      .select('worker_id, hours_worked, total_amount, workers(full_name), work_date')
      .gte('work_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    if (error) throw error;

    const map = new Map<string, { worker_id: string; worker_name: string; total_hours: number; total_salary: number }>();
    (data || []).forEach((row: any) => {
      const key = row.worker_id;
      if (!map.has(key)) {
        map.set(key, {
          worker_id: row.worker_id,
          worker_name: row.workers?.full_name || 'Pa emer',
          total_hours: 0,
          total_salary: 0,
        });
      }
      const item = map.get(key)!;
      item.total_hours += Number(row.hours_worked || 0);
      item.total_salary += Number(row.total_amount || 0);
    });
    return Array.from(map.values());
  },
};

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
    return data as Quote;
  },
  async update(id: string, payload: Partial<Quote>) {
    const { error } = await supabase.from('quotes').update(payload).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) throw error;
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
  },
  async remove(id: string) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
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
    return this.create({
      project_id: project.id,
      client_id: project.client_id,
      invoice_number: invoiceNumber,
      amount: Number(project.revenue || 0),
      status: 'pending',
    });
  },
};

export const notificationApi = {
  async list(): Promise<NotificationItem[]> {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as NotificationItem[];
  },
  async create(payload: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'> & { is_read?: boolean }) {
    const { error } = await supabase.from('notifications').insert({
      ...payload,
      is_read: payload.is_read ?? false,
    });
    if (error) throw error;
  },
  async markRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },
  async runChecks() {
    const today = new Date();
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);

    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('id, expires_at')
      .gte('expires_at', today.toISOString().slice(0, 10))
      .lte('expires_at', next30.toISOString().slice(0, 10));

    for (const c of expiringContracts || []) {
      await this.create({
        type: 'contract_expiring',
        title: 'Kontrate qe po skadon',
        message: `Kontrata ${c.id} skadon me ${c.expires_at}`,
        metadata: c,
      });
    }
  },
};

export const clientApi = {
  async list() {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload: { company_name: string; contact_person: string; phone?: string; email?: string }) {
    const { error } = await supabase.from('clients').insert(payload);
    if (error) throw error;
  },
};

export const equipmentApi = {
  async list() {
    const { data, error } = await supabase.from('equipment').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload: { equipment_name: string; equipment_type: string; status?: string; current_project_id?: string | null; notes?: string }) {
    const { error } = await supabase.from('equipment').insert(payload);
    if (error) throw error;
  },
};
