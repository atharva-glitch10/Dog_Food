import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useSettings } from '../../context/SettingsContext.tsx';
import { Sparkles, Trophy, LayoutGrid, Users, CheckCircle2, LogOut, LogIn, UserPlus, Sliders, Shield, Award } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggleSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Event Status Pill */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-sm text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-150">
              DF
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                DogFood
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hackathon Platform
              </span>
            </div>
          </Link>

          {/* Live Event Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-800 dark:text-emerald-300 font-semibold">DogFood 2026</span>
            <span className="text-emerald-300 dark:text-emerald-700">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Judging Active</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
          <Link
            to="/gallery/dogfood-2026"
            className={`px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-2 ${
              isActive('/gallery/dogfood-2026')
                ? 'text-indigo-600 bg-indigo-50 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Projects</span>
          </Link>

          <Link
            to="/results/dogfood-2026"
            className={`px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-2 ${
              isActive('/results/dogfood-2026')
                ? 'text-indigo-600 bg-indigo-50 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Leaderboard</span>
          </Link>

          <Link
            to="/verify"
            className={`px-3.5 py-1.5 rounded-full transition-all duration-150 flex items-center gap-2 ${
              isActive('/verify')
                ? 'text-indigo-600 bg-indigo-50 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Verify Cert</span>
          </Link>

          <Link
            to="/api-docs"
            className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
              isActive('/api-docs')
                ? 'text-indigo-600 bg-indigo-50 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
            }`}
          >
            <span>API Docs</span>
          </Link>
        </nav>

        {/* Right User Actions & Settings */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Role specific link */}
              {user.role === 'PARTICIPANT' && (
                <Link to="/dashboard/team/dogfood-2026" className="btn-secondary !py-1.5 !px-3 text-xs">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Team Hub</span>
                </Link>
              )}

              {(user.role === 'JUDGE' || user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <Link to="/dashboard/judge/dogfood-2026" className="btn-secondary !py-1.5 !px-3 text-xs">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span>Judging Queue</span>
                </Link>
              )}

              {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <>
                  <Link to="/events/create" id="nav-create-event-btn" className="btn-secondary !py-1.5 !px-3 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Create Event</span>
                  </Link>
                  <Link to="/dashboard/organizer/dogfood-2026" className="btn-primary !py-1.5 !px-3.5 text-xs">
                    <Shield className="w-4 h-4" />
                    <span>Organizer Hub</span>
                  </Link>
                </>
              )}

              {/* User Profile Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs">
                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[120px]">{user.name}</span>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-full">
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary !py-2 !px-4 text-xs">
                <LogIn className="w-4 h-4 text-indigo-500" />
                <span>Sign In</span>
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 text-xs">
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={toggleSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Theme & Accessibility Settings"
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
