import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { LogIn, KeyRound, Mail, AlertCircle, Terminal, Users, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Dogfood2026!');
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Login</h1>
        <p className="text-xs text-slate-400">Authenticate to access team submissions, judging, or event management.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-lg space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Select Demo Account:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-750 text-left transition-colors font-mono"
            >
              [Admin]
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('organizer@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-750 text-left transition-colors font-mono"
            >
              [Organizer]
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('judge.harsh@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-750 text-left transition-colors font-mono"
            >
              [Judge: Strict]
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('judge.lenient@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-750 text-left transition-colors font-mono"
            >
              [Judge: Lenient]
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('alice@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-750 text-left transition-colors col-span-2 font-mono"
            >
              [Participant: Alice (Team Lead)]
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Don't have an account yet?{' '}
        <Link to="/register" className="text-blue-400 hover:underline font-semibold">
          Create account
        </Link>
      </p>
    </div>
  );
};
