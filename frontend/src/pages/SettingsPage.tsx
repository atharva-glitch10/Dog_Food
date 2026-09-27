import React from 'react';
import { useSettings, ThemeMode, FontSize, Density } from '../context/SettingsContext.tsx';
import { Sliders, Moon, Sun, Type, LayoutTemplate, ZapOff, Check, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
  } = useSettings();

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="badge-signal">
          Display Preferences
        </span>
      </div>

      <div className="console-panel p-6 sm:p-8 space-y-8">
        <div className="flex items-center gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-center">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Settings & Accessibility
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Preferences are automatically saved in your browser and apply across all views.
            </p>
          </div>
        </div>

        {/* 1. Theme Mode */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Interface Theme</span>
            </label>
            <span className="badge-signal text-[11px] capitalize">{theme} mode</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all ${
                theme === 'light'
                  ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Clean Daylight</div>
                  <div className="text-xs text-slate-500 font-normal mt-0.5">Unstop-inspired warm light theme</div>
                </div>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-950/40 border-indigo-400 text-indigo-200 font-bold ring-2 ring-indigo-500/30 shadow-xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <Moon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Soft Slate</div>
                  <div className="text-xs text-slate-500 font-normal mt-0.5">Pastel-adjacent deep navy night theme</div>
                </div>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* 2. Font Size Scaling */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-500" />
              <span>Font Size Scaling</span>
            </label>
            <span className="badge-mono text-[11px] capitalize">{fontSize}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  fontSize === size
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm capitalize">{size}</div>
                <div className="text-xs text-slate-500 font-normal mt-1">
                  {size === 'small' && '15px base'}
                  {size === 'medium' && '17px (Default)'}
                  {size === 'large' && '19px base'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Layout Density */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-indigo-500" />
              <span>Layout Density</span>
            </label>
            <span className="badge-mono text-[11px] capitalize">{density}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                density === 'comfortable'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Comfortable</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Generous spacing and airy margins</div>
              </div>
              {density === 'comfortable' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>

            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                density === 'compact'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Compact</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Tighter padding for evaluation tables</div>
              </div>
              {density === 'compact' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* 4. Reduce Motion */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <ZapOff className="w-4 h-4 text-indigo-500" />
                <span>Reduce Motion</span>
              </label>
              <p className="text-xs text-slate-500">
                Disables transitions and animations for accessibility.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReduceMotion(!reduceMotion)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                reduceMotion ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${
                  reduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Persistence Status */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-4 h-4" />
            <span>Preferences are synchronized with browser storage</span>
          </span>
          <span className="badge-mint text-[11px]">Synced</span>
        </div>
      </div>
    </div>
  );
};
