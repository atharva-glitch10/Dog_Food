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
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-slate-300" />
            Judge Evaluation Portal
          </h1>
          <p className="text-xs text-slate-400">
            Event: <strong className="text-slate-200">{event?.name?.replace(/—/g, ':')}</strong>
          </p>
        </div>

        <Link
          to={`/dashboard/pairwise/${eventSlug}`}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <GitCompare className="w-4 h-4" />
          Bradley-Terry Pairwise Mode
        </Link>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Your Evaluation Completion Progress</span>
          <span className="font-semibold text-slate-200 font-mono">{completedCount} of {totalCount} Completed ({progressPercent}%)</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded overflow-hidden border border-slate-800">
          <div
            className="h-full bg-blue-600 rounded transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-slate-300" />
          Assigned Projects to Evaluate
        </h2>

        {assignments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-lg text-slate-400 text-sm">
            No projects currently assigned to you for this event.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((item) => (
              <div
                key={item.assignmentId}
                className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.project.track?.name || 'General Track'}
                    </span>
                    {item.isCompleted ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed (Score: {item.evaluation?.weightedTotal})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
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
