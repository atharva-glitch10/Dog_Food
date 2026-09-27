import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import api from '../services/api.ts';
import { Calendar, Sparkles, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { useToast } from '../components/ui/Toast.tsx';

export const CreateEventPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [regStart, setRegStart] = useState('2026-01-01T00:00');
  const [regEnd, setRegEnd] = useState('2026-12-31T23:59');
  const [subStart, setSubStart] = useState('2026-01-01T00:00');
  const [subEnd, setSubEnd] = useState('2026-12-31T23:59');
  const [judgeStart, setJudgeStart] = useState('2026-01-01T00:00');
  const [judgeEnd, setJudgeEnd] = useState('2026-12-31T23:59');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-slug generation from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !description.trim()) {
      setError('Please fill in all required fields (Name, Slug, Description).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        slug,
        tagline: tagline || undefined,
        description,
        registrationStartDate: new Date(regStart).toISOString(),
        registrationEndDate: new Date(regEnd).toISOString(),
        submissionStartDate: new Date(subStart).toISOString(),
        submissionDeadline: new Date(subEnd).toISOString(),
        judgingStartDate: new Date(judgeStart).toISOString(),
        judgingDeadline: new Date(judgeEnd).toISOString(),
      };

      const res: any = await api.post('/events', payload);
      if (res.success) {
        toastSuccess(`Event "${name}" created successfully!`);
        navigate(`/dashboard/organizer/${slug}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create event.';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-sm text-slate-500">
        Verifying organizer permissions...
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organizer Access Required</h2>
        <p className="text-sm text-slate-500">Only Organizers and Administrators can create hackathon events.</p>
        <button onClick={() => navigate('/login')} className="btn-primary !px-5 !py-2 text-sm">
          Sign In as Organizer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 badge-signal text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Organizer Mission Control</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create New Hackathon Event
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configure schedule, tracks, rubrics, and judging criteria for your competition.
        </p>
      </div>

      <div className="console-panel p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                Event Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-name-input"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. AI Agents Global Hackathon"
                className="input-field"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                Event URL Slug <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-slug-input"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. ai-agents-2026"
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              Tagline / Catchphrase
            </label>
            <input
              id="event-tagline-input"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Build autonomous AI agents for the decentralized web"
              className="input-field"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              Event Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="event-desc-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed rules, eligibility, prizes, and guidelines..."
              className="input-field"
              required
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Event Timeline & Milestones</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Registration Start
                </label>
                <input
                  type="datetime-local"
                  value={regStart}
                  onChange={(e) => setRegStart(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Registration End
                </label>
                <input
                  type="datetime-local"
                  value={regEnd}
                  onChange={(e) => setRegEnd(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Submissions Open
                </label>
                <input
                  type="datetime-local"
                  value={subStart}
                  onChange={(e) => setSubStart(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Submissions Deadline
                </label>
                <input
                  type="datetime-local"
                  value={subEnd}
                  onChange={(e) => setSubEnd(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Judging Starts
                </label>
                <input
                  type="datetime-local"
                  value={judgeStart}
                  onChange={(e) => setJudgeStart(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Judging Ends
                </label>
                <input
                  type="datetime-local"
                  value={judgeEnd}
                  onChange={(e) => setJudgeEnd(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary !px-4 !py-2 text-xs"
            >
              Cancel
            </button>
            <button
              id="create-event-btn"
              type="submit"
              disabled={loading}
              className="btn-primary !px-6 !py-2.5 text-sm font-semibold shadow-soft"
            >
              {loading ? 'Creating Event...' : 'Launch Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
