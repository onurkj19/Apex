import supabase from '@/lib/supabase';
import type { FinanceEntry } from '@/lib/erp-types';
import { canDeleteFinance } from '@/lib/permissions';
import { createAdminChangeNotification, tryCreateNotification } from '@/lib/erp/notifications';
import { getCurrentRole } from '@/lib/erp/session';
import { settingsApi } from '@/lib/erp/settings';

/** Hyrje e vetme për projekt nga faqja Projektet (përditësohet kur rishkruhet shuma). */
export const PROJECT_PANEL_INCOME_TITLE = 'Pagesë nga paneli Projektet';

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

  /**
   * Ruan ose përditëson shumën e pagesës së raportuar për projektin (një rresht në `finances`).
   * Shuma totale e marrë mbetet shuma e të gjitha hyrjeve për këtë projekt (p.sh. hyrje të tjera nga Financat).
   */
  async upsertProjectPanelIncome(projectId: string, amount: number): Promise<void> {
    const rounded = Math.round(Math.max(0, amount) * 100) / 100;
    const { data: rows, error: selErr } = await supabase
      .from('finances')
      .select('id')
      .eq('project_id', projectId)
      .eq('finance_type', 'income')
      .eq('title', PROJECT_PANEL_INCOME_TITLE)
      .limit(1);
    if (selErr) throw selErr;
    const existingId = (rows?.[0] as { id?: string } | undefined)?.id;

    if (rounded === 0) {
      if (existingId) {
        const { error } = await supabase.from('finances').delete().eq('id', existingId);
        if (error) throw error;
        await createAdminChangeNotification(
          'Pagesa nga projekti u hoq',
          'Hyrja e panelit të projektit u fshi (shuma 0).',
          { project_id: projectId, finance_id: existingId }
        );
      }
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (existingId) {
      await financeApi.update(existingId, { amount: rounded });
      return;
    }

    await financeApi.create({
      project_id: projectId,
      title: PROJECT_PANEL_INCOME_TITLE,
      amount: rounded,
      finance_type: 'income',
      category: null,
      payment_method: 'Bank',
      finance_date: today,
    });
  },
};
