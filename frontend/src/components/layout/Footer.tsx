import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-300" />
          <span className="font-bold text-slate-200">DOGFOOD 2026</span>
          <span className="text-slate-400">: Self-Hostable Hackathon Management & Statistical Judging Platform</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/privacy" className="hover:text-slate-200 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-200 transition-colors">
            Terms & Conditions
          </Link>
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Offline Capable & Self-Hostable
          </span>
          <a
            href="https://github.com/atharva-glitch10/Dog_Food"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
