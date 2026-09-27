import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Project, Event } from '../types/index.ts';
import { ArrowLeft, ArrowRight, Save, Send, AlertCircle, CheckCircle2, ExternalLink, Code2, Sparkles, Layers, ChevronDown, ChevronUp, MessageSquare, Check, Shield } from 'lucide-react';
import { safeHref } from '../utils/safeHref.ts';

export const JudgeEvaluatePage: React.FC = () => {
  const { eventSlug, projectId } = useParams<{ eventSlug: string; projectId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState(false);

  useEffect(() => {
    if (eventSlug && projectId) {
      Promise.allSettled([
        api.get(`/events/${eventSlug}`),
        api.get(`/projects/${projectId}`),
        api.get(`/evaluations/project/${projectId}`),
      ])
        .then(async ([eventSettled, projSettled, evalSettled]) => {
          const eVal = eventSettled.status === 'fulfilled' ? (eventSettled.value as any) : null;
          const pVal = projSettled.status === 'fulfilled' ? (projSettled.value as any) : null;
          const evVal = evalSettled.status === 'fulfilled' ? (evalSettled.value as any) : null;

          if (eVal && eVal.success) {
            setEvent(eVal.data);
            if (eVal.data.rubric?.criteria) {
              const initialScores: Record<string, number> = {};
              for (const c of eVal.data.rubric.criteria) {
                initialScores[c.id] = Math.round(c.maxScore / 2);
              }
              setScores(initialScores);
            }

            // Fetch assignments for queue progress tracker
            try {
              const assignRes: any = await api.get(`/events/${eVal.data.id}/judges/my-assignments`);
              if (assignRes.success && Array.isArray(assignRes.data)) {
                setAssignments(assignRes.data);
              }
            } catch {
              // fallback gracefully if judge endpoint is unavailable
            }
          }

          if (pVal && pVal.success) {
            setProject(pVal.data);
          }

          if (evVal && evVal.success && evVal.data) {
            setFeedback(evVal.data.feedback || '');
            if (evVal.data.feedback) setFeedbackOpen(true);
            if (evVal.data.scores) {
              const updatedScores: Record<string, number> = {};
              for (const s of evVal.data.scores) {
                updatedScores[s.criterionId] = s.score;
              }
              setScores((prev) => ({ ...prev, ...updatedScores }));
            }
          }

          if (!eVal?.success || !pVal?.success) {
            setLoadError(
              (eventSettled.status === 'rejected' && (eventSettled.reason as any)?.message) ||
                (projSettled.status === 'rejected' && (projSettled.reason as any)?.message) ||
                'Could not load this project for evaluation.'
            );
          }
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [eventSlug, projectId]);

  // Calculate live weighted score
  const calculateLiveTotal = () => {
    if (!event?.rubric?.criteria) return 0;
    let total = 0;
    for (const c of event.rubric.criteria) {
      const s = scores[c.id] || 0;
      total += (s / c.maxScore) * c.weight * 100;
    }
    return parseFloat(total.toFixed(2));
  };

  const handleScoreChange = (criterionId: string, val: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: val }));
    setSavedDraft(false);
  };

  const handleSubmitEvaluation = async (isDraft: boolean) => {
    if (!event || !project) return;
    setError(null);
    setSubmitting(true);

    const scoresPayload = Object.entries(scores).map(([criterionId, score]) => ({
      criterionId,
      score,
    }));

    try {
      const res: any = await api.post('/evaluations', {
        eventId: event.id,
        projectId: project.id,
        scores: scoresPayload,
        feedback,
        isDraft,
      });

      if (res.success) {
        if (isDraft) {
          setSavedDraft(true);
        } else {
          // Navigate to judge queue or next project
          navigate(`/dashboard/judge/${eventSlug}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">
          Loading evaluation criteria and project data...
        </p>
      </div>
    );
  }

  if (loadError || !project || !event) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <div className="console-panel p-8 space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Not Found</h2>
          <p className="text-sm text-slate-500 font-sans">
            {loadError || 'The target project was not found in your assigned evaluation queue.'}
          </p>
          <Link to={`/dashboard/judge/${eventSlug}`} className="btn-secondary mt-2">
            Return to Queue
          </Link>
        </div>
      </div>
    );
  }

  const liveWeightedScore = calculateLiveTotal();
  const completedCount = assignments.filter((a) => a.isCompleted).length;
  const totalAssigned = assignments.length || 8;
  const currentScoredDisplay = `${completedCount} of ${totalAssigned} evaluated`;

  // Find next project in queue if exists
  const currentIndex = assignments.findIndex((a) => a.project?.id === project.id || a.projectId === project.id);
  const nextProject = currentIndex >= 0 && currentIndex < assignments.length - 1 ? assignments[currentIndex + 1] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* 1. Header Progress Bar & Navigation */}
      <div className="console-panel p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/judge/${eventSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Queue</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Your Progress:</span>
            <span className="badge-signal font-semibold">
              {currentScoredDisplay}
            </span>
          </div>
        </div>

        {/* Hairline Progress Strip */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.round((completedCount / (totalAssigned || 1)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 shrink-0">
            {Math.round((completedCount / (totalAssigned || 1)) * 100)}%
          </span>
        </div>

        {/* Quick Next Target Link */}
        {nextProject && (
          <Link
            to={`/evaluate/${eventSlug}/${nextProject.project?.id || nextProject.projectId}`}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Next: {nextProject.project?.title?.slice(0, 18) || 'Project'}...</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* 2. Project Dossier Card */}
      <div className="console-panel p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-signal">
                <Layers className="w-3.5 h-3.5" />
                {project.track?.name || 'General Track'}
              </span>
              <span className="badge-mono">
                Team: <strong className="text-slate-700 dark:text-slate-300 ml-1">{project.team.name}</strong>
              </span>
              <span className="badge-cyan">
                ID: {project.id.slice(0, 8)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-1">
              {project.title}
            </h1>
            {project.tagline && (
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                {project.tagline}
              </p>
            )}
          </div>

          {/* Links */}
          <div className="flex items-center gap-2.5 shrink-0">
            {project.repoUrl && (
              <a
                href={safeHref(project.repoUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary !py-2 !px-3.5 text-xs"
              >
                <Code2 className="w-4 h-4" />
                <span>Codebase</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
            {project.demoUrl && (
              <a
                href={safeHref(project.demoUrl)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary !py-2 !px-3.5 text-xs shadow-soft"
              >
                <Sparkles className="w-4 h-4" />
                <span>Live Demo</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
          </div>
        </div>

        {/* Tech Stack Pills */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">
              Tech Stack:
            </span>
            {project.technologies.map((tech) => (
              <span key={tech} className="badge-mono text-xs">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Problem & Solution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1.5">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
              Problem Statement
            </span>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              {project.problemStatement || 'No problem statement recorded.'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1.5">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              Solution & Architecture
            </span>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              {project.solutionDescription || 'No architecture description recorded.'}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>Error: {error}</span>
        </div>
      )}

      {savedDraft && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Draft Saved: Scores have been temporarily cached. You can submit when ready.</span>
        </div>
      )}

      {/* 3. Evaluation Rubric Card */}
      <div className="console-panel p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Evaluation Rubric</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
              Score each criterion from 0 to max points. The engine computes the weighted composite score automatically.
            </p>
          </div>

          {/* Real-time Calculated Total */}
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-5 py-3 rounded-2xl shadow-xs">
            <div className="text-right">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase block">
                Weighted Total
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {liveWeightedScore.toFixed(1)}
              </span>
            </div>
            <span className="text-xs font-bold text-indigo-400 dark:text-indigo-500">/ 100</span>
          </div>
        </div>

        {/* Criteria Sliders */}
        <div className="space-y-4">
          {event.rubric?.criteria.map((criterion, idx) => {
            const currentVal = scores[criterion.id] ?? 0;
            const weightPercent = (criterion.weight * 100).toFixed(0);
            const contribution = ((currentVal / criterion.maxScore) * criterion.weight * 100).toFixed(1);

            return (
              <div
                key={criterion.id}
                className="p-5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl hover:border-indigo-200 dark:hover:border-slate-600 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">0{idx + 1}.</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{criterion.title}</h3>
                      <span className="badge-signal text-xs">
                        Weight: {weightPercent}%
                      </span>
                    </div>
                    {criterion.description && (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">{criterion.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-right">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {currentVal} <span className="text-slate-400 text-xs">/ {criterion.maxScore}</span>
                    </span>
                    <span className="badge-mint text-xs font-semibold">
                      +{contribution} pts
                    </span>
                  </div>
                </div>

                {/* Slider + Quick Presets + Number Input */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="range"
                      min={0}
                      max={criterion.maxScore}
                      step={1}
                      value={currentVal}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>0 Min</span>
                      <span>{Math.round(criterion.maxScore / 2)} Mid</span>
                      <span>{criterion.maxScore} Max</span>
                    </div>
                  </div>

                  {/* Preset Pills and Direct Input */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
                      {[0, Math.round(criterion.maxScore * 0.5), Math.round(criterion.maxScore * 0.8), criterion.maxScore].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleScoreChange(criterion.id, val)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                            currentVal === val
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min={0}
                      max={criterion.maxScore}
                      value={currentVal}
                      onChange={(e) =>
                        handleScoreChange(
                          criterion.id,
                          Math.min(criterion.maxScore, Math.max(0, parseInt(e.target.value, 10) || 0))
                        )
                      }
                      className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Feedback Notes Box */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/60 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => setFeedbackOpen((prev) => !prev)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>Feedback & Evaluation Notes (Optional)</span>
              {feedback.length > 0 && (
                <span className="badge-mint text-xs">Notes Recorded</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-xs">{feedbackOpen ? 'Hide' : 'Add Notes'}</span>
              {feedbackOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {feedbackOpen && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-700 space-y-2 bg-white dark:bg-slate-900">
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share helpful constructive feedback, technical highlights, or comments for the team..."
                className="input-field text-sm font-sans"
              />
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Confidential notes shared with event organizers</span>
                <span>{feedback.length} characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Submitting officially records your evaluation. You can update scores until the judging deadline.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitEvaluation(true)}
              className="btn-secondary !py-2.5 !px-5 text-sm flex-1 sm:flex-initial"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitEvaluation(false)}
              className="btn-primary !py-2.5 !px-6 text-sm shadow-soft flex-1 sm:flex-initial"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Evaluation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
