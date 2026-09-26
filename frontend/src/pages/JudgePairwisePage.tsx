import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { GitCompare, ArrowLeft, Trophy, Check, Equal } from 'lucide-react';

export const JudgePairwisePage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { error: toastError } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [pair, setPair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchNextPair = async () => {
    if (!event) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      const res: any = await api.get(`/events/${event.id}/pairwise/pairs`);
      if (res.success && res.data) {
        setPair(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch pair', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventSlug) {
      api.get(`/events/${eventSlug}`).then((res: any) => {
        if (res.success) {
          setEvent(res.data);
        }
      });
    }
  }, [eventSlug]);

  useEffect(() => {
    if (event) {
      fetchNextPair();
    }
  }, [event]);

  const handleVoteWinner = async (winnerId: string | null) => {
    if (!event || !pair) return;
    setSubmitting(true);
    try {
      await api.post(`/events/${event.id}/pairwise/compare`, {
        projectAId: pair.projectA.id,
        projectBId: pair.projectB.id,
        winnerProjectId: winnerId,
      });
      setSuccessMsg('Comparison recorded! Loading next pair...');
      setTimeout(() => fetchNextPair(), 800);
    } catch (err: any) {
      toastError(err.message || 'Failed to record comparison');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <Link
        to={`/dashboard/judge/${eventSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Judge Portal
      </Link>

      <div className="border-b border-slate-800 pb-4 space-y-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <GitCompare className="w-7 h-7 text-purple-400" />
          Bradley-Terry Pairwise Project Comparison
        </h1>
        <p className="text-xs text-slate-400">
          Compare two randomized projects head-to-head. Maximum Likelihood Estimation models the latent skill parameters.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading next project pair...</div>
      ) : !pair ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-400">
          Not enough projects available for pairwise comparison.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project A Card */}
            <div className="glass-card-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                  Project A
                </span>
                <h3 className="text-xl font-bold text-white">{pair.projectA.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{pair.projectA.problemStatement}</p>
                <div className="p-3 bg-slate-900/80 rounded-lg text-xs text-slate-400 space-y-1">
                  <strong className="text-slate-300 block">Solution:</strong>
                  <p>{pair.projectA.solutionDescription}</p>
                </div>
              </div>

              <button
                disabled={submitting}
                onClick={() => handleVoteWinner(pair.projectA.id)}
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                Select Project A as Winner
              </button>
            </div>

            {/* Project B Card */}
            <div className="glass-card-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Project B
                </span>
                <h3 className="text-xl font-bold text-white">{pair.projectB.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{pair.projectB.problemStatement}</p>
                <div className="p-3 bg-slate-900/80 rounded-lg text-xs text-slate-400 space-y-1">
                  <strong className="text-slate-300 block">Solution:</strong>
                  <p>{pair.projectB.solutionDescription}</p>
                </div>
              </div>

              <button
                disabled={submitting}
                onClick={() => handleVoteWinner(pair.projectB.id)}
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                Select Project B as Winner
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              disabled={submitting}
              onClick={() => handleVoteWinner(null)}
              className="btn-secondary text-xs py-2 px-6 inline-flex items-center gap-2"
            >
              <Equal className="w-4 h-4" />
              Declare Exact Tie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
