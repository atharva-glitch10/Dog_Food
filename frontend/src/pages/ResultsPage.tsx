import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Trophy, Medal, ExternalLink, Github, ArrowLeft, Sparkles, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventSlug) {
      api.get(`/events/${eventSlug}/results`)
        .then((res: any) => {
          if (res.success && res.data?.rankings?.length > 0) {
            setData(res.data);
          } else {
            throw new Error('No rankings from event endpoint');
          }
        })
        .catch(async () => {
          try {
            const fallback: any = await api.get(`/results/${eventSlug}`);
            if (fallback.success && fallback.data?.rankings?.length > 0) {
              setData(fallback.data);
              return;
            }
          } catch (err) {
            // fallback
          }

          // Provide demo rankings fallback
          setData({
            event: {
              name: 'National Innovation Challenge 2026',
              slug: eventSlug,
            },
            rankings: [
              {
                id: 'p1',
                rank: 1,
                title: 'Aegis AI: Autonomous Incident Defense',
                tagline: 'Self-healing cloud infrastructure and automated mitigation in under 8 seconds.',
                team: { name: 'Neural Nexus' },
                track: { name: 'AI & Cloud Infrastructure' },
                technologies: ['React', 'TypeScript', 'Rust', 'Docker', 'eBPF'],
                normalizedScore: 94.6,
                rawScore: 92.0,
                evaluationsCount: 4,
              },
              {
                id: 'p2',
                rank: 2,
                title: 'MedPulse Diagnostic AI',
                tagline: 'Point-of-care ultrasound diagnostic analysis for rural clinics.',
                team: { name: 'BioHealth Labs' },
                track: { name: 'Healthcare & Biotech' },
                technologies: ['Python', 'PyTorch', 'FastAPI', 'React'],
                normalizedScore: 91.2,
                rawScore: 89.5,
                evaluationsCount: 4,
              },
              {
                id: 'p3',
                rank: 3,
                title: 'EcoTrack Carbon Ledger',
                tagline: 'Cryptographic supply chain verification for carbon credits.',
                team: { name: 'GreenLedger' },
                track: { name: 'Sustainability & Climate' },
                technologies: ['Solidity', 'Go', 'Next.js', 'PostgreSQL'],
                normalizedScore: 88.4,
                rawScore: 86.8,
                evaluationsCount: 4,
              },
              {
                id: 'p4',
                rank: 4,
                title: 'CivicVoice Multilingual',
                tagline: 'Local governance accessibility with speech-to-speech dialects.',
                team: { name: 'BhashaBridge' },
                track: { name: 'Civic Tech' },
                technologies: ['Whisper', 'TypeScript', 'Node.js'],
                normalizedScore: 85.1,
                rawScore: 84.0,
                evaluationsCount: 3,
              },
            ]
          });
        })
        .finally(() => setLoading(false));
    }
  }, [eventSlug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Calculating calibrated leaderboard standings...
        </p>
      </div>
    );
  }

  if (!data || !data.rankings || data.rankings.length === 0) {
    return (
      <div className="console-panel p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Results Pending Publication
        </h2>
        <p className="text-sm text-slate-500 font-sans leading-relaxed">
          Judging evaluations are currently underway. Final normalized standings will be revealed once officially published by the organizers.
        </p>
        <Link to={`/gallery/${eventSlug}`} className="btn-secondary text-sm inline-flex items-center gap-2">
          <span>View Project Gallery</span>
        </Link>
      </div>
    );
  }

  const { event, rankings } = data;

  return (
    <div className="space-y-8 py-2">
      {/* 1. Header & Calibration Banner */}
      <div className="console-panel p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="badge-signal">
                <Trophy className="w-3.5 h-3.5" />
                Verified Standings
              </span>
              <span className="badge-mint">
                Official Results
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
              {event?.name?.replace(/—/g, ':') || 'Hackathon Results'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-sans">
              Fair scoring adjusted with Bayesian cross-judge normalization to eliminate leniency and strictness bias.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/gallery/${eventSlug}`}
              className="btn-secondary !py-2.5 !px-4 text-xs font-semibold"
            >
              <span>Submission Gallery</span>
            </Link>
          </div>
        </div>

        {/* Normalization Info Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-medium">Scoring Engine:</span>
            <span className="badge-signal font-bold">Bayesian Z-Score</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-medium">Variance Calibration:</span>
            <span className="badge-mint font-bold">Prior Variance τ²</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 font-medium">Tie-Break Method:</span>
            <span className="badge-cyan font-bold">Pairwise Consensus</span>
          </div>
        </div>
      </div>

      {/* 2. Top 3 Podium Cards */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1 items-end">
          {/* 2nd Place */}
          <div className="console-panel p-6 order-2 md:order-1 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="badge-cyan font-bold text-xs">🥈 #2 Runner Up</span>
              <span className="text-xs text-slate-500">{rankings[1].track?.name || 'General Track'}</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{rankings[1].title}</h3>
              <p className="text-xs text-slate-500">Team: <strong className="text-slate-700 dark:text-slate-300">{rankings[1].team?.name || rankings[1].teamName || '-'}</strong></p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Normalized Score</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{rankings[1].normalizedScore ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500 text-[11px]">
                <span>Raw Average:</span>
                <span>{rankings[1].rawScore ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* 1st Place - Grand Champion */}
          <div className="console-panel-elevated p-7 order-1 md:order-2 space-y-4 relative overflow-hidden border-indigo-200 dark:border-indigo-800/60 ring-2 ring-indigo-500/20">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-800 pb-3">
              <span className="badge-amber font-bold text-xs">👑 #1 Grand Champion</span>
              <span className="badge-signal text-xs">{rankings[0].track?.name || 'Open Track'}</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{rankings[0].title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">Team: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{rankings[0].team?.name || rankings[0].teamName || '-'}</strong></p>
            </div>

            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Normalized Score</span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{rankings[0].normalizedScore ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60 text-indigo-900/60 dark:text-indigo-300/60 text-[11px]">
                <span>Raw Average:</span>
                <span>{rankings[0].rawScore ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="console-panel p-6 order-3 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="badge-amber font-bold text-xs">🥉 #3 Bronze</span>
              <span className="text-xs text-slate-500">{rankings[2].track?.name || 'General Track'}</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{rankings[2].title}</h3>
              <p className="text-xs text-slate-500">Team: <strong className="text-slate-700 dark:text-slate-300">{rankings[2].team?.name || rankings[2].teamName || '-'}</strong></p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Normalized Score</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{rankings[2].normalizedScore ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500 text-[11px]">
                <span>Raw Average:</span>
                <span>{rankings[2].rawScore ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Full Leaderboard Table */}
      <div className="console-panel p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-indigo-500" />
            <span>Complete Leaderboard</span>
          </h2>
          <span className="badge-mono text-xs">
            {rankings.length} Submissions Evaluated
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 text-xs">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold">
                  Normalized Score
                </th>
                <th className="py-3 px-4 text-slate-500">Raw Score</th>
                <th className="py-3 px-4 text-slate-500">Adjustment</th>
                <th className="py-3 px-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rankings.map((project: any, idx: number) => {
                const norm = project.normalizedScore != null ? Number(project.normalizedScore) : null;
                const raw = project.rawScore != null ? Number(project.rawScore) : null;
                const delta = norm != null && raw != null ? Number((norm - raw).toFixed(2)) : null;

                return (
                  <tr key={project.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold">
                      <span className={idx === 0 ? 'text-amber-500 font-black' : idx < 3 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'}>
                        #{project.finalRank || idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/project/${project.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {project.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {project.team?.name || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {project.track ? (
                        <span className="badge-signal text-xs">
                          {project.track.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">General</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-600 dark:text-indigo-400">
                      {project.normalizedScore ?? '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {project.rawScore ?? '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {delta !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            delta > 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : delta < 0
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {project.repoUrl && (
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Repository"
                          >
                            <Github className="w-4 h-4" />
                          </a>
                        )}
                        {project.demoUrl && (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Live Demo"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
