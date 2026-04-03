/**
 * Referenca për faqen publike /projects (marketing).
 * NUK lidhet me panelin admin/ERP — shto, ndrysho ose hiq këtu sipas nevojës.
 *
 * Imazhet: vendos skedarë në `public/` (p.sh. `public/referenz-1.jpg`) dhe përdor
 * rrugë që fillojnë me `/`, p.sh. `images: ['/referenz-1.jpg', '/referenz-2.jpg']`.
 */
export interface MarketingProject {
  id: string;
  title: string;
  description: string;
  location: string;
  /** Data për shfaqje (ISO: YYYY-MM-DD ose string e plotë ISO) */
  completedDate: string;
  client?: string;
  category?: string;
  duration?: string;
  status?: string;
  /** URL të plota ose rrugë relative nga `public/` */
  images: string[];
  createdAt?: string;
}

export const MARKETING_PROJECTS: MarketingProject[] = [
  /*
  {
    id: 'ref-1',
    title: 'Wohnbau – Zürich',
    description: 'Kurze Beschreibung für die Website.',
    location: 'Zürich',
    completedDate: '2025-08-15',
    category: 'Wohnbau',
    status: 'Abgeschlossen',
    images: ['/apex1-about.jpg'],
    createdAt: '2025-08-15',
  },
  */
];
