/** Rolet e punës për tabelën `workers` (UI: Punëtorët + krijim user-i worker). */
export const WORKER_ROLE_OPTIONS = [
  { value: 'Monter Skele', label: 'Monter Skele', keywords: 'Montim, Demontim, Siguri' },
  { value: 'Punetor Ndihmes', label: 'Punetor Ndihmes', keywords: 'Ngarkim, Shkarkim, Asistence' },
  { value: 'Teknik Sigure', label: 'Teknik Sigure', keywords: 'Inspektim, PPE, Standarde' },
  { value: 'Shofer Transporti', label: 'Shofer Transporti', keywords: 'Logjistike, Dorzim, Mjete' },
  { value: 'Pergjegjes Ekipi', label: 'Pergjegjes Ekipi', keywords: 'Koordinim, Planifikim, Raportim' },
  { value: 'Supervisor Kantieri', label: 'Supervisor Kantieri', keywords: 'Mbikqyrje, Cilesi, Afate' },
  { value: 'Operator Makinerie', label: 'Operator Makinerie', keywords: 'Forklift, Vinç, Pajisje' },
  { value: 'Pergjegjes Magazina', label: 'Pergjegjes Magazina', keywords: 'Inventar, Evidenca, Furnizim' },
] as const;
