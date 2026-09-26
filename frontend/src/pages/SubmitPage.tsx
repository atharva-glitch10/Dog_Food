import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Event, Team, Track, Project } from '../types/index.ts';
import { FileText, Save, Send, AlertCircle, ArrowLeft, Check } from 'lucide-react';

export const SubmitPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [solutionDescription, setSolutionDescription] = useState('');
  const [trackId, setTrackId] = useState('');
  const [techString, setTechString] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventSlug) {
      api.get(`/events/${eventSlug}`).then(async (res: any) => {
        if (res.success) {
          setEvent(res.data);
          setTracks(res.data.tracks || []);

          const teamRes: any = await api.get(`/events/${res.data.id}/teams/my-team`);
          if (teamRes.success && teamRes.data) {
            setTeam(teamRes.data);
            if (teamRes.data.project) {
              const p = teamRes.data.project;
              setProject(p);
              setTitle(p.title || '');
              setTagline(p.tagline || '');
              setProblemStatement(p.problemStatement || '');
              setSolutionDescription(p.solutionDescription || '');
              setTrackId(p.trackId || '');
              setTechString(p.technologies ? p.technologies.join(', ') : '');
              setRepoUrl(p.repoUrl || '');
              setDemoUrl(p.demoUrl || '');
              setVideoUrl(p.videoUrl || '');
            }
          }
        }
      }).finally(() => setLoading(false));
    }
  }, [eventSlug]);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !team) return;
    setError(null);
    setSaving(true);

    const technologies = techString.split(',').map((s) => s.trim()).filter(Boolean);

    const payload = {
      title,
      tagline,
      problemStatement,
      solutionDescription,
      trackId: trackId || undefined,
      technologies,
      repoUrl: repoUrl || undefined,
      demoUrl: demoUrl || undefined,
      videoUrl: videoUrl || undefined,
    };

    try {
      if (project) {
        await api.put(`/projects/${project.id}`, payload);
      } else {
        const res: any = await api.post(`/events/${event.id}/submissions`, payload);
        if (res.success) setProject(res.data);
      }
      navigate(`/dashboard/team/${event.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save project draft');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading submission editor...</div>;
  if (!team) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-slate-300">You must create or join a team before submitting a project.</p>
        <Link to={`/dashboard/team/${eventSlug}`} className="btn-primary text-xs py-2 px-4">
          Go to Team Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <Link
        to={`/dashboard/team/${eventSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Team Dashboard
      </Link>

      <div className="border-b border-slate-800 pb-4 space-y-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <FileText className="w-7 h-7 text-violet-400" />
          {project ? 'Edit Project Submission' : 'Create Project Submission'}
        </h1>
        <p className="text-xs text-slate-400">
          Submitting for team <strong className="text-slate-200">{team.name}</strong>.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Project Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Aegis AI: Autonomous Incident Defense"
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Tagline / Short Elevator Pitch</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Self-healing cloud infrastructure in under 8 seconds."
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Target Track</label>
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="input-field"
          >
            <option value="">General / None</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Problem Statement *</label>
          <textarea
            rows={3}
            required
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="What real-world pain point or friction does your project address?"
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Solution & Technical Architecture *</label>
          <textarea
            rows={4}
            required
            value={solutionDescription}
            onChange={(e) => setSolutionDescription(e.target.value)}
            placeholder="Explain your approach, system design, and technical breakthrough..."
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Technologies Used (Comma-separated)</label>
          <input
            type="text"
            value={techString}
            onChange={(e) => setTechString(e.target.value)}
            placeholder="React, TypeScript, Rust, Docker, PostgreSQL"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Git Repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="input-field"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Live Demo / Deployment URL</label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://demo.example.com"
              className="input-field"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Project Draft...' : 'Save Draft Project'}
        </button>
      </form>
    </div>
  );
};
