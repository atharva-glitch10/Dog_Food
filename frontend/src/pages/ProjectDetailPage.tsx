import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Project } from '../types/index.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { ExternalLink, Github, Users, ThumbsUp, ArrowLeft, Tag, Calendar, CheckCircle2 } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  const fetchProject = () => {
    if (id) {
      api.get(`/projects/${id}`)
        .then((res: any) => {
          if (res.success) setProject(res.data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleVote = async () => {
    if (!project) return;
    setVotingLoading(true);
    try {
      await api.post(`/events/${project.eventId}/vote/${project.id}`);
      setVoted(true);
      toastSuccess('Your community vote has been counted!');
      fetchProject();
    } catch (err: any) {
      toastError(err.message || 'Voting failed');
    } finally {
      setVotingLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">Loading project...</div>;
  }

  if (!project) {
    return <div className="text-center py-20 text-red-400 text-sm">Project not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Back button */}
      <div>
        <Link to={`/gallery/${project.eventId}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Gallery
        </Link>
      </div>

      {/* Main Project Header */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {project.track && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${project.track.colorHex}20`,
                  color: project.track.colorHex,
                  border: `1px solid ${project.track.colorHex}40`,
                }}
              >
                {project.track.name}
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Status: {project.status}
            </span>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
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
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Live Demo
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{project.title}</h1>
          {project.tagline && (
            <p className="text-base text-slate-300 font-normal">{project.tagline}</p>
          )}
        </div>

        {/* Tech tags */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.technologies.map((tech, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-blue-400" />
              The Problem
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {project.problemStatement}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-2.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-emerald-400" />
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
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-center space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Community Support</h3>
              <p className="text-xs text-slate-400">Cast your vote for this project</p>
            </div>

            <button
              onClick={handleVote}
              disabled={voted || votingLoading}
              className={`w-full py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                voted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                  : 'btn-primary'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {voted ? 'Vote Recorded!' : votingLoading ? 'Voting...' : 'Vote for Project'}
            </button>
          </div>

          {/* Team Members */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-slate-300" />
              Team: {project.team.name}
            </h3>

            <div className="space-y-2 pt-1">
              {project.team.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-800 last:border-0">
                  <span className="font-semibold text-slate-200">{member.user.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
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
