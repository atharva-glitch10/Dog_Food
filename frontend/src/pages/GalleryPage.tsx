import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { Project, Track, Event } from '../types/index.ts';
import { Search, Filter, ThumbsUp, Github, ExternalLink, Sparkles, Layers } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.tsx';
import { useToast } from '../components/ui/Toast.tsx';

export const GalleryPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'title' | 'date' | 'randomized'>('date');
  const [loading, setLoading] = useState(true);
  const [votedProjects, setVotedProjects] = useState<Set<string>>(new Set());
  const [votingLoading, setVotingLoading] = useState<string | null>(null);

  // Load event info and tracks
  useEffect(() => {
    if (eventSlug) {
      api.get(`/events/${eventSlug}`).then((res: any) => {
        if (res.success) {
          setEvent(res.data);
          setTracks(res.data.tracks || []);
        }
      });
    }
  }, [eventSlug]);

  // Load gallery projects
  const fetchGallery = () => {
    if (!event) return;
    setLoading(true);
    const params: any = {
      search: searchQuery || undefined,
      trackId: selectedTrack || undefined,
      sort: sortOrder,
    };

    api.get(`/events/${event.id}/gallery`, { params })
      .then((res: any) => {
        if (res.success && res.data) {
          setProjects(res.data.projects);
        }
      })
      .catch((err) => console.error('Gallery load failed', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (event) {
      fetchGallery();
      // Also fetch user's cast votes if logged in
      api.get(`/events/${event.id}/vote/my-votes`)
        .then((res: any) => {
          if (res.success && res.data) {
            setVotedProjects(new Set(res.data.map((v: any) => v.projectId)));
          }
        })
        .catch(() => {});
    }
  }, [event, selectedTrack, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGallery();
  };

  const handleVote = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!event) return;
    setVotingLoading(projectId);
    try {
      await api.post(`/events/${event.id}/vote/${projectId}`);
      setVotedProjects((prev) => new Set(prev).add(projectId));
      toastSuccess('Your vote has been recorded!');
      fetchGallery();
    } catch (err: any) {
      toastError(err.message || 'Failed to record vote');
    } finally {
      setVotingLoading(null);
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-violet-400" />
            Project Gallery
          </h1>
          <p className="text-sm text-slate-400">
            Browse, test, and vote on submitted projects for {event?.name || 'the event'}.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, stack, or keywords..."
            className="input-field pl-10"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="input-field py-2 text-xs"
          >
            <option value="">All Tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="input-field py-2 text-xs"
          >
            <option value="date">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="randomized">Fair Random Shuffle</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading gallery submissions...</div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl text-slate-400 space-y-2">
          <p className="text-lg font-bold text-slate-300">No submitted projects match your query.</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const hasVoted = votedProjects.has(project.id);
            return (
              <div
                key={project.id}
                className="glass-card-hover rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Track pill & Status */}
                  <div className="flex items-center justify-between">
                    {project.track ? (
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${project.track.colorHex}20`,
                          color: project.track.colorHex,
                          border: `1px solid ${project.track.colorHex}40`,
                        }}
                      >
                        {project.track.name}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        General
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {project.team.name}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-white hover:text-violet-400 transition-colors">
                      <Link to={`/project/${project.id}`}>{project.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {project.tagline || project.problemStatement}
                    </p>
                  </div>

                  {/* Tech Stack tags */}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.slice(0, 4).map((tech, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800">
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-500 rounded">
                          +{project.technologies.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-3.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {project.repoUrl && (
                      <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white" title="Repository">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {project.demoUrl && (
                      <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white" title="Live Demo">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleVote(project.id, e)}
                      disabled={hasVoted || votingLoading === project.id}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        hasVoted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/30'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {hasVoted ? 'Voted' : votingLoading === project.id ? 'Voting...' : 'Vote'}
                    </button>
                    <Link to={`/project/${project.id}`} className="btn-secondary py-1 px-2.5 text-xs">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
