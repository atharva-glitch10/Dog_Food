import React from 'react';
import { Terminal, ExternalLink, Code } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Code className="w-6 h-6 text-slate-300" />
          REST API & Swagger Documentation
        </h1>
        <p className="text-xs text-slate-400">
          The DOGFOOD 2026 backend exposes 100% of all platform operations via REST APIs.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-3">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-300" />
          Interactive OpenAPI / Swagger UI
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          You can test every endpoint directly using the interactive Swagger UI served locally by the backend.
        </p>
        <a
          href="http://localhost:4000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-2 font-semibold"
        >
          Open Swagger UI Documentation (Port 4000)
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-1.5">
          <span className="font-semibold text-slate-200 block font-mono">Authentication & RBAC</span>
          <p className="text-slate-400">JWT and HTTP-only cookie sessions with server-side role validation on every route.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-1.5">
          <span className="font-semibold text-slate-200 block font-mono">Statistical Judging & Normalization</span>
          <p className="text-slate-400">Cross-judge Z-score transformation, Bayesian shrinkage, and Bradley-Terry MLE ranking.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-1.5">
          <span className="font-semibold text-emerald-400 block font-mono">Rate Limiting & Anti-Abuse</span>
          <p className="text-slate-400">Sliding-window token bucket limiters on auth and voting routes preventing Sybil attacks.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-1.5">
          <span className="font-semibold text-amber-400 block font-mono">Data Import / Export & Webhooks</span>
          <p className="text-slate-400">RFC 4180 CSV streams, HMAC-signed webhooks, and cryptographic participation verification.</p>
        </div>
      </div>
    </div>
  );
};
