/** Pamje e mbrojtur për Dashboard / Financat (PIN në `.env`: `VITE_SENSITIVE_SCREEN_PIN`). */
const STORAGE_KEY = 'apex_sensitive_unlock_until';
const SESSION_MS = 30 * 60 * 1000;

export function sensitiveScreenEnabled(): boolean {
  const pin = import.meta.env.VITE_SENSITIVE_SCREEN_PIN?.trim();
  return Boolean(pin && pin.length >= 4);
}

export function isSensitivePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/admin/dashboard' || p === '/admin/finances';
}

export function isSensitiveUnlocked(): boolean {
  if (!sensitiveScreenEnabled()) return true;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || Date.now() > until) {
    sessionStorage.removeItem(STORAGE_KEY);
    return false;
  }
  return true;
}

export function tryUnlockSensitive(pin: string): boolean {
  const expected = import.meta.env.VITE_SENSITIVE_SCREEN_PIN?.trim() ?? '';
  if (!expected || pin.trim() !== expected) return false;
  sessionStorage.setItem(STORAGE_KEY, String(Date.now() + SESSION_MS));
  return true;
}

export function lockSensitiveScreen(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
