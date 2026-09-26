import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api.ts';
import { Team, Event } from '../types/index.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { Users, Plus, UserPlus, Copy, Check, FileText, Send, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const TeamDashboardPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  // Team creation state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Join team state
  const [joinCode, setJoinCode] = useState('');

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    if (!eventSlug) return;
    try {
      const eventRes: any = await api.get(`/events/${eventSlug}`);
      if (eventRes.success) {
        setEvent(eventRes.data);
        const teamRes: any = await api.get(`/events/${eventRes.data.id}/teams/my-team`);
        if (teamRes.success) {
          setTeam(teamRes.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load team data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventSlug]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setActionError(null);
    try {
      const res: any = await api.post(`/events/${event.id}/teams`, {
        name: newTeamName,
        description: newTeamDesc,
      });
      if (res.success) {
        setTeam(res.data);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create team');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res: any = await api.post('/teams/join', {
        inviteCode: joinCode,
      });
      if (res.success) {
        setTeam(res.data);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to join team');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setActionError(null);
    try {
      const res: any = await api.post(`/teams/${team.id}/invites`, {
        email: inviteEmail,
      });
      if (res.success) {
        setInviteResult(`Invitation issued! Token: ${res.data.invitation.token}`);
        setInviteEmail('');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to send invite');
    }
  };

  const handleCopyCode = () => {
    if (team) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitProject = async () => {
    if (!team?.project) return;
    if (!confirm('Are you sure you want to submit your project? This will enter the evaluation pipeline.')) return;
    try {
      await api.post(`/projects/${team.project.id}/submit`);
      toastSuccess('Project submitted successfully! It has entered the evaluation pipeline.');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit project');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading team dashboard...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-slate-300" />
          Participant Dashboard: Team & Project
        </h1>
        <p className="text-sm text-slate-400">
          Event: <strong className="text-slate-200">{event?.name?.replace(/—/g, ':')}</strong>
        </p>
      </div>

      {actionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {!team ? (
        /* Not in a team view */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create a Team */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-lg space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-300" />
                Create New Team
              </h2>
              <p className="text-xs text-slate-400">Form a new team as Team Leader.</p>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Neural Nexus"
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="What is your team building?"
                  className="input-field"
                />
              </div>

              <button type="submit" className="btn-primary w-full py-2 text-sm font-semibold">
                Create Team
              </button>
            </form>
          </div>

          {/* Join a Team */}
          <div className="bg-slate-900 p-6 sm:p-8 rounded-lg border border-slate-800 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Join Existing Team
              </h2>
              <p className="text-xs text-slate-400">Enter a team invite code to join.</p>
            </div>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Team Invite Code</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NEXUS1"
                  className="input-field uppercase font-mono"
                />
              </div>

              <button type="submit" className="btn-secondary w-full py-2 text-sm font-semibold">
                Join Team
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Team Dashboard View */
        <div className="space-y-8">
          {/* Team Info Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-lg space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Team</span>
                <h2 className="text-xl font-bold text-white">{team.name}</h2>
                {team.description && <p className="text-xs text-slate-300">{team.description}</p>}
              </div>

              {/* Invite Code Badge */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-700">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Invite Code</span>
                  <span className="text-sm font-mono font-bold text-slate-200">{team.inviteCode}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="Copy Invite Code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Member Roster */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Roster</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {team.members.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-200 block">{m.user.name}</span>
                      <span className="text-xs text-slate-500">{m.user.email}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteMember} className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Teammate's email address..."
                className="input-field flex-1"
              />
              <button type="submit" className="btn-secondary whitespace-nowrap text-xs py-2 px-4">
                Send Invitation Token
              </button>
            </form>
            {inviteResult && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                {inviteResult}
              </p>
            )}
          </div>

          {/* Project Submission Status Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-lg space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-slate-300" />
                <div>
                  <h3 className="text-base font-bold text-white">Project Submission</h3>
                  <p className="text-xs text-slate-400">Manage your project draft, metadata, and final submission.</p>
                </div>
              </div>

              {team.project && (
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                  team.project.status === 'SUBMITTED' || team.project.status === 'FINALIZED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  Status: {team.project.status}
                </span>
              )}
            </div>

            {team.project ? (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">{team.project.title}</h4>
                  {team.project.tagline && <p className="text-sm text-slate-300">{team.project.tagline}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link to={`/submit/${event?.slug}`} className="btn-secondary text-xs py-2 px-4">
                    Edit Project Draft
                  </Link>

                  {team.project.status === 'DRAFT' && (
                    <button onClick={handleSubmitProject} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Submit Project (Before Deadline)
                    </button>
                  )}

                  {team.project.status !== 'DRAFT' && (
                    <Link to={`/project/${team.project.id}`} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
                      View Public Project Page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4 pt-4 border-t border-slate-800/80">
                <p className="text-sm text-slate-400">Your team has not created a project draft yet.</p>
                <Link to={`/submit/${event?.slug}`} className="btn-primary text-sm py-2 px-5 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project Submission
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
