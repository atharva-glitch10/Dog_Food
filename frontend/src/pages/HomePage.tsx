import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, LayoutGrid, Users, ArrowRight, CheckCircle2, Award, Sparkles, Shield, GitCompare } from 'lucide-react';
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
    <div className="space-y-10 py-2">
      {/* 1. Hero Section (Unstop-inspired friendly banner) */}
      <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-100/90 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm relative overflow-hidden transition-all">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="badge-signal">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Hackathons
            </span>
            <span className="badge-mint">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Offline Ready
            </span>
            <span className="badge-mono">
              Self-Hostable
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Fair, Transparent & Engaging Hackathon Judging
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Empowering students and creators with calibrated statistical evaluation, double-blind jury scoring, and verified digital certificates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link to="/gallery/dogfood-2026" className="btn-primary !px-6 !py-3 !text-base shadow-soft flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span>Explore Projects</span>
            </Link>
            <Link to="/results/dogfood-2026" className="btn-secondary !px-6 !py-3 !text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Live Leaderboard</span>
            </Link>
            <Link to="/event/dogfood-2026" className="btn-outline !px-5 !py-3 !text-base flex items-center gap-1.5">
              <span>Event Details</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Soft Pastel Feature Cards (Unstop-inspired stat cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soft Violet */}
        <div className="stat-strip-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scoring Engine</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">Bayesian Normalization</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Balances harsh and lenient judge variance</p>
          </div>
        </div>

        {/* Soft Peach */}
        <div className="stat-strip-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tie-Breaking</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <GitCompare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">Pairwise Matrix</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bradley-Terry head-to-head convergence</p>
          </div>
        </div>

        {/* Soft Mint */}
        <div className="stat-strip-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Integrity</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">Double-Blind Jury</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prevents conflict of interest and cross-team bias</p>
          </div>
        </div>

        {/* Soft Sky */}
        <div className="stat-strip-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recognition</span>
            <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">Signed Certificates</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">HMAC-SHA256 verified credentials</p>
          </div>
        </div>
      </section>

      {/* 3. Active Events Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Featured Hackathons
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Active student competitions and developer hackathons
            </p>
          </div>
          <span className="badge-mono">
            {events.length} Active Event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Loading active events...
          </div>
        ) : events.length === 0 ? (
          <div className="console-panel p-10 text-center text-slate-500 text-sm">
            No active hackathons at this moment. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {events.map((event) => (
              <div
                key={event.id}
                className="console-panel p-6 sm:p-7 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="badge-mint capitalize">
                      {event.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Deadline: {new Date(event.submissionDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <Link to={`/event/${event.slug}`}>{event.name.replace(/—/g, ':')}</Link>
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 font-sans line-clamp-2 leading-relaxed">
                    {event.tagline || event.description}
                  </p>

                  {/* Tracks */}
                  {event.tracks && event.tracks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {event.tracks.map((t) => (
                        <span key={t.id} className="badge-signal text-xs">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
                    <span>Teams: <strong className="text-slate-900 dark:text-white">{event._count?.teams || 0}</strong></span>
                    <span>Projects: <strong className="text-slate-900 dark:text-white">{event._count?.projects || 0}</strong></span>
                  </div>
                  <Link
                    to={`/event/${event.slug}`}
                    className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5"
                  >
                    <span>View Event</span>
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
