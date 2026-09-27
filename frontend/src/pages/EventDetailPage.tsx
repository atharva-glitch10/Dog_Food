import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Event } from '../types/index.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { Trophy, Layers, Calendar, Clock, Users, ShieldCheck, Tag, Award } from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugOrId) {
      api.get(`/events/${slugOrId}`)
        .then((res: any) => {
          if (res.success) setEvent(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [slugOrId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">Loading event details...</div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-red-400 text-sm">Event not found.</div>;
  }

  return (
    <div className="space-y-10 py-4">
      {/* Event Header Banner */}
      <div className="console-panel p-8 sm:p-12 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="badge-signal text-xs">
            {event.status.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-2">
            <Link to={`/gallery/${event.slug}`} className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5 font-medium">
              <Layers className="w-4 h-4 text-slate-400" />
              Public Gallery
            </Link>
            <Link to={`/results/${event.slug}`} className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5 font-medium">
              <Trophy className="w-4 h-4 text-amber-500" />
              Live Results
            </Link>
            {user ? (
              <Link to={`/dashboard/team/${event.slug}`} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4" />
                Team & Submission
              </Link>
            ) : (
              <Link to="/register" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 font-medium">
                Register to Participate
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-2 max-w-4xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {event.name.replace(/—/g, ':')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {(event.tagline || event.description).replace(/—/g, ':')}
          </p>
        </div>

        {/* Timeline bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-sm">
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Registration Closes:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(event.registrationEndDate).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Submissions Due:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(event.submissionDeadline).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Judging Period:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(event.judgingStartDate).toLocaleDateString()} - {new Date(event.judgingDeadline).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Users className="w-4 h-4" /> Team Size:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{event.settings?.minTeamSize || 1} to {event.settings?.maxTeamSize || 4} Members</span>
          </div>
        </div>
      </div>

      {/* Tracks Grid */}
      {event.tracks && event.tracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Competition Tracks</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.tracks.map((track) => (
              <div key={track.id} className="console-panel p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: track.colorHex }}
                    />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{track.name}</h3>
                  </div>
                  <span className="badge-mono text-xs">
                    {track._count?.projects || 0} Projects Submitted
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{track.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prizes Grid */}
      {event.prizes && event.prizes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Prizes & Bounties</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {event.prizes.map((prize) => (
              <div key={prize.id} className="console-panel p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                    #{prize.rank}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{prize.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{prize.description}</p>
                </div>
                {prize.amount && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-base font-bold text-brand-600 dark:text-brand-400 font-mono">
                    {prize.amount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rubric Transparency */}
      {event.rubric && event.rubric.criteria.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Judging Rubric Criteria</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {event.rubric.criteria.map((c) => (
              <div key={c.id} className="console-panel p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge-mint text-[11px] font-semibold">
                    Weight: {(c.weight * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Max: {c.maxScore} pts</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{c.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
