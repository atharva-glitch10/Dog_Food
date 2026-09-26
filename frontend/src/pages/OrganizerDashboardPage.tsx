import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { useToast } from '../components/ui/Toast.tsx';
import {
  Terminal,
  Cpu,
  Trophy,
  Download,
  Users,
  Shield,
  FileCheck,
  Award,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  History,
} from 'lucide-react';

export const OrganizerDashboardPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { success: toastSuccess, error: toastError } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'normalization' | 'assignments' | 'exports' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);

  // Auto assignment state
  const [seed, setSeed] = useState<number>(42);
  const [assignResult, setAssignResult] = useState<any>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Normalization state
  const [normResult, setNormResult] = useState<any>(null);
  const [normLoading, setNormLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Batch certs state
  const [certMsg, setCertMsg] = useState<string | null>(null);

  const loadAll = async () => {
    if (!eventSlug) return;
    try {
      const eventRes: any = await api.get(`/events/${eventSlug}`);
      if (eventRes.success) {
        setEvent(eventRes.data);
        const statsRes: any = await api.get(`/events/${eventRes.data.id}/judging/stats`);
        if (statsRes.success) {
          setStats(statsRes.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [eventSlug]);

  const handleRunAutoAssign = async () => {
    if (!event) return;
    setAssignLoading(true);
    try {
      const res: any = await api.post(`/events/${event.id}/judges/assign/auto`, { seed: Number(seed) });
      if (res.success) {
        setAssignResult(res.data);
        toastSuccess(`Auto-assigned ${res.data.totalAssignments} projects (seed: ${res.data.seedUsed}).`);
        loadAll();
      }
    } catch (err: any) {
      toastError(err.message || 'Auto assignment failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRunNormalization = async () => {
    if (!event) return;
    setNormLoading(true);
    try {
      const res: any = await api.post(`/events/${event.id}/judging/normalize`);
      if (res.success) {
        setNormResult(res.data);
        toastSuccess('Score normalization complete. Rankings have been updated.');
        loadAll();
      }
    } catch (err: any) {
      toastError(err.message || 'Score normalization failed');
    } finally {
      setNormLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!event) return;
    if (!confirm('Are you sure you want to publish the official rankings and results to the public?')) return;
    try {
      await api.post(`/events/${event.id}/results/publish`);
      loadAll();
      toastSuccess('Results have been officially published!');
    } catch (err: any) {
      toastError(err.message || 'Publishing failed');
    }
  };

  const handleGenerateCertificates = async (type: string) => {
    if (!event) return;
    try {
      const res: any = await api.post(`/events/${event.id}/certificates/generate`, { type });
      setCertMsg(res.data.message);
      toastSuccess(res.data.message || `${type} certificates generated.`);
    } catch (err: any) {
      toastError(err.message || 'Certificate generation failed');
    }
  };

  const fetchAuditLogs = async () => {
    if (!event) return;
    try {
      const res: any = await api.get(`/events/${event.id}/audit-logs`);
      if (res.success && res.data) {
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading organizer dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            Organizer Command Hub
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{event?.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePublishResults}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-violet-600/30"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Publish Official Results
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Overview & Progress
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'assignments'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" /> Judge Assignment Engine
        </button>
        <button
          onClick={() => setActiveTab('normalization')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'normalization'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" /> Score Normalization & Ranks
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'exports'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" /> CSV Exports & Certs
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-violet-500 text-violet-400 bg-violet-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Audit Trails
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Submitted Projects</span>
              <p className="text-2xl font-black text-white">{stats?.totalProjects || 0}</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Enlisted Judges</span>
              <p className="text-2xl font-black text-purple-400">{stats?.totalJudges || 0}</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Evaluations Completed</span>
              <p className="text-2xl font-black text-emerald-400">{stats?.completedEvaluations || 0} / {stats?.totalAssignments || 0}</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Completion Rate</span>
              <p className="text-2xl font-black text-violet-400">{stats?.completionRate || 0}%</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Event Lifecycle Status</h3>
            <p className="text-xs text-slate-300">
              Current state is <strong className="text-violet-400 font-mono">{event.status}</strong>.
              Submissions due on {new Date(event.submissionDeadline).toLocaleString()}, judging closes on {new Date(event.judgingDeadline).toLocaleString()}.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Deterministic Assignment */}
      {activeTab === 'assignments' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              Deterministic Mulberry32 Judge Assignment Engine
            </h2>
            <p className="text-xs text-slate-400">
              Greedy load-balancing matching algorithm with self-conflict exclusion and capacity bounds.
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-300 block">PRNG Integer Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                className="input-field w-32 font-mono text-xs"
              />
            </div>

            <button
              onClick={handleRunAutoAssign}
              disabled={assignLoading}
              className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 mt-4 sm:mt-auto"
            >
              <RefreshCw className={`w-4 h-4 ${assignLoading ? 'animate-spin' : ''}`} />
              {assignLoading ? 'Computing Assignments...' : 'Run Auto Assignment Engine'}
            </button>
          </div>

          {assignResult && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Successfully generated {assignResult.totalAssignments} project assignments (Seed: {assignResult.seedUsed}).</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {assignResult.judgeWorkloads.map((jw: any) => (
                  <div key={jw.judgeId} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-200 block">{jw.name}</span>
                      <span className="text-slate-500 text-[11px]">{jw.email}</span>
                    </div>
                    <span className="font-mono font-bold text-violet-400">
                      {jw.assignedCount} / {jw.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Normalization */}
      {activeTab === 'normalization' && (
        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-violet-400" />
                  Cross-Judge Score Normalization Pipeline
                </h2>
                <p className="text-xs text-slate-400">
                  Calculates per-judge mean and standard deviation, applying Bayesian prior shrinkage for small sample sizes.
                </p>
              </div>

              <button
                onClick={handleRunNormalization}
                disabled={normLoading}
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${normLoading ? 'animate-spin' : ''}`} />
                {normLoading ? 'Normalizing...' : 'Calculate Score Normalization'}
              </button>
            </div>

            {normResult && (
              <div className="space-y-6 pt-4 border-t border-slate-800">
                {/* Global stats */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Total Evaluations</span>
                    <strong className="text-base text-white">{normResult.globalStats.totalEvaluations}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Global Mean Score</span>
                    <strong className="text-base text-violet-400">{normResult.globalStats.globalMean}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Global Std Deviation</span>
                    <strong className="text-base text-indigo-400">{normResult.globalStats.globalStdDev}</strong>
                  </div>
                </div>

                {/* Rankings Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Normalized Rankings Table</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono">
                        <tr>
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Project</th>
                          <th className="py-2.5 px-3">Team</th>
                          <th className="py-2.5 px-3">Track</th>
                          <th className="py-2.5 px-3">Normalized Score</th>
                          <th className="py-2.5 px-3">Raw Score</th>
                          <th className="py-2.5 px-3">Evaluations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {normResult.rankings.map((r: any) => (
                          <tr key={r.projectId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-bold text-amber-400 font-mono">#{r.finalRank}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{r.title}</td>
                            <td className="py-2.5 px-3 text-slate-400">{r.teamName}</td>
                            <td className="py-2.5 px-3 text-slate-400">{r.trackName || 'General'}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-violet-400">{r.normalizedScore}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{r.rawScore}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{r.evaluationsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Exports & Certs */}
      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CSV Exports */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-violet-400" />
              RFC 4180 CSV Data Exports
            </h3>
            <p className="text-xs text-slate-400">Download sanitized data exports for offline record keeping.</p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <a href={`/api/events/${event.id}/export/participants.csv`} download className="btn-secondary py-2 px-3 text-center">
                Participants CSV
              </a>
              <a href={`/api/events/${event.id}/export/teams.csv`} download className="btn-secondary py-2 px-3 text-center">
                Teams CSV
              </a>
              <a href={`/api/events/${event.id}/export/projects.csv`} download className="btn-secondary py-2 px-3 text-center">
                Projects CSV
              </a>
              <a href={`/api/events/${event.id}/export/scores.csv`} download className="btn-secondary py-2 px-3 text-center">
                Scores CSV
              </a>
              <a href={`/api/events/${event.id}/export/results.csv`} download className="btn-primary py-2 px-3 text-center col-span-2">
                Official Final Results CSV
              </a>
            </div>
          </div>

          {/* Certificates Generation */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              HMAC Signed Certificates
            </h3>
            <p className="text-xs text-slate-400">Generate tamper-evident, cryptographically verifiable certificates.</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleGenerateCertificates('PARTICIPANT')}
                className="btn-secondary w-full py-2 text-xs"
              >
                Generate Participant Certificates
              </button>
              <button
                onClick={() => handleGenerateCertificates('JUDGE')}
                className="btn-secondary w-full py-2 text-xs"
              >
                Generate Judge Certificates
              </button>
              <button
                onClick={() => handleGenerateCertificates('WINNER')}
                className="btn-primary w-full py-2 text-xs"
              >
                Generate Winner Certificates (Top 3)
              </button>
            </div>

            {certMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                {certMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Audit Trails */}
      {activeTab === 'audit' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-violet-400" />
              Immutable Audit Log Records
            </h3>
            <p className="text-xs text-slate-400">Complete tamper-evident log of all mutations.</p>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3 font-semibold text-violet-400">{log.action}</td>
                    <td className="py-2 px-3 text-slate-300">{log.user?.name || 'System / Anon'}</td>
                    <td className="py-2 px-3 text-slate-400">{log.entityType} ({log.entityId || 'N/A'})</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
