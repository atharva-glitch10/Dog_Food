import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Project } from '../types/index.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { Github, ExternalLink, ThumbsUp, Users, ArrowLeft, Calendar, Tag, Shield } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/projects/${id}`)
        .then((res: any) => {
          if (res.success) setProject(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleVote = async () => {
    if (!project) return;
    setVotingLoading(true);
    try {
      await api.post(`/events/${project.eventId}/vote/${project.id}`);
      setVoted(true);
      toastSuccess('Your vote has been recorded!');
      // Reload project to get updated vote count
      const updated: any = await api.get(`/projects/${project.id}`);
      if (updated.success) setProject(updated.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to record vote');
    } finally {
      setVotingLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading project details...</div>;
  }

  if (!project) {
    return <div className="text-center py-20 text-red-400">Project not found or private draft.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Back Button */}
      <Link
        to={project.event ? `/gallery/${project.event.slug}` : '/'}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Gallery
      </Link>

      {/* Main Project Header */}
      <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {project.track && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: `${project.track.colorHex}20`,
                  color: project.track.colorHex,
                  border: `1px solid ${project.track.colorHex}40`,
                }}
              >
                {project.track.name}
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Status: {project.status}
            </span>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Github className="w-4 h-4" />
                GitHub Repo
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Live Demo
              </a>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-white">{project.title}</h1>
          {project.tagline && (
            <p className="text-lg text-violet-300 font-medium">{project.tagline}</p>
          )}
        </div>

        {/* Tech tags */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {project.technologies.map((tech, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              The Problem
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {project.problemStatement}
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              The Solution & Architecture
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {project.solutionDescription}
            </p>
          </div>
        </div>

        {/* Sidebar: Team & Voting */}
        <div className="space-y-6">
          {/* Vote Card */}
          <div className="glass-card p-6 rounded-2xl border border-violet-500/20 text-center space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Community Support</h3>
              <p className="text-xs text-slate-400">Cast your vote for this project</p>
            </div>

            <button
              onClick={handleVote}
              disabled={voted || votingLoading}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                voted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                  : 'btn-primary'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {voted ? 'Vote Recorded!' : votingLoading ? 'Voting...' : 'Vote for Project'}
            </button>
          </div>

          {/* Team Members */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              Team: {project.team.name}
            </h3>

            <div className="space-y-3">
              {project.team.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                  <span className="font-semibold text-slate-200">{member.user.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-violet-400 uppercase font-mono">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
