import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/erp-api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem('apex_admin_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberUser, setRememberUser] = useState(() => localStorage.getItem('apex_admin_remember_user') !== '0');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.login(email, password);

      if (rememberUser) {
        localStorage.setItem('apex_admin_email', email.trim());
      } else {
        localStorage.removeItem('apex_admin_email');
      }
      localStorage.setItem('apex_admin_remember_user', rememberUser ? '1' : '0');

      const admin = await authApi.getAdminSession();
      if (!admin) {
        setError('Akses i ndaluar. Vetem admin mund te hyje.');
        return;
      }
      navigate('/admin/dashboard');
    } catch {
      setError('Kredencialet nuk jane te sakta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hyrje ne sistem</CardTitle>
          <CardDescription>APEX GERUSTE MANAGEMENT SYSTEM</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Fjalekalimi</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                />
                <span>Remember user</span>
              </label>
              <span className="text-muted-foreground">Stay logged in</span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Duke u identifikuar...' : 'Hyr'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
