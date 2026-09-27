import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Award, CheckCircle2, Clock, ArrowRight, Shield, GitCompare } from 'lucide-react';

export const JudgeDashboardPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

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
      })
        .catch((err: any) => setAccessError(err?.message || 'Could not load your judging assignments.'))
        .finally(() => setLoading(false));
    }
  }, [eventSlug]);

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">Loading judge assignments...</div>;

  if (accessError) {
    return (
      <div className="console-panel p-8 max-w-lg mx-auto my-12 text-center space-y-2">
        <Shield className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Judging queue unavailable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{accessError}</p>
      </div>
    );
  }

  const completedCount = assignments.filter((a) => a.isCompleted).length;
  const totalCount = assignments.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 badge-signal text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Jury Evaluation Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Assigned Evaluation Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Event: <strong className="text-slate-800 dark:text-slate-200">{event?.name?.replace(/—/g, ':')}</strong>
          </p>
        </div>

        <Link
          to={`/dashboard/pairwise/${eventSlug}`}
          className="btn-secondary !py-2.5 !px-4 text-xs flex items-center gap-2"
        >
          <GitCompare className="w-4 h-4 text-indigo-500" />
          <span>Bradley-Terry Pairwise Mode</span>
        </Link>
      </div>

      {/* Progress Bar Card (Unstop-inspired friendly elevated card) */}
      <div className="console-panel p-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Evaluation Progress</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {completedCount} of {totalCount} Completed ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300 shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <span>Projects Assigned to You</span>
          </h2>
          <span className="badge-mono text-xs">
            {assignments.length} Project{assignments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="console-panel p-12 text-center text-slate-500 text-sm">
            No projects currently assigned to you for this event.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {assignments.map((item) => (
              <div
                key={item.assignmentId}
                className="console-panel p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge-signal text-xs">
                      {item.project.track?.name || 'General Track'}
                    </span>
                    {item.isCompleted ? (
                      <span className="badge-mint text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed (Score: {item.evaluation?.weightedTotal})
                      </span>
                    ) : (
                      <span className="badge-amber text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Evaluation
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.project.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Team: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.project.team.name}</span>
                    </p>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.project.tagline || item.project.problemStatement}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <Link
                    to={`/evaluate/${eventSlug}/${item.project.id}`}
                    className={`btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 ${
                      item.isCompleted ? '!bg-slate-800 hover:!bg-slate-900 dark:!bg-slate-700 dark:hover:!bg-slate-600' : ''
                    }`}
                  >
                    <span>{item.isCompleted ? 'Update Evaluation' : 'Grade Project'}</span>
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
