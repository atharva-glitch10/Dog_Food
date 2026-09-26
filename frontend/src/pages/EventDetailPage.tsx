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
      <div className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            {event.status.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-2">
            <Link to={`/gallery/${event.slug}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Public Gallery
            </Link>
            <Link to={`/results/${event.slug}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Live Results
            </Link>
            {user ? (
              <Link to={`/dashboard/team/${event.slug}`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Team & Submission
              </Link>
            ) : (
              <Link to="/register" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                Register to Participate
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-2 max-w-4xl">
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            {event.name.replace(/—/g, ':')}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            {(event.tagline || event.description).replace(/—/g, ':')}
          </p>
        </div>

        {/* Timeline bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Registration Closes:</span>
            <span className="font-semibold text-slate-200">{new Date(event.registrationEndDate).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Submissions Due:</span>
            <span className="font-semibold text-slate-200">{new Date(event.submissionDeadline).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Judging Period:</span>
            <span className="font-semibold text-slate-200">{new Date(event.judgingStartDate).toLocaleDateString()} - {new Date(event.judgingDeadline).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Team Size:</span>
            <span className="font-semibold text-slate-200">{event.settings?.minTeamSize || 1} to {event.settings?.maxTeamSize || 4} Members</span>
          </div>
        </div>
      </div>

      {/* Tracks Grid */}
      {event.tracks && event.tracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <h2 className="text-lg font-bold text-white">Competition Tracks</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.tracks.map((track) => (
              <div key={track.id} className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: track.colorHex }}
                  />
                  <span className="text-xs text-slate-500 font-mono">
                    {track._count?.projects || 0} Projects Submitted
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white">{track.name}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{track.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prizes Grid */}
      {event.prizes && event.prizes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Prizes & Bounties</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {event.prizes.map((prize) => (
              <div key={prize.id} className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-xs">
                    #{prize.rank}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{prize.name}</h3>
                  <p className="text-xs text-slate-400">{prize.description}</p>
                </div>
                {prize.amount && (
                  <div className="pt-2 border-t border-slate-800 text-sm font-bold text-amber-400 font-mono">
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
            <Award className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Judging Rubric Criteria</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {event.rubric.criteria.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Weight: {(c.weight * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-500">Max: {c.maxScore} pts</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200">{c.title}</h4>
                <p className="text-xs text-slate-400">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
