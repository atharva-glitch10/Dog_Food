import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Github, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto py-8 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white rounded-md">
            DF
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">DogFood 2026</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Hackathon Management & Evaluation Platform</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
          <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Terms of Service
          </Link>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Offline Ready & Self-Hostable
          </span>
          <a
            href="https://github.com/atharva-glitch10/Dog_Food"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>Repository</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
