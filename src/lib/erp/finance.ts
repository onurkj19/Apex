import supabase from '@/lib/supabase';
import type { FinanceEntry } from '@/lib/erp-types';
import { canDeleteFinance } from '@/lib/permissions';
import { createAdminChangeNotification, tryCreateNotification } from '@/lib/erp/notifications';
import { getCurrentRole } from '@/lib/erp/session';
import { settingsApi } from '@/lib/erp/settings';

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
