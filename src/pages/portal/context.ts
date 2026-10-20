import { useOutletContext } from 'react-router-dom';

export interface PortalProfile {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  worker_id: string | null;
}

export const usePortal = () => useOutletContext<{ profile: PortalProfile }>();
