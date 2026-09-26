import React from 'react';
import { Shield, Lock, Eye, Database, Server } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          <Shield className="w-4 h-4 text-slate-300" />
          <span>Legal & Compliance</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-2">
          Last revised: September 26, 2026. Applicable to the DOGFOOD 2026 self-hosted instance.
        </p>
      </div>

      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Architecture and Data Sovereignty</h2>
          <p>
            DOGFOOD 2026 is designed as a 100% self-hostable, offline-capable platform. All user accounts,
            credentials, team rosters, project submissions, and judging evaluations are stored exclusively
            within the operator's private database instance (PostgreSQL). The software does not transmit
            telemetry, analytics, or behavioral tracking to any external third-party servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. Information Stored Locally</h2>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-2">
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li><strong className="text-slate-100">Account Credentials:</strong> Email address, display name, biographical text, and salted bcrypt password hashes.</li>
              <li><strong className="text-slate-100">Submission Artifacts:</strong> Repository URLs, demo links, architecture descriptions, and uploaded technical documentation.</li>
              <li><strong className="text-slate-100">Evaluation Records:</strong> Numerical criteria scores, constructive feedback strings, and pairwise comparison selections submitted by authorized judges.</li>
              <li><strong className="text-slate-100">System Logs:</strong> Audit logs containing action timestamps, administrative mutations, and client IP addresses recorded for session security.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Cookies and Session Management</h2>
          <p>
            The application issues standard <code className="text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded text-xs">HttpOnly</code>, <code className="text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded text-xs">SameSite=Lax</code> session cookies strictly for authentication verification. No third-party tracking cookies or advertising pixels exist within this application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Role-Based Access Isolation</h2>
          <p>
            Participant submission drafts remain private to team members until the official submission deadline. Evaluations and raw scoring inputs remain strictly confidential to assigned judges and designated event organizers until formal publication by event administrators.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Data Retention and Deletion</h2>
          <p>
            Data retention is managed entirely by the designated instance administrator. Users may request complete deletion of their account records, team associations, and project drafts by contacting their event organization team.
          </p>
        </section>
      </div>
    </div>
  );
};
