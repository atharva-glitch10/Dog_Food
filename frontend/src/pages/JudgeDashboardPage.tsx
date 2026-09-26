import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Shield, CheckCircle2, Clock, ArrowRight, Award, GitCompare } from 'lucide-react';

export const JudgeDashboardPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventSlug) {
      api.get(`/events/${eventSlug}`).then(async (res: any) => {
        if (res.success) {
          setEvent(res.data);
          const assignRes: any = await api.get(`/events/${res.data.id}/judges/my-assignments`);
          if (assignRes.success) {
            setAssignments(assignRes.data);
          }
        }
      }).finally(() => setLoading(false));
    }
  }, [eventSlug]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading judge assignments...</div>;

  const completedCount = assignments.filter((a) => a.isCompleted).length;
  const totalCount = assignments.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-purple-400" />
            Judge Evaluation Portal
          </h1>
          <p className="text-sm text-slate-400">
            Event: <strong className="text-slate-200">{event?.name}</strong>
          </p>
        </div>

        <Link
          to={`/dashboard/pairwise/${eventSlug}`}
          className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 border-purple-500/40 text-purple-300"
        >
          <GitCompare className="w-4 h-4" />
          Bradley-Terry Pairwise Mode
        </Link>
      </div>

      {/* Progress Bar Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Your Evaluation Completion Progress</span>
          <span className="font-bold text-purple-400 font-mono">{completedCount} of {totalCount} Completed ({progressPercent}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-violet-400" />
          Assigned Projects to Evaluate
        </h2>

        {assignments.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl text-slate-400">
            No projects currently assigned to you for this event.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((item) => (
              <div
                key={item.assignmentId}
                className="glass-card-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {item.project.track?.name || 'General Track'}
                    </span>
                    {item.isCompleted ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed (Score: {item.evaluation?.weightedTotal})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Clock className="w-4 h-4" />
                        Pending Evaluation
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">{item.project.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.project.problemStatement}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">Team: {item.project.team?.name}</span>
                  <Link
                    to={`/evaluate/${eventSlug}/${item.project.id}`}
                    className={`btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 ${
                      item.isCompleted ? 'bg-slate-800 text-slate-300 border border-slate-700' : ''
                    }`}
                  >
                    {item.isCompleted ? 'Review / Edit Scores' : 'Evaluate Project'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
