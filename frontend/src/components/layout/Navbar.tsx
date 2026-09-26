import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { Terminal, Shield, Trophy, LayoutGrid, Users, CheckCircle, LogOut, LogIn, UserPlus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight gradient-text">DOGFOOD 2026</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              Self-Hostable
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-300">
          <Link to="/" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors">
            Home
          </Link>
          <Link to="/gallery/dogfood-2026" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            Project Gallery
          </Link>
          <Link to="/results/dogfood-2026" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            Rankings & Results
          </Link>
          <Link to="/verify" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Verify Certs
          </Link>
          <Link to="/api-docs" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors">
            REST API
          </Link>
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Role specific quick action button */}
              {user.role === 'PARTICIPANT' && (
                <Link to="/dashboard/team/dogfood-2026" className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  My Team & Submission
                </Link>
              )}

              {(user.role === 'JUDGE' || user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <Link to="/dashboard/judge/dogfood-2026" className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 border-purple-500/30">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Judge Portal
                </Link>
              )}

              {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <Link to="/dashboard/organizer/dogfood-2026" className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                  <Terminal className="w-3.5 h-3.5" />
                  Organizer Hub
                </Link>
              )}

              {/* User Profile Badge */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="text-[10px] text-violet-400 font-mono uppercase">{user.role}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </Link>
              <Link to="/register" className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
