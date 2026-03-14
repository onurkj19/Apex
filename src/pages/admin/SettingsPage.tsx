import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const SettingsPage = () => {
  const [state, setState] = useState({
    darkMode: true,
    monthlyEmail: 'finance@apex-geruste.ch',
    largeExpenseThreshold: '2000',
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cilesimet e sistemit</h2>

      <Card>
        <CardHeader><CardTitle>Preferencat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dark mode</Label>
            <Switch checked={state.darkMode} onCheckedChange={(v) => setState((s) => ({ ...s, darkMode: v }))} />
          </div>
          <div className="space-y-2">
            <Label>Email i raporteve mujore</Label>
            <Input value={state.monthlyEmail} onChange={(e) => setState((s) => ({ ...s, monthlyEmail: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Limiti i shpenzimit te madh (CHF)</Label>
            <Input value={state.largeExpenseThreshold} onChange={(e) => setState((s) => ({ ...s, largeExpenseThreshold: e.target.value }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
