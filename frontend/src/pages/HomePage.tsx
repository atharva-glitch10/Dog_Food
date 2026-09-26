import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Trophy, LayoutGrid, Users, ArrowRight, CheckCircle2, Sparkles, Cpu, Layers } from 'lucide-react';
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
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-card p-8 sm:p-14 border border-violet-500/20 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Open Source & Self-Hostable Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
            High-Integrity Hackathon Management & <span className="gradient-text">Statistical Judging</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Manage registrations, teams, deadline-enforced submissions, deterministic judge assignment, cross-judge Z-score normalization with Bayesian shrinkage, and Bradley-Terry rankings — all 100% offline-ready.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to="/gallery/dogfood-2026" className="btn-primary px-6 py-3 text-sm flex items-center gap-2 font-semibold">
              <LayoutGrid className="w-4 h-4" />
              Explore Project Gallery
            </Link>
            <Link to="/event/dogfood-2026" className="btn-secondary px-6 py-3 text-sm flex items-center gap-2 font-semibold">
              View Flagship Event
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card-hover p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Double-Blind Role Isolation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Strict server-side authorization guards isolate participant drafts, judge evaluations, and organizer administration.
          </p>
        </div>

        <div className="glass-card-hover p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Score Normalization</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Cross-judge Z-score transformation with Bayesian shrinkage fallbacks automatically balances harsh vs lenient graders.
          </p>
        </div>

        <div className="glass-card-hover p-6 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Deterministic & Verifiable</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Seed-based judge assignment and HMAC-signed participation records guarantee 100% reproducible, audit-ready results.
          </p>
        </div>
      </section>

      {/* Active Events Listing */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Active Hackathons</h2>
            <p className="text-sm text-slate-400">Participate, build, and submit your project.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl text-slate-400">
            No active events available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {events.map((event) => (
              <div key={event.id} className="glass-card-hover p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {event.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Submissions: {new Date(event.submissionDeadline).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white hover:text-violet-400 transition-colors">
                    <Link to={`/event/${event.slug}`}>{event.name}</Link>
                  </h3>

                  <p className="text-sm text-slate-300 line-clamp-2">
                    {event.tagline || event.description}
                  </p>

                  {/* Tracks pills */}
                  {event.tracks && event.tracks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {event.tracks.map((t) => (
                        <span key={t.id} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>Teams: <strong className="text-slate-200">{event._count?.teams || 0}</strong></span>
                    <span>Projects: <strong className="text-slate-200">{event._count?.projects || 0}</strong></span>
                  </div>
                  <Link to={`/event/${event.slug}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-violet-300">
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
