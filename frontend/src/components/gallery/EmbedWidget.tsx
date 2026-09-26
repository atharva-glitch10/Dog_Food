import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api.ts';
import { Project, Track, Event } from '../../types/index.ts';
import { Search, ExternalLink, Github, Layers, Filter } from 'lucide-react';

export const EmbedWidget: React.FC = () => {
  const { eventId, eventSlug } = useParams<{ eventId?: string; eventSlug?: string }>();
  const targetId = eventId || eventSlug;

  const [event, setEvent] = useState<Event | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetId) {
      api.get(`/events/${targetId}`)
        .then((res: any) => {
          if (res.success && res.data) {
            setEvent(res.data);
            setTracks(res.data.tracks || []);
          }
        })
        .catch((err) => console.error('Failed to load event for embed', err));
    }
  }, [targetId]);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    const params: any = {
      search: searchQuery || undefined,
      trackId: selectedTrack || undefined,
      limit: 50,
    };

    api.get(`/events/${targetId}/gallery`, { params })
      .then((res: any) => {
        if (res.success && res.data) {
          setProjects(res.data.projects || []);
        }
      })
      .catch((err) => console.error('Failed to load embed gallery projects', err))
      .finally(() => setLoading(false));
  }, [targetId, selectedTrack, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 antialiased font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {event ? event.name : 'Hackathon Gallery'}
          </h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            {projects.length} submissions
          </span>
        </div>

        {/* Filter & Search controls */}
        <div className="flex items-center gap-2">
          {tracks.length > 0 && (
            <div className="relative">
              <select
                aria-label="Filter by track"
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Tracks</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of projects */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 bg-slate-900 border border-slate-800 rounded animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded bg-slate-900/30">
          <p className="text-sm text-slate-400">No project submissions found matching the criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-slate-900/70 border border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm line-clamp-1">
                    {proj.title}
                  </h3>
                  {proj.track && (
                    <span
                      className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 shrink-0"
                    >
                      {proj.track.name}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {proj.tagline || proj.problemStatement || 'No description provided.'}
                </p>

                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {proj.technologies.slice(0, 3).map((tech, i) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                    {proj.technologies.length > 3 && (
                      <span className="text-[10px] text-slate-500 py-0.5">
                        +{proj.technologies.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-slate-500 font-mono text-[11px]">
                  {proj.team?.name || 'Independent'}
                </span>

                <div className="flex items-center gap-2">
                  {proj.repoUrl && (
                    <a
                      href={proj.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Source Code"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {proj.demoUrl && (
                    <a
                      href={proj.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Live Demo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <a
                    href={`/project/${proj.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-1"
                  >
                    Details &rarr;
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed Footer */}
      <div className="mt-6 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
        <span>DOGFOOD Hackathon Gallery</span>
        {event && (
          <a
            href={`/gallery/${event.slug || event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-300 underline"
          >
            Open full portal
          </a>
        )}
      </div>
    </div>
  );
};
