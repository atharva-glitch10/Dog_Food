import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Trophy, LayoutGrid, Users, ArrowRight, CheckCircle2, Cpu, FileCheck } from 'lucide-react';
import api from '../services/api.ts';
import { Event } from '../types/index.ts';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events')
      .then((res: any) => {
        if (res.success && res.data) {
          setEvents(res.data);
        }
      })
      .catch((err) => console.error('Failed to load events', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Terminal className="w-3.5 h-3.5 text-slate-300" />
            <span>Open Source & Self-Hostable Infrastructure</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Self-Hosted Hackathon Management & Statistical Judging
          </h1>

          <p className="text-base text-slate-300 leading-relaxed">
            Run offline-capable hackathons with team registration, strict deadline enforcement,
            deterministic judge assignment, cross-judge Z-score normalization, and Bradley-Terry ranking.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/gallery/dogfood-2026" className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Explore Project Gallery
            </Link>
            <Link to="/event/dogfood-2026" className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2">
              View Hackathon Event
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg space-y-3">
          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Double-Blind Role Isolation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Strict server-side authorization guards isolate participant drafts, judge evaluations, and organizer administration.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg space-y-3">
          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Score Normalization</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Cross-judge Z-score transformation with Bayesian shrinkage fallbacks automatically balances harsh vs lenient graders.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg space-y-3">
          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Deterministic & Verifiable</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Seed-based judge assignment and HMAC-signed participation records guarantee 100% reproducible, audit-ready results.
          </p>
        </div>
      </section>

      {/* Active Events Listing */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Active Hackathons</h2>
            <p className="text-xs text-slate-400">Participate, build, and submit your project.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 p-12 text-center rounded-lg text-slate-400 text-sm">
            No active events available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {events.map((event) => (
              <div key={event.id} className="bg-slate-900/70 border border-slate-800 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {event.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Deadline: {new Date(event.submissionDeadline).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
                    <Link to={`/event/${event.slug}`}>{event.name.replace(/—/g, ':')}</Link>
                  </h3>

                  <p className="text-sm text-slate-300 line-clamp-2">
                    {event.tagline || event.description}
                  </p>

                  {/* Tracks */}
                  {event.tracks && event.tracks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {event.tracks.map((t) => (
                        <span key={t.id} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>Teams: <strong className="text-slate-200">{event._count?.teams || 0}</strong></span>
                    <span>Projects: <strong className="text-slate-200">{event._count?.projects || 0}</strong></span>
                  </div>
                  <Link to={`/event/${event.slug}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-slate-200">
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
