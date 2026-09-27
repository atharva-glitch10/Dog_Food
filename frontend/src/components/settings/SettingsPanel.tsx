import React from 'react';
import { useSettings, ThemeMode, FontSize, Density } from '../../context/SettingsContext.tsx';
import { X, Moon, Sun, Type, LayoutTemplate, ZapOff, Check, Sliders } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
    isOpen,
    setIsOpen,
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl flex flex-col justify-between overflow-y-auto transition-colors">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Preferences & Settings
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Local display and accessibility options
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Options List */}
            <div className="space-y-6">
              {/* 1. Theme Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span>Interface Theme</span>
                  </label>
                  <span className="badge-signal text-[11px] capitalize">{theme} mode</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-3 px-3.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                      theme === 'light'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 font-semibold shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Sun className="w-4 h-4 text-amber-500" />
                      {theme === 'light' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Clean Daylight</span>
                    <span className="text-[11px] text-slate-500 font-normal">Warm, airy default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-3 px-3.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                      theme === 'dark'
                        ? 'bg-indigo-950/40 border-indigo-400 text-indigo-200 font-semibold shadow-xs ring-2 ring-indigo-500/30'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      {theme === 'dark' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Soft Slate</span>
                    <span className="text-[11px] text-slate-500 font-normal">Pastel-toned night</span>
                  </button>
                </div>
              </div>

              {/* 2. Font Size Scaling */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Type className="w-4 h-4 text-indigo-500" />
                    <span>Font Size Scaling</span>
                  </label>
                  <span className="badge-mono text-[11px] capitalize">{fontSize}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                        fontSize === size
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold capitalize">{size}</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        {size === 'small' && '15px'}
                        {size === 'medium' && '17px (Default)'}
                        {size === 'large' && '19px'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Density / Padding */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                    <span>Layout Density</span>
                  </label>
                  <span className="badge-mono text-[11px] capitalize">{density}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDensity('comfortable')}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                      density === 'comfortable'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>Comfortable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                      density === 'compact'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>Compact</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Comfortable provides roomy spacing. Compact tightens margins for high-volume scoring tables.
                </p>
              </div>

              {/* 4. Reduce Motion Toggle */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
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
            </div>
          </div>

          {/* Footer Persistence Notice */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-4 h-4" />
              <span>Saved to browser</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-primary !py-1.5 !px-4 text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
