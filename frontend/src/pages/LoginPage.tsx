import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { LogIn, KeyRound, Mail, AlertCircle, Sparkles } from 'lucide-react';

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
        <h1 className="text-3xl font-extrabold text-white">Welcome Back</h1>
        <p className="text-sm text-slate-400">Log in to manage your teams, projects, or evaluations.</p>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-xl space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@dogfood.local"
                className="input-field pl-9"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-9"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 font-semibold"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One-Click Demo Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 text-left transition-colors"
            >
              👑 <strong className="text-slate-200">Admin</strong>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('organizer@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 text-left transition-colors"
            >
              📋 <strong className="text-slate-200">Organizer</strong>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('judge.harsh@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 text-left transition-colors"
            >
              ⚖️ <strong className="text-slate-200">Judge (Harsh)</strong>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('judge.lenient@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 text-left transition-colors"
            >
              ✨ <strong className="text-slate-200">Judge (Lenient)</strong>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('alice@dogfood.local')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/60 text-left transition-colors col-span-2"
            >
              🚀 <strong className="text-slate-200">Participant Alice (Team Captain)</strong>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Don't have an account yet?{' '}
        <Link to="/register" className="text-violet-400 hover:underline font-semibold">
          Create account
        </Link>
      </p>
    </div>
  );
};
