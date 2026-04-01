import supabase from '@/lib/supabase';
import type { Project } from '@/lib/erp-types';
import { createAdminChangeNotification, tryCreateNotification } from '@/lib/erp/notifications';

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
