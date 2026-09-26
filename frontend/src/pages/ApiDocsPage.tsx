import React from 'react';
import { Terminal, ExternalLink, Code, Database, Shield, Cpu } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Code className="w-7 h-7 text-violet-400" />
          REST API & Swagger Documentation
        </h1>
        <p className="text-xs text-slate-400">
          The DOGFOOD 2026 backend exposes 100% of all platform operations via REST APIs.
        </p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-violet-400" />
          Interactive OpenAPI / Swagger UI
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          You can test every endpoint directly using the interactive Swagger UI served locally by the backend.
        </p>
        <a
          href="http://localhost:4000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 font-bold"
        >
          Open Swagger UI Documentation (Port 4000)
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-violet-400 block font-mono">Authentication & RBAC</span>
          <p className="text-slate-400">JWT and HTTP-only cookie sessions with server-side role validation on every route.</p>
        </div>
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-purple-400 block font-mono">Statistical Judging & Normalization</span>
          <p className="text-slate-400">Cross-judge Z-score transformation, Bayesian shrinkage, and Bradley-Terry MLE ranking.</p>
        </div>
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-emerald-400 block font-mono">Rate Limiting & Anti-Abuse</span>
          <p className="text-slate-400">Sliding-window token bucket limiters on auth and voting routes preventing Sybil attacks.</p>
        </div>
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-amber-400 block font-mono">Data Import / Export & Webhooks</span>
          <p className="text-slate-400">RFC 4180 CSV streams, HMAC-signed webhooks, and cryptographic participation verification.</p>
        </div>
      </div>
    </div>
  );
};
