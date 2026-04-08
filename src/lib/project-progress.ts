import type { Project } from '@/lib/erp-types';

/**
 * Përqindja e shfaqur në panel lidhet me statusin — nuk ka fushë të veçantë për përditësim manual.
 * `I perfunduar` → 100% që të përputhet me pritjen kur projekti është i mbyllur.
 */
export function progressForProjectStatus(status: Project['status']): number {
  switch (status) {
    case 'I perfunduar':
      return 100;
    case 'Ne pune':
      return 50;
    case 'I pranuar':
      return 40;
    case 'Ne pritje':
      return 10;
    case 'I refuzuar':
    case 'I deshtuar':
      return 0;
    default:
      return 0;
  }
}
