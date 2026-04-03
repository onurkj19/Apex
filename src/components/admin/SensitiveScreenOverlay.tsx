import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  isSensitivePath,
  isSensitiveUnlocked,
  lockSensitiveScreen,
  sensitiveScreenEnabled,
  tryUnlockSensitive,
} from '@/lib/sensitive-screen';
import { Eye, EyeOff, Shield } from 'lucide-react';

/** Mbulesë blur për përmbajtjen e Dashboard / Financat derisa të futet PIN-i (session ~30 min). */
export function SensitiveScreenOverlay({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [unlocked, setUnlocked] = useState(() => isSensitiveUnlocked());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const active = sensitiveScreenEnabled() && isSensitivePath(location.pathname);
  const locked = active && !unlocked;

  useEffect(() => {
    setUnlocked(isSensitiveUnlocked());
    setPin('');
    setError('');
  }, [location.pathname]);

  const onUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (tryUnlockSensitive(pin)) {
      setUnlocked(true);
      setPin('');
    } else {
      setError('PIN i pasaktë.');
    }
  };

  const onLock = () => {
    lockSensitiveScreen();
    setUnlocked(false);
    setPin('');
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[40vh] w-full">
      {active && !locked && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <span className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 shrink-0" />
            <span className="min-w-0">Moduli i ndjeshëm është i hapur (rreth 30 min). Mbylle kur të largohesh.</span>
          </span>
          <Button type="button" size="sm" variant="outline" className="border-amber-500/50 shrink-0" onClick={onLock}>
            Mbyll & blur sërish
          </Button>
        </div>
      )}

      {locked && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-xl bg-background/85 backdrop-blur-2xl border border-border/80 shadow-2xl min-h-[min(70vh,480px)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sensitive-screen-title"
        >
          <Card className="w-full max-w-md border-primary/30 shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle id="sensitive-screen-title">Hapësirë e mbrojtur</CardTitle>
              <CardDescription>
                Për privatësi, përmbajtja është e fshehur. Fut PIN-in e konfiguruar në server (ose përdor fjalëkalimin e
                ruajtur në Keychain / Face ID për të plotësuar fushën).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sensitive-pin">PIN / fjalëkalim</Label>
                  <div className="relative">
                    <Input
                      id="sensitive-pin"
                      type={showPin ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="h-12 pr-12 rounded-lg"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPin((s) => !s)}
                      aria-label={showPin ? 'Fsheh fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <Button type="submit" className="w-full h-12 rounded-lg text-base font-semibold">
                  Hap pamjen
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div
        className={
          locked
            ? 'blur-[32px] pointer-events-none select-none opacity-[0.08] saturate-0 min-h-[50vh]'
            : ''
        }
        aria-hidden={locked}
      >
        {children}
      </div>
    </div>
  );
}
