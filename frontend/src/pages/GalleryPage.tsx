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
          if (res.success && Array.isArray(res.data)) {
            const votedSet = new Set<string>(res.data.map((v: any) => v.projectId));
            setVotedProjects(votedSet);
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
    e.stopPropagation();
    if (!event) return;

    setVotingLoading(projectId);
    try {
      const res: any = await api.post(`/events/${event.id}/vote`, { projectId });
      if (res.success) {
        setVotedProjects((prev) => new Set([...prev, projectId]));
        toastSuccess('Your community vote has been recorded!');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to submit vote');
    } finally {
      setVotingLoading(null);
    }
  };

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 badge-signal text-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Project Showcase</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Submission Gallery
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse, explore, and support projects built for {event?.name || 'the hackathon'}.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="console-panel p-4 flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, technologies, or keywords..."
            className="input-field pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="input-field py-2 text-xs font-semibold"
          >
            <option value="">All Tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="input-field py-2 text-xs font-semibold"
          >
            <option value="date">Newest First</option>
            <option value="title">Alphabetical (A-Z)</option>
            <option value="randomized">Fair Random Shuffle</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading gallery submissions...</div>
      ) : projects.length === 0 ? (
        <div className="console-panel p-12 text-center text-slate-500 space-y-2">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No submitted projects match your filters.</p>
          <p className="text-xs text-slate-400">Try adjusting your search terms or selecting another track.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const hasVoted = votedProjects.has(project.id);
            return (
              <div
                key={project.id}
                className="console-panel flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Track pill & Status */}
                  <div className="flex items-center justify-between">
                    {project.track ? (
                      <span className="badge-signal text-xs">
                        {project.track.name}
                      </span>
                    ) : (
                      <span className="badge-mono text-xs">
                        General Track
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Team: <strong className="text-slate-700 dark:text-slate-300">{project.team.name}</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      <Link to={`/project/${project.id}`}>{project.title}</Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {project.tagline || project.problemStatement}
                    </p>
                  </div>

                  {/* Tech Stack tags */}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {project.technologies.slice(0, 4).map((tech, idx) => (
                        <span key={idx} className="badge-mono text-[11px]">
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 4 && (
                        <span className="badge-mono text-[11px]">
                          +{project.technologies.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {project.repoUrl && (
                      <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="Repository">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {project.demoUrl && (
                      <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Live Demo">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleVote(project.id, e)}
                      disabled={hasVoted || votingLoading === project.id}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        hasVoted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'btn-primary !py-1.5 !px-3 shadow-xs'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{hasVoted ? 'Voted' : votingLoading === project.id ? 'Voting...' : 'Vote'}</span>
                    </button>
                    <Link to={`/project/${project.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">
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
