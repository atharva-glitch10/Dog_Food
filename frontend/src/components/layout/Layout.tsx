import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.tsx';
import { Footer } from './Footer.tsx';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-150">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
      <SettingsPanel />
    </div>
  );
};
