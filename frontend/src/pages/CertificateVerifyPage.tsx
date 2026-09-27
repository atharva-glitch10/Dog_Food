import React, { useState } from 'react';
import api from '../services/api.ts';
import { ShieldCheck, Search, CheckCircle, XCircle, Award } from 'lucide-react';

export const CertificateVerifyPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res: any = await api.get(`/certificates/verify/${code.trim().toUpperCase()}`);
      if (res.success) {
        setResult(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Code not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Certificate Verification</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verify the authenticity of participation, judging, and winner certificates using tamper-proof cryptographic signatures.
        </p>
      </div>

      <div className="console-panel p-6 sm:p-8 space-y-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Certificate Verification Code</label>
            <div className="relative">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CERT-A1B2-C3D4"
                className="input-field pl-10 uppercase font-mono tracking-wider"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            {loading ? 'Verifying Certificate...' : 'Verify Certificate Integrity'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-2xl flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-base">
              <CheckCircle className="w-5 h-5" />
              <span>Verified Authentic Certificate</span>
            </div>

            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Title:</span>
                <strong className="text-slate-900 dark:text-white font-semibold">{result.certificate.title}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Issued To:</span>
                <strong className="text-slate-900 dark:text-white font-semibold">{result.certificate.user.name}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Event:</span>
                <strong className="text-slate-900 dark:text-white font-semibold">{result.certificate.event.name}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Issued At:</span>
                <span className="font-mono text-xs">{new Date(result.certificate.issuedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Cryptographic Signature:</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-xs">{result.certificate.signature}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
