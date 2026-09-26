import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Trophy, Medal, Award, ExternalLink, Github, ThumbsUp, Layers, CheckCircle } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventSlug) {
      // Single API call — the backend resolves slug-or-UUID directly
      api.get(`/events/${eventSlug}/results`)
        .then((res: any) => {
          if (res && res.success) {
            setData(res.data);
          }
        })
        .catch((err: any) => {
          setError(err.message || 'Results have not been officially published yet.');
        })
        .finally(() => setLoading(false));
    }
  }, [eventSlug]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading official results...</div>;

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Results Pending Publication</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error || 'The organizers are currently conducting cross-judge score normalization and finalizing the winners.'}
        </p>
        <Link to={`/gallery/${eventSlug}`} className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5">
          Browse Project Gallery
        </Link>
      </div>
    );
  }

  const { event, rankings } = data;

  return (
    <div className="space-y-12 py-4">
      {/* Hero Podium Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Trophy className="w-4 h-4" />
          <span>Official Hackathon Results & Rankings</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">{event.name}</h1>
        <p className="text-xs text-slate-400">
          Rankings computed via Z-score cross-judge normalization, Bayesian variance shrinkage, and tie-breaking hierarchy.
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
          {/* 2nd Place */}
          <div className="glass-card-hover p-6 rounded-2xl border-slate-700/80 order-2 md:order-1 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-700/60 border border-slate-500 flex items-center justify-center mx-auto text-xl font-black text-slate-200">
              🥈 2nd
            </div>
            <h3 className="text-lg font-bold text-white line-clamp-1">{rankings[1].title}</h3>
            <p className="text-xs text-slate-400">Team: {rankings[1].team.name}</p>
            <div className="pt-2 border-t border-slate-800 text-xs font-mono text-violet-400 font-bold">
              Score: {rankings[1].normalizedScore} / 100
            </div>
          </div>

          {/* 1st Place */}
          <div className="glass-card-hover p-8 rounded-3xl border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 order-1 md:order-2 text-center space-y-4 shadow-xl shadow-amber-500/10">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-2xl font-black text-amber-300 shadow-lg shadow-amber-500/30">
              👑 1st
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Grand Champion</span>
              <h3 className="text-xl font-black text-white">{rankings[0].title}</h3>
              <p className="text-xs text-slate-300">Team: {rankings[0].team.name}</p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-sm font-mono text-amber-300 font-bold">
              Score: {rankings[0].normalizedScore} / 100
            </div>
          </div>

          {/* 3rd Place */}
          <div className="glass-card-hover p-6 rounded-2xl border-amber-700/40 order-3 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-800/30 border border-amber-600 flex items-center justify-center mx-auto text-xl font-black text-amber-400">
              🥉 3rd
            </div>
            <h3 className="text-lg font-bold text-white line-clamp-1">{rankings[2].title}</h3>
            <p className="text-xs text-slate-400">Team: {rankings[2].team.name}</p>
            <div className="pt-2 border-t border-slate-800 text-xs font-mono text-violet-400 font-bold">
              Score: {rankings[2].normalizedScore} / 100
            </div>
          </div>
        </div>
      )}

      {/* Complete Rankings Table */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Medal className="w-5 h-5 text-violet-400" />
          Complete Leaderboard & Score Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Normalized Score</th>
                <th className="py-3 px-4">Raw Score</th>
                <th className="py-3 px-4">Votes</th>
                <th className="py-3 px-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rankings.map((project: any) => (
                <tr key={project.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-amber-400 font-mono text-sm">
                    #{project.finalRank || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/project/${project.id}`} className="font-bold text-slate-100 hover:text-violet-400">
                      {project.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{project.team.name}</td>
                  <td className="py-3 px-4">
                    {project.track ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {project.track.name}
                      </span>
                    ) : 'General'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-violet-400 text-sm">
                    {project.normalizedScore ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {project.rawScore ?? '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {project.voteCount ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {project.repoUrl && (
                        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-white text-slate-400">
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.demoUrl && (
                        <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-white text-slate-400">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
