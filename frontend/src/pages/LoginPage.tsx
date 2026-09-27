import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { LogIn, KeyRound, Mail, AlertCircle, Users, Shield, Sparkles, UserCheck } from 'lucide-react';

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
      setError(err.message || 'Authentication error. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass = 'password123') => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 badge-signal text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Welcome Back</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Sign In to DogFood
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-sans">
          Access your evaluation queue, project submissions, or organizer tools.
        </p>
      </div>

      <div className="console-panel p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-3 shadow-soft"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Quick Logins Matrix (Unstop-inspired friendly cards) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Demo Accounts:</span>
            <span className="text-[11px]">Click to auto-fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('organizer@dogfood.local', 'Dogfood2026!')}
              className="p-2.5 bg-slate-50 hover:bg-indigo-50/70 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600/60 text-left transition-all"
            >
              <span className="text-indigo-600 dark:text-indigo-400 font-bold block text-xs">Organizer</span>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">organizer@dogfood.local</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('judge.harsh@dogfood.local', 'Dogfood2026!')}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-800/60 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600/60 text-left transition-all"
            >
              <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-xs">Judge (Active)</span>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">judge.harsh@dogfood.local</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('admin@dogfood.local', 'Dogfood2026!')}
              className="p-2.5 bg-slate-50 hover:bg-sky-50/70 dark:bg-slate-800/60 dark:hover:bg-sky-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600/60 text-left transition-all"
            >
              <span className="text-sky-600 dark:text-sky-400 font-bold block text-xs">Admin</span>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">admin@dogfood.local</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('alice@dogfood.local', 'Dogfood2026!')}
              className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-800/60 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600/60 text-left transition-all"
            >
              <span className="text-amber-600 dark:text-amber-400 font-bold block text-xs">Participant</span>
              <span className="text-[11px] text-slate-500 truncate block mt-0.5">alice@dogfood.local</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        New to the platform?{' '}
        <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
          Create an Account &rarr;
        </Link>
      </p>
    </div>
  );
};
