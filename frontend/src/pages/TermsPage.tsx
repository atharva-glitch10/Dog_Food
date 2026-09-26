import React from 'react';
import { FileText, CheckCircle, AlertCircle, Scale } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          <Scale className="w-4 h-4 text-slate-300" />
          <span>Legal & Compliance</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Terms and Conditions</h1>
        <p className="text-sm text-slate-400 mt-2">
          Last revised: September 26, 2026. Standard operating terms for the DOGFOOD 2026 platform.
        </p>
      </div>

      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Platform Scope and License</h2>
          <p>
            DOGFOOD 2026 is an open-source hackathon management and scoring verification platform licensed under the MIT License. Operators deploying this platform agree to comply with local regulations and ensure fair, transparent execution of all judging algorithms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. Participant Eligibility and Conduct</h2>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-2">
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li><strong className="text-slate-100">Originality:</strong> Submitted projects must represent work created during the designated hackathon event period unless explicit prior-work exemptions are documented.</li>
              <li><strong className="text-slate-100">Intellectual Property:</strong> Participants retain full ownership and intellectual property rights to all software, documentation, and repositories submitted.</li>
              <li><strong className="text-slate-100">Anti-Sybil Policy:</strong> Creating multiple accounts, manipulating community voting via automated scripts, or colluding with evaluators results in immediate disqualification.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Evaluation and Statistical Scoring</h2>
          <p>
            Final rankings are calculated using standardized statistical procedures including Z-score normalization with Bayesian shrinkage and Bradley-Terry paired comparison models. The mathematical models are deterministic and reproducible given the underlying raw evaluation dataset. All decisions of the event organizers regarding dispute resolution are final.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Digital Certificate Verification</h2>
          <p>
            Digital certificates issued by this platform include cryptographic verification hashes. The authenticity of any certificate can be verified independently via the verification endpoint against the signing authority's public record.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Disclaimer of Warranties</h2>
          <p>
            The software is provided "as is", without warranty of any kind, express or implied. The developers and operators shall not be held liable for any damages, downtime, or data loss arising from the use of this software.
          </p>
        </section>
      </div>
    </div>
  );
};
