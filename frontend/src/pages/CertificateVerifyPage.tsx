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
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Certificate Verification Portal</h1>
        <p className="text-sm text-slate-400">
          Verify the authenticity of participation, judging, and winner certificates using HMAC-SHA256 signatures.
        </p>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Certificate Verification Code</label>
            <div className="relative">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CERT-A1B2-C3D4"
                className="input-field pl-10 uppercase font-mono"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Verifying...' : 'Verify Certificate Integrity'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-6 bg-slate-900/90 rounded-2xl border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>Verified Authentic Certificate</span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Title:</span>
                <strong className="text-white">{result.certificate.title}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Issued To:</span>
                <strong className="text-white">{result.certificate.user.name}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Event:</span>
                <strong className="text-white">{result.certificate.event.name}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Issued At:</span>
                <span className="font-mono">{new Date(result.certificate.issuedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Cryptographic Signature:</span>
                <span className="font-mono text-[10px] text-violet-400 truncate max-w-xs">{result.certificate.signature}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
