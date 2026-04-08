import type { NotificationItem } from '@/lib/erp-types';

/** Data që përdoret për kalendar: `action_at` nga metadata nëse ekziston, përndryshe `created_at`. */
export function getNotificationActivityDate(item: NotificationItem): Date {
  const metadata = (item.metadata || {}) as Record<string, unknown>;
  const actionAtRaw = String(metadata.action_at || '');
  const actionAt = actionAtRaw ? new Date(actionAtRaw) : null;
  const createdAt = new Date(item.created_at);
  return actionAt && !Number.isNaN(actionAt.getTime()) ? actionAt : createdAt;
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
