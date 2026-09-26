import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Project, Event, Rubric } from '../types/index.ts';
import { Award, ArrowLeft, Save, Send, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

export const JudgeEvaluatePage: React.FC = () => {
  const { eventSlug, projectId } = useParams<{ eventSlug: string; projectId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventSlug && projectId) {
      Promise.all([
        api.get(`/events/${eventSlug}`),
        api.get(`/projects/${projectId}`),
        api.get(`/evaluations/project/${projectId}`),
      ])
        .then(([eventRes, projRes, evalRes]: [any, any, any]) => {
          if (eventRes.success) setEvent(eventRes.data);
          if (projRes.success) setProject(projRes.data);

          // Initialize scores
          const initialScores: Record<string, number> = {};
          if (eventRes.data.rubric?.criteria) {
            for (const c of eventRes.data.rubric.criteria) {
              initialScores[c.id] = 5; // default median
            }
          }

          if (evalRes.success && evalRes.data) {
            setFeedback(evalRes.data.feedback || '');
            if (evalRes.data.scores) {
              for (const s of evalRes.data.scores) {
                initialScores[s.criterionId] = s.score;
              }
            }
          }
          setScores(initialScores);
        })
        .catch((err) => console.error(err))
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
      await api.post('/evaluations', {
        eventId: event.id,
        projectId: project.id,
        isDraft,
        feedback,
        scores: scoresPayload,
      });

      navigate(`/dashboard/judge/${event.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading evaluation form...</div>;
  if (!project || !event) return <div className="text-center py-20 text-red-400">Project or event not found.</div>;

  const liveWeightedScore = calculateLiveTotal();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <Link
        to={`/dashboard/judge/${eventSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Judge Dashboard
      </Link>

      {/* Project Overview Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {project.track?.name || 'General Track'}
          </span>
          <span className="text-xs text-slate-500 font-mono">Team: {project.team.name}</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{project.title}</h1>
          {project.tagline && <p className="text-sm text-slate-300">{project.tagline}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase">Problem Statement:</span>
            <p className="text-slate-300 line-clamp-3">{project.problemStatement}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase">Solution & Tech:</span>
            <p className="text-slate-300 line-clamp-3">{project.solutionDescription}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scoring Rubric Form */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-300" />
              Rubric Criteria Scoring
            </h2>
            <p className="text-xs text-slate-400">Award marks from 0 to max score for each criterion.</p>
          </div>

          {/* Live Weighted Score Indicator */}
          <div className="text-right bg-slate-950 px-3.5 py-1.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Weighted Total</span>
            <span className="text-lg font-bold text-slate-200 font-mono">{liveWeightedScore} / 100</span>
          </div>
        </div>

        {/* Criteria Sliders */}
        <div className="space-y-4">
          {event.rubric?.criteria.map((criterion) => {
            const currentVal = scores[criterion.id] ?? 0;
            return (
              <div key={criterion.id} className="p-4 bg-slate-950 rounded-md border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{criterion.title}</h3>
                    <p className="text-xs text-slate-400">{criterion.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {currentVal} / {criterion.maxScore}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Weight: {(criterion.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={criterion.maxScore}
                    step={1}
                    value={currentVal}
                    onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={criterion.maxScore}
                    value={currentVal}
                    onChange={(e) => handleScoreChange(criterion.id, Math.min(criterion.maxScore, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className="w-16 input-field py-1 text-center font-mono text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Qualitative Feedback */}
        <div className="space-y-1.5 pt-4 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300">Qualitative Feedback for Team (Optional)</label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share constructive notes, strengths, and suggestions for improvement..."
            className="input-field"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitEvaluation(true)}
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Evaluation as Draft
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitEvaluation(false)}
            className="btn-primary text-xs py-2.5 px-6 flex items-center gap-1.5 font-bold"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Final Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
};
