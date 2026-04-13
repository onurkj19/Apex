import type { ProjectStatus } from '@/lib/erp-types';

/** Klasa për Badge (outline + ngjyrë sipas statusit). */
export function projectStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case 'I perfunduar':
      return 'border-emerald-600/50 bg-emerald-600/15 text-emerald-800 dark:text-emerald-300';
    case 'Ne pune':
      return 'border-sky-600/50 bg-sky-600/15 text-sky-800 dark:text-sky-300';
    case 'I pranuar':
      return 'border-violet-600/50 bg-violet-600/15 text-violet-800 dark:text-violet-300';
    case 'Ne pritje':
      return 'border-amber-600/50 bg-amber-600/15 text-amber-900 dark:text-amber-200';
    case 'I refuzuar':
      return 'border-orange-600/50 bg-orange-600/15 text-orange-900 dark:text-orange-200';
    case 'I deshtuar':
      return 'border-red-600/50 bg-red-600/15 text-red-800 dark:text-red-300';
    default:
      return 'border-muted-foreground/40 bg-muted text-muted-foreground';
  }
}
