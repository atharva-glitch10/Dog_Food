import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Trophy, Medal, ExternalLink, Github, ArrowLeft, Shield } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventSlug) {
      api.get(`/results/${eventSlug}`)
        .then((res: any) => {
          if (res.success) setData(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [eventSlug]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">Loading verified results...</div>;
  }

  if (!data || !data.rankings || data.rankings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-lg max-w-lg mx-auto my-12 space-y-4">
        <Trophy className="w-10 h-10 text-slate-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Results Pending Publication</h2>
        <p className="text-xs text-slate-400">
          The judging and scoring normalization process is still active. Final rankings will appear here once published by organizers.
        </p>
        <Link to={`/gallery/${eventSlug}`} className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5">
          Browse Project Gallery
        </Link>
      </div>
    );
  }

  const { event, rankings } = data;

  return (
    <div className="space-y-10 py-4">
      {/* Hero Podium Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Official Hackathon Results & Rankings</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {event.name.replace(/—/g, ':')}
        </h1>
        <p className="text-xs text-slate-400">
          Rankings computed via Z-score cross-judge normalization, Bayesian variance shrinkage, and tie-breaking hierarchy.
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
          {/* 2nd Place */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg order-2 md:order-1 text-center space-y-3">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-xs font-bold text-slate-200">
              #2
            </div>
            <h3 className="text-base font-bold text-white line-clamp-1">{rankings[1].title}</h3>
            <p className="text-xs text-slate-400">Team: {rankings[1].team.name}</p>
            <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 font-bold">
              Score: {rankings[1].normalizedScore} / 100
            </div>
          </div>

          {/* 1st Place */}
          <div className="bg-slate-900 border-2 border-amber-500/40 p-7 rounded-lg order-1 md:order-2 text-center space-y-3">
            <div className="w-12 h-12 rounded bg-amber-500/10 border border-amber-400/50 flex items-center justify-center mx-auto text-sm font-bold text-amber-300">
              #1
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">First Place</span>
              <h3 className="text-lg font-bold text-white">{rankings[0].title}</h3>
              <p className="text-xs text-slate-300">Team: {rankings[0].team.name}</p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-xs font-mono text-amber-300 font-bold">
              Score: {rankings[0].normalizedScore} / 100
            </div>
          </div>

          {/* 3rd Place */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg order-3 text-center space-y-3">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-xs font-bold text-slate-200">
              #3
            </div>
            <h3 className="text-base font-bold text-white line-clamp-1">{rankings[2].title}</h3>
            <p className="text-xs text-slate-400">Team: {rankings[2].team.name}</p>
            <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 font-bold">
              Score: {rankings[2].normalizedScore} / 100
            </div>
          </div>
        </div>
      )}

      {/* Complete Rankings Table */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Medal className="w-4 h-4 text-slate-300" />
          Complete Leaderboard & Score Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Team</th>
                <th className="py-2.5 px-3">Track</th>
                <th className="py-2.5 px-3">Normalized Score</th>
                <th className="py-2.5 px-3">Raw Score</th>
                <th className="py-2.5 px-3">Votes</th>
                <th className="py-2.5 px-3 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rankings.map((project: any) => (
                <tr key={project.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-amber-400 font-mono">
                    #{project.finalRank || '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Link to={`/project/${project.id}`} className="font-semibold text-slate-100 hover:text-blue-400">
                      {project.title}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{project.team.name}</td>
                  <td className="py-2.5 px-3">
                    {project.track ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {project.track.name}
                      </span>
                    ) : 'General'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                    {project.normalizedScore ?? '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {project.rawScore ?? '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {project.voteCount ?? '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
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
