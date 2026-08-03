import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error || 'Inloggning misslyckades. Försök igen.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src={`${import.meta.env.BASE_URL}ReklamX_Logo.png`} alt="ReklamX" className="h-16 block" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl px-7 py-8 w-full max-w-[400px] shadow-lg flex flex-col gap-4"
      >
        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-semibold text-foreground mb-1.5"
          >
            E-post
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[13px] font-semibold text-foreground mb-1.5"
          >
            Lösenord
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-2 gap-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {loading ? 'Loggar in…' : 'Logga in'}
        </Button>

        {error && (
          <div
            role="alert"
            className="text-destructive text-[13px] font-medium text-center -mt-1"
          >
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
