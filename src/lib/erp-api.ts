import supabase from '@/lib/supabase';
import type {
  AuditLogItem,
  Contract,
  DashboardStats,
  FinanceEntry,
  Invoice,
  InventoryItem,
  LeaveRequest,
  NotificationItem,
  AppRole,
  Project,
  Quote,
  TeamPlanItem,
  WorkLog,
  WorkerGroup,
  Worker,
  SystemSettings,
} from '@/lib/erp-types';
import { canDeleteFinance } from '@/lib/permissions';

type NotificationCreatePayload = Omit<NotificationItem, 'id' | 'created_at' | 'is_read' | 'is_archived'> & {
  is_read?: boolean;
  is_archived?: boolean;
};

const getCurrentAdminMeta = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile) return null;

  return {
    actor_admin_id: profile.id,
    actor_admin_name: profile.full_name,
    actor_admin_email: profile.email,
    action_at: new Date().toISOString(),
  };
};

const getCurrentRole = async (): Promise<AppRole | null> => {
  const session = await authApi.getAdminSession();
  return (session?.profile?.role as AppRole | undefined) || null;
};

const getCurrentUser = async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  return userData.user;
};

const tryCreateNotification = async (payload: NotificationCreatePayload) => {
  try {
    const actorMeta = await getCurrentAdminMeta();
    await notificationApi.create({
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        ...(actorMeta || {}),
      },
    });
  } catch (error) {
    // Notifications should not block main business actions.
    console.error('Failed to create notification', error);
  }
};

const createAdminChangeNotification = async (
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
) => {
  await tryCreateNotification({
    type: 'admin_change',
    title,
    message,
    metadata,
  });
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  darkMode: true,
  monthlyEmail: 'finance@apex-geruste.ch',
  largeExpenseThreshold: '2000',
};

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
      .select('id, role, is_active, full_name, email, is_online, last_seen_at')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.is_active) return null;
    return { session: sessionData.session, profile };
  },
  async setPresence(isOnline: boolean) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const { error } = await supabase
      .from('users')
      .update({
        is_online: isOnline,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', userData.user.id);
    if (error) throw error;
  },
  async listAdminPresence() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, is_online, last_seen_at')
      .in('role', ['admin', 'super_admin', 'finance', 'project_manager', 'viewer'])
      .order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async updateUserRole(userId: string, role: AppRole) {
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (targetError) throw targetError;
    if (targetUser.role === 'super_admin') {
      throw new Error('Super admini eshte i mbrojtur dhe nuk mund te ndryshohet.');
    }

    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) throw error;
    await createAdminChangeNotification('Roli i perdoruesit u ndryshua', `Perdoruesi ${userId} u caktua si ${role}`, {
      user_id: userId,
      role,
    });
  },
  async listAppUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, is_online, last_seen_at, worker_id')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createAppUser(payload: {
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
    worker_id?: string | null;
  }) {
    const { data, error } = await supabase.functions.invoke('create-app-user', { body: payload });
    if (error) throw error;
    return data;
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
  async getTrendAlarms() {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [{ data: financeRows, error: financeError }, { data: projectRows, error: projectError }] = await Promise.all([
      supabase
        .from('finances')
        .select('amount, finance_type, finance_date')
        .gte('finance_date', previousStart.toISOString().slice(0, 10)),
      supabase.from('projects').select('status, progress'),
    ]);

    if (financeError) throw financeError;
    if (projectError) throw projectError;

    const rows = financeRows || [];
    const sumRange = (from: Date, to: Date, type: 'income' | 'expense') =>
      rows
        .filter((x: any) => {
          const d = new Date(x.finance_date);
          return x.finance_type === type && d >= from && d <= to;
        })
        .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);

    const currentIncome = sumRange(currentStart, now, 'income');
    const currentExpense = sumRange(currentStart, now, 'expense');
    const prevIncome = sumRange(previousStart, previousEnd, 'income');
    const prevExpense = sumRange(previousStart, previousEnd, 'expense');

    const currentMargin = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;
    const prevMargin = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0;
    const marginDrop = prevMargin - currentMargin;
    const expenseSpikePct = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;

    const activeProjects = (projectRows || []).filter((p: any) => p.status === 'Ne pune').length;
    const stalledProjects = (projectRows || []).filter((p: any) => p.status === 'Ne pune' && Number(p.progress || 0) < 20).length;

    const alarms: Array<{ type: string; severity: 'low' | 'medium' | 'high'; message: string; value: number }> = [];
    if (marginDrop > 8) alarms.push({ type: 'margin_drop', severity: 'high', message: 'Profit margin ka renie te ndjeshme', value: marginDrop });
    if (expenseSpikePct > 20) alarms.push({ type: 'expense_spike', severity: 'high', message: 'Shpenzimet mujore jane rritur ndjeshem', value: expenseSpikePct });
    if (stalledProjects >= 3) alarms.push({ type: 'project_stall', severity: 'medium', message: 'Ka disa projekte aktive me progres te ulet', value: stalledProjects });

    return {
      metrics: {
        currentMargin,
        prevMargin,
        marginDrop,
        currentExpense,
        prevExpense,
        expenseSpikePct,
        activeProjects,
        stalledProjects,
      },
      alarms,
    };
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
      .select('id, project_name, location, client_id, status, revenue')
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

    await tryCreateNotification({
      type: 'project_created',
      title: 'Projekt i ri u shtua',
      message: `${created.project_name || 'Projekt'} - ${created.location || 'Pa lokacion'}`,
      metadata: {
        project_id: created.id,
        project_name: created.project_name,
        location: created.location,
        client_id: created.client_id,
        status: created.status,
        revenue: created.revenue,
      },
    });
  },
  async updateStatus(projectId: string, status: Project['status']) {
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Status projekti u ndryshua',
      `Projekti ${projectId} u kalua ne statusin "${status}"`,
      { project_id: projectId, status }
    );
  },
  async update(projectId: string, payload: Partial<Project>) {
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Projekti u editua',
      `${payload.project_name || `Projekti ${projectId}`} u perditesua`,
      { project_id: projectId, changes: payload }
    );
  },
  async remove(projectId: string) {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Projekti u fshi',
      `Projekti me ID ${projectId} u fshi nga paneli`,
      { project_id: projectId }
    );
  },
  async getProfitLoss() {
    const [
      { data: projects, error: projectsError },
      { data: finances, error: financeError },
      { data: workLogs, error: workLogsError },
    ] = await Promise.all([
      supabase.from('projects').select('id, project_name, revenue, worker_cost'),
      supabase.from('finances').select('project_id, amount, finance_type').eq('finance_type', 'expense'),
      supabase.from('work_logs').select('project_id, hours_worked, total_amount'),
    ]);
    if (projectsError) throw projectsError;
    if (financeError) throw financeError;
    if (workLogsError) throw workLogsError;

    const workByProject = (workLogs || []).reduce<
      Record<string, { hours: number; amount: number }>
    >((acc, row: any) => {
      if (!row.project_id) return acc;
      if (!acc[row.project_id]) acc[row.project_id] = { hours: 0, amount: 0 };
      acc[row.project_id].hours += Number(row.hours_worked || 0);
      acc[row.project_id].amount += Number(row.total_amount || 0);
      return acc;
    }, {});

    return (projects || []).map((project: any) => {
      const expense = (finances || [])
        .filter((f: any) => f.project_id === project.id)
        .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

      const workTotals = workByProject[project.id] || { hours: 0, amount: 0 };
      const revenue = Number(project.revenue || 0);
      const workerCostFromLogs = Number(workTotals.amount || 0);
      const manualWorkerCost = Number(project.worker_cost || 0);
      const workerCost = workerCostFromLogs > 0 ? workerCostFromLogs : manualWorkerCost;
      const profitLoss = revenue - workerCost - expense;
      return {
        id: project.id,
        project_name: project.project_name,
        revenue,
        worker_cost: workerCost,
        worker_hours: Number(workTotals.hours || 0),
        worker_cost_logs: workerCostFromLogs,
        worker_cost_manual: manualWorkerCost,
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
    await createAdminChangeNotification(
      'Punetor i ri u shtua',
      `${payload.full_name || 'Punetor'} u shtua me sukses`,
      { worker: payload }
    );
  },
  async update(workerId: string, payload: Partial<Worker>) {
    const { error } = await supabase.from('workers').update(payload).eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori u editua',
      `${payload.full_name || `Punetori ${workerId}`} u perditesua`,
      { worker_id: workerId, changes: payload }
    );
  },
  async remove(workerId: string) {
    const { error } = await supabase.from('workers').delete().eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori u fshi',
      `Punetori me ID ${workerId} u fshi`,
      { worker_id: workerId }
    );
  },
  async moveGroup(workerId: string, groupName: string) {
    const { error } = await supabase.from('workers').update({ group_name: groupName }).eq('id', workerId);
    if (error) throw error;
    await createAdminChangeNotification(
      'Punetori ndryshoi grup',
      `Punetori ${workerId} u kalua ne grupin ${groupName}`,
      { worker_id: workerId, group_name: groupName }
    );
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
    await createAdminChangeNotification('Grup i ri u shtua', `Grupi "${name}" u krijua`, { group_name: name });
  },
  async setActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('worker_groups').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Statusi i grupit u ndryshua',
      `Grupi ${id} u ${isActive ? 'aktivizua' : 'caktivizua'}`,
      { group_id: id, is_active: isActive }
    );
  },
  async remove(id: string) {
    const { error } = await supabase.from('worker_groups').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Grupi u fshi', `Grupi me ID ${id} u fshi`, { group_id: id });
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

    const amount = Number(payload.amount || 0).toFixed(2);
    const settings = await settingsApi.get();
    const largeExpenseThreshold = Number(settings.largeExpenseThreshold || '2000');

    if (payload.finance_type === 'income') {
      await tryCreateNotification({
        type: 'finance_income_created',
        title: 'Hyrje e re financiare',
        message: `${payload.title || 'Hyrje'} - ${amount} CHF`,
        metadata: payload,
      });
      return;
    }

    if (payload.finance_type === 'expense') {
      await tryCreateNotification({
        type: 'finance_expense_created',
        title: 'Shpenzim i ri financiar',
        message: `${payload.title || 'Shpenzim'} - ${amount} CHF`,
        metadata: payload,
      });

      if (Number(payload.amount || 0) >= largeExpenseThreshold) {
        await tryCreateNotification({
          type: 'large_expense',
          title: 'Shpenzim i madh i regjistruar',
          message: `${payload.title || 'Shpenzim'} - ${amount} CHF`,
          metadata: {
            ...payload,
            threshold: largeExpenseThreshold,
          },
        });
      }
    }
  },
  async update(id: string, payload: Partial<FinanceEntry>) {
    const { error } = await supabase.from('finances').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Transaksioni financiar u editua',
      `${payload.title || `Transaksioni ${id}`} u perditesua`,
      { finance_id: id, changes: payload }
    );
  },
  async remove(id: string) {
    const role = await getCurrentRole();
    if (!canDeleteFinance(role)) {
      throw new Error('Nuk ke leje per te fshire transaksione financiare.');
    }
    const { error } = await supabase.from('finances').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Transaksioni financiar u fshi',
      `Transaksioni me ID ${id} u fshi`,
      { finance_id: id }
    );
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
    await createAdminChangeNotification(
      'Kontrate e re u shtua',
      `${payload.contract_title || 'Kontrate'} u regjistrua`,
      { contract: payload }
    );
  },
  async update(id: string, payload: Partial<Contract>) {
    const { error } = await supabase.from('contracts').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification(
      'Kontrata u editua',
      `${payload.contract_title || `Kontrata ${id}`} u perditesua`,
      { contract_id: id, changes: payload }
    );
  },
  async remove(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Kontrata u fshi', `Kontrata me ID ${id} u fshi`, { contract_id: id });
  },
};

export const inventoryApi = {
  async list(): Promise<InventoryItem[]> {
    const { data, error } = await supabase.from('inventory').select('*').order('category');
    if (error) throw error;
    return (data || []) as InventoryItem[];
  },
  async addStock(payload: { category: InventoryItem['category']; item_name: string; quantity: number }) {
    const itemName = payload.item_name.trim();
    if (!itemName) throw new Error('Item name is required');
    if (payload.quantity <= 0) throw new Error('Quantity must be greater than zero');

    const { data: existingRows, error: findError } = await supabase
      .from('inventory')
      .select('id, total_quantity, used_quantity')
      .eq('category', payload.category)
      .eq('item_name', itemName)
      .limit(1);
    if (findError) throw findError;

    const existing = (existingRows || [])[0];
    if (existing) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ total_quantity: Number(existing.total_quantity || 0) + payload.quantity })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      await createAdminChangeNotification(
        'Inventari u perditesua',
        `U shtua +${payload.quantity} te "${itemName}"`,
        { category: payload.category, item_name: itemName, quantity: payload.quantity }
      );
      return;
    }

    const { error: insertError } = await supabase.from('inventory').insert({
      category: payload.category,
      item_name: itemName,
      total_quantity: payload.quantity,
      used_quantity: 0,
    });
    if (insertError) throw insertError;
    await createAdminChangeNotification(
      'Artikull i ri ne inventar',
      `"${itemName}" u shtua me sasi ${payload.quantity}`,
      { category: payload.category, item_name: itemName, quantity: payload.quantity }
    );
  },
  async upsert(payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
    await createAdminChangeNotification('Inventari u perditesua', 'Ndryshim/upsert ne inventar u krye', { changes: payload });
  },
  async update(id: string, payload: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Inventari u editua', `Artikulli ${id} u perditesua`, { inventory_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Artikulli i inventarit u fshi', `Artikulli ${id} u fshi`, { inventory_id: id });
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
    await createAdminChangeNotification('Permbajtja e web u perditesua', 'Seksioni home_hero u perditesua', { section_key: 'home_hero' });
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
    await createAdminChangeNotification(
      'Ore pune u regjistruan',
      `U regjistrua evidence pune per projektin ${payload.project_id || '-'}`,
      { work_log: payload }
    );
  },
  async createMany(payloads: Partial<WorkLog>[]) {
    if (payloads.length === 0) return;
    const { error } = await supabase.from('work_logs').insert(payloads);
    if (error) throw error;
    const totalHours = payloads.reduce((sum, row) => sum + Number(row.hours_worked || 0), 0);
    await createAdminChangeNotification(
      'Ore pune u regjistruan',
      `U ruajten ${payloads.length} evidenca pune (${totalHours.toFixed(2)} ore totale)`,
      { count: payloads.length, total_hours: totalHours, project_id: payloads[0]?.project_id || null }
    );
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
  async list(includeArchived = false): Promise<NotificationItem[]> {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (!includeArchived) query = query.eq('is_archived', false);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationItem[];
  },
  async create(payload: NotificationCreatePayload) {
    const hasActor = Boolean(
      (payload.metadata as Record<string, unknown> | undefined)?.actor_admin_id ||
      (payload.metadata as Record<string, unknown> | undefined)?.actor_admin_name
    );
    const actorMeta = hasActor ? null : await getCurrentAdminMeta();

    const { error } = await supabase.from('notifications').insert({
      ...payload,
      is_read: payload.is_read ?? false,
      is_archived: payload.is_archived ?? false,
      metadata: {
        ...(payload.metadata || {}),
        ...(actorMeta || {}),
      },
    });
    if (error) throw error;
  },
  async unreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_archived', false);
    if (error) throw error;
    return count || 0;
  },
  async markRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },
  async archive(id: string) {
    const { error } = await supabase.from('notifications').update({ is_archived: true }).eq('id', id);
    if (error) throw error;
  },
  async unarchive(id: string) {
    const { error } = await supabase.from('notifications').update({ is_archived: false }).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
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

export const auditApi = {
  async list(filters?: { tableName?: string; operation?: string; userId?: string; search?: string; from?: string; to?: string }) {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (filters?.tableName) query = query.eq('table_name', filters.tableName);
    if (filters?.operation) query = query.eq('operation', filters.operation);
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.from) query = query.gte('created_at', filters.from);
    if (filters?.to) query = query.lte('created_at', filters.to);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as AuditLogItem[];
    if (!filters?.search) return rows;

    const q = filters.search.toLowerCase();
    return rows.filter((row) =>
      [row.table_name, row.operation, row.record_id || '', JSON.stringify(row.old_data || {}), JSON.stringify(row.new_data || {})]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  },
};

export const teamPlanApi = {
  async list(): Promise<TeamPlanItem[]> {
    const { data, error } = await supabase.from('team_plans').select('*').order('plan_date', { ascending: true });
    if (error) throw error;
    return (data || []) as TeamPlanItem[];
  },
  async create(payload: Partial<TeamPlanItem>) {
    const { error } = await supabase.from('team_plans').insert(payload);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u shtua', `${payload.title || 'Plan'} u krijua`, { team_plan: payload });
  },
  async update(id: string, payload: Partial<TeamPlanItem>) {
    const { error } = await supabase.from('team_plans').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u perditesua', `${payload.title || `Plan ${id}`} u perditesua`, { team_plan_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('team_plans').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Plan i ekipit u fshi', `Plani ${id} u fshi`, { team_plan_id: id });
  },
};

export const workerPortalApi = {
  async getAssignedPlans(): Promise<TeamPlanItem[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('worker_id')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.worker_id) return [];

    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 14);
    const to = new Date(today);
    to.setDate(today.getDate() + 60);

    const { data, error } = await supabase
      .from('team_plans')
      .select('*')
      .contains('worker_ids', [profile.worker_id])
      .gte('plan_date', from.toISOString().slice(0, 10))
      .lte('plan_date', to.toISOString().slice(0, 10))
      .order('plan_date', { ascending: true });
    if (error) throw error;
    return (data || []) as TeamPlanItem[];
  },
};

export const leaveRequestApi = {
  async listMine(): Promise<LeaveRequest[]> {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('worker_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LeaveRequest[];
  },
  async createMine(payload: {
    request_type: LeaveRequest['request_type'];
    requested_start_date: string;
    requested_end_date: string;
    worker_comment?: string | null;
  }) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Nuk je i kycur.');

    const { data: profile } = await supabase.from('users').select('worker_id').eq('id', user.id).maybeSingle();
    const { error } = await supabase.from('leave_requests').insert({
      worker_user_id: user.id,
      worker_id: profile?.worker_id || null,
      request_type: payload.request_type,
      requested_start_date: payload.requested_start_date,
      requested_end_date: payload.requested_end_date,
      worker_comment: payload.worker_comment || null,
      status: 'pending',
    });
    if (error) throw error;
  },
  async respondToCounter(id: string, payload: { accept: boolean; new_start_date?: string; new_end_date?: string; worker_comment?: string }) {
    if (payload.accept) {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          worker_comment: payload.worker_comment || null,
        })
        .eq('id', id);
      if (error) throw error;
      return;
    }

    if (!payload.new_start_date || !payload.new_end_date) {
      throw new Error('Duhet te vendosesh datat e reja per kunderoferte.');
    }
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'worker_countered',
        requested_start_date: payload.new_start_date,
        requested_end_date: payload.new_end_date,
        worker_comment: payload.worker_comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
  async listAll(): Promise<LeaveRequest[]> {
    const { data, error } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as LeaveRequest[];
  },
  async adminDecision(
    id: string,
    payload:
      | { type: 'approve'; admin_comment?: string }
      | { type: 'reject'; admin_comment?: string }
      | { type: 'counter_offer'; counter_start_date: string; counter_end_date: string; admin_comment?: string }
  ) {
    const role = await getCurrentRole();
    if (role !== 'super_admin') {
      throw new Error('Vetem super admin mund te menaxhoje pushimet.');
    }

    if (payload.type === 'approve') {
      const { error } = await supabase.from('leave_requests').update({ status: 'approved', admin_comment: payload.admin_comment || null }).eq('id', id);
      if (error) throw error;
      return;
    }
    if (payload.type === 'reject') {
      const { error } = await supabase.from('leave_requests').update({ status: 'rejected', admin_comment: payload.admin_comment || null }).eq('id', id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'counter_offered',
        admin_counter_start_date: payload.counter_start_date,
        admin_counter_end_date: payload.counter_end_date,
        admin_comment: payload.admin_comment || null,
      })
      .eq('id', id);
    if (error) throw error;
  },
};

export const clientApi = {
  async list() {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload: { company_name: string; client_address: string; phone?: string; email?: string }) {
    const clientPayload = {
      company_name: payload.company_name,
      client_address: payload.client_address,
      phone: payload.phone,
      email: payload.email,
    };

    const { data, error } = await supabase.from('clients').insert(clientPayload).select('id, company_name, client_address').single();
    if (error) throw error;

    await tryCreateNotification({
      type: 'client_created',
      title: 'Klient i ri u shtua',
      message: `${data.company_name} - Adresa: ${data.client_address || 'Pa adrese'}`,
      metadata: {
        client_id: data.id,
        company_name: payload.company_name,
        client_address: payload.client_address,
        phone: payload.phone,
        email: payload.email,
      },
    });
  },
  async update(id: string, payload: { company_name: string; client_address: string; phone?: string; email?: string }) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Klienti u editua', `${payload.company_name} u perditesua`, { client_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Klienti u fshi', `Klienti me ID ${id} u fshi`, { client_id: id });
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
    await createAdminChangeNotification('Pajisje e re u shtua', `${payload.equipment_name} u shtua`, { equipment: payload });
  },
  async update(id: string, payload: { equipment_name: string; equipment_type: string; status?: string; notes?: string }) {
    const { error } = await supabase.from('equipment').update(payload).eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Pajisja u editua', `${payload.equipment_name || `Pajisja ${id}`} u perditesua`, { equipment_id: id, changes: payload });
  },
  async remove(id: string) {
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) throw error;
    await createAdminChangeNotification('Pajisja u fshi', `Pajisja me ID ${id} u fshi`, { equipment_id: id });
  },
};

export const settingsApi = {
  async get(): Promise<SystemSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'system')
      .maybeSingle();
    if (error) throw error;

    if (!data?.setting_value) return DEFAULT_SYSTEM_SETTINGS;

    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...(data.setting_value as Partial<SystemSettings>),
    };
  },
  async save(payload: SystemSettings) {
    const { error } = await supabase.from('app_settings').upsert(
      {
        setting_key: 'system',
        setting_value: payload,
      },
      { onConflict: 'setting_key' }
    );
    if (error) throw error;
    await createAdminChangeNotification('Cilesimet u perditesuan', 'Ndryshime ne cilesimet e sistemit u ruajten', { settings: payload });
    return payload;
  },
};
