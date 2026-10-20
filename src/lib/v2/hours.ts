import type { TimeEntryRow } from './api';
import type { HoursEntry, TeamWeekEntry } from './pdf/models';

export const zurichClock = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) : '';

/** Authoritative minutes: approved minutes when set, otherwise the worked minutes. */
export const entryMinutes = (e: Pick<TimeEntryRow, 'approved_minutes' | 'worked_minutes'>): number => e.approved_minutes ?? e.worked_minutes ?? 0;

export const toHoursEntry = (e: TimeEntryRow): HoursEntry => ({
  work_date: e.work_date,
  start: zurichClock(e.start_at),
  end: zurichClock(e.end_at),
  break_minutes: e.break_minutes,
  minutes: entryMinutes(e),
  worked_minutes: e.worked_minutes ?? 0,
  target: e.subcontract_assignments?.assignment_number ?? e.projects?.project_name ?? '',
  worksite: e.worksite,
  status: e.status,
  is_saturday: e.is_saturday ?? undefined,
});

export const toTeamWeekEntry = (e: TimeEntryRow): TeamWeekEntry => ({
  worker: e.workers?.full_name ?? '',
  work_date: e.work_date,
  minutes: entryMinutes(e),
  status: e.status,
});
