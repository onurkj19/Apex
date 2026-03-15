import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { settingsApi } from '@/lib/erp-api';

const SettingsPage = () => {
  const [state, setState] = useState({
    darkMode: true,
    monthlyEmail: 'finance@apex-geruste.ch',
    largeExpenseThreshold: '2000',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const saved = await settingsApi.get();
        setState(saved);
      } catch (error: any) {
        alert(error?.message || 'Gabim gjate ngarkimit te cilesimeve.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    const threshold = Number(state.largeExpenseThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      alert('Limiti i shpenzimit duhet te jete numer me i madh se 0.');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.save(state);
      alert('Cilesimet u ruajten me sukses.');
    } catch (error: any) {
      alert(error?.message || 'Gabim gjate ruajtjes se cilesimeve.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cilesimet e sistemit</h2>

      <Card>
        <CardHeader><CardTitle>Preferencat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar cilesimet...</p>}
          <div className="flex items-center justify-between">
            <Label>Dark mode</Label>
            <Switch
              checked={state.darkMode}
              onCheckedChange={(v) => setState((s) => ({ ...s, darkMode: v }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Email i raporteve mujore</Label>
            <Input
              value={state.monthlyEmail}
              onChange={(e) => setState((s) => ({ ...s, monthlyEmail: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Limiti i shpenzimit te madh (CHF)</Label>
            <Input
              value={state.largeExpenseThreshold}
              onChange={(e) => setState((s) => ({ ...s, largeExpenseThreshold: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? 'Duke ruajtur...' : 'Ruaj cilesimet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
