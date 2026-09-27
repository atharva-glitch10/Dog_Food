import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api.ts';
import { useToast } from '../components/ui/Toast.tsx';
import {
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
  Cpu,
  Webhook,
  Upload,
} from 'lucide-react';
import { WebhooksPanel } from '../components/organizer/WebhooksPanel.tsx';
import { BulkImportPanel } from '../components/organizer/BulkImportPanel.tsx';

export const OrganizerDashboardPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { success: toastSuccess, error: toastError } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'normalization' | 'assignments' | 'exports' | 'webhooks' | 'import' | 'audit'
  >('overview');
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
    const confirm = window.confirm(
      'Publishing final results will freeze active scoring and make normalized rankings publicly visible on the Leaderboard. Proceed?'
    );
    if (!confirm) return;

    try {
      const res: any = await api.post(`/events/${event.id}/results/publish`);
      if (res.success) {
        toastSuccess('Official event results published successfully!');
        loadAll();
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to publish results');
    }
  };

  const handleGenerateCertificates = async (type: 'PARTICIPANT' | 'JUDGE' | 'WINNER') => {
    if (!event) return;
    try {
      const res: any = await api.post(`/events/${event.id}/certificates/generate`, { type });
      if (res.success) {
        const issuedCount = res.data.certificates?.length ?? 0;
        setCertMsg(`Generated ${issuedCount} cryptographic certificates (${type}).`);
        toastSuccess(`Successfully issued ${issuedCount} certificates`);
      }
    } catch (err: any) {
      toastError(err.message || 'Certificate generation failed');
    }
  };

  const fetchAuditLogs = async () => {
    if (!event) return;
    try {
      const res: any = await api.get(`/events/${event.id}/audit-logs`, { params: { limit: 100 } });
      if (res.success) {
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

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">Loading organizer dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 badge-signal text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Organizer Management Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {event?.name?.replace(/—/g, ':')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePublishResults}
            className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2 shadow-soft font-semibold"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Publish Final Results</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Unstop-inspired rounded pill navigation) */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold">
        {[
          { id: 'overview', label: 'Overview & Stats', icon: Layers },
          { id: 'assignments', label: 'Jury Assignment', icon: Shield },
          { id: 'normalization', label: 'Score Normalization', icon: Cpu },
          { id: 'exports', label: 'CSV Exports & Certs', icon: Download },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          { id: 'import', label: 'Bulk Import', icon: Upload },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 rounded-full flex items-center gap-2 transition-all whitespace-nowrap ${
                isCurrent
                  ? 'bg-indigo-50 border border-indigo-200/90 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800/60 dark:text-indigo-300 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4-Column Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-strip-card space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Total Projects
              </span>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.totalProjects || 0}</p>
              <span className="badge-cyan text-xs">Active Submissions</span>
            </div>

            <div className="stat-strip-card space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Jury Members
              </span>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats?.totalJudges || 0}</p>
              <span className="badge-mono text-xs">Active Judges</span>
            </div>

            <div className="stat-strip-card space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Evaluations Done
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats?.completedEvaluations || 0} <span className="text-xs text-slate-400 font-normal">/ {stats?.totalAssignments || 0}</span>
              </p>
              <span className="badge-mint text-xs">Completed Scores</span>
            </div>

            <div className="stat-strip-card space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Completion Rate
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats?.completionRate || 0}%</p>
              <span className="badge-signal text-xs">Jury Progress</span>
            </div>
          </div>

          <div className="console-panel p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Event Schedule & Deadlines
              </h3>
              <span className="badge-mint text-xs capitalize">{event?.status?.toLowerCase().replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Submissions deadline: <span className="font-semibold text-slate-900 dark:text-white">{new Date(event?.submissionDeadline).toLocaleString()}</span>. Judging conclusion: <span className="font-semibold text-slate-900 dark:text-white">{new Date(event?.judgingDeadline).toLocaleString()}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Deterministic Assignment */}
      {activeTab === 'assignments' && (
        <div className="console-panel p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              <span>Deterministic Mulberry32 Judge Assignment Engine</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Balanced round-robin assignment with automatic conflict-of-interest exclusion and capacity enforcement.
            </p>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
            <div className="space-y-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">Random PRNG Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value, 10))}
                className="input-field w-32"
              />
            </div>

            <button
              onClick={handleRunAutoAssign}
              disabled={assignLoading}
              className="btn-primary text-sm py-2.5 px-6 font-semibold flex items-center gap-2 mt-4 sm:mt-auto shadow-soft"
            >
              <RefreshCw className={`w-4 h-4 ${assignLoading ? 'animate-spin' : ''}`} />
              <span>{assignLoading ? 'Generating Assignments...' : 'Run Auto Assignment Engine'}</span>
            </button>
          </div>

          {assignResult && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Successfully generated {assignResult.totalAssignments} project assignments (Seed: {assignResult.seedUsed}).</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                {assignResult.judgeWorkloads.map((jw: any) => (
                  <div key={jw.judgeId} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">{jw.name}</span>
                      <span className="text-slate-500 text-xs">{jw.email}</span>
                    </div>
                    <span className="badge-signal text-xs font-bold">
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
          <div className="console-panel p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-500" />
                  <span>Cross-Judge Score Normalization Pipeline</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Calculates per-judge mean and standard deviation, applying Bayesian prior shrinkage for fair rankings.
                </p>
              </div>

              <button
                onClick={handleRunNormalization}
                disabled={normLoading}
                className="btn-primary text-sm py-2.5 px-6 font-semibold flex items-center gap-2 shadow-soft shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${normLoading ? 'animate-spin' : ''}`} />
                <span>{normLoading ? 'Normalizing...' : 'Calculate Normalization'}</span>
              </button>
            </div>

            {normResult && (
              <div className="space-y-6 pt-2">
                {/* Global stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-xs">Total Evaluations</span>
                    <strong className="text-lg text-slate-900 dark:text-white font-bold">{normResult.globalStats.totalEvaluations}</strong>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-xs">Global Mean Score</span>
                    <strong className="text-lg text-slate-900 dark:text-white font-bold">{normResult.globalStats.globalMean}</strong>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-xs">Global Standard Deviation</span>
                    <strong className="text-lg text-slate-900 dark:text-white font-bold">{normResult.globalStats.globalStdDev}</strong>
                  </div>
                </div>

                {/* Rankings Table */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Normalized Rankings Table</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Project</th>
                          <th className="py-3 px-4">Team</th>
                          <th className="py-3 px-4">Track</th>
                          <th className="py-3 px-4">Normalized Score</th>
                          <th className="py-3 px-4">Raw Score</th>
                          <th className="py-3 px-4">Evaluations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {normResult.rankings.map((r: any) => (
                          <tr key={r.projectId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-bold text-amber-500">#{r.finalRank}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{r.title}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.teamName}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.trackName || 'General'}</td>
                            <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{r.normalizedScore}</td>
                            <td className="py-3 px-4 text-slate-500">{r.rawScore}</td>
                            <td className="py-3 px-4 text-slate-500">{r.evaluationsCount}</td>
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
          <div className="console-panel p-6 sm:p-7 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              <span>RFC 4180 CSV Data Exports</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Download clean comma-separated exports for offline records and external reporting.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
              <a href={`${API_BASE_URL}/events/${event.id}/export/participants.csv`} download className="btn-secondary !py-2.5 !px-3 text-center">
                Participants CSV
              </a>
              <a href={`${API_BASE_URL}/events/${event.id}/export/teams.csv`} download className="btn-secondary !py-2.5 !px-3 text-center">
                Teams CSV
              </a>
              <a href={`${API_BASE_URL}/events/${event.id}/export/projects.csv`} download className="btn-secondary !py-2.5 !px-3 text-center">
                Projects CSV
              </a>
              <a href={`${API_BASE_URL}/events/${event.id}/export/scores.csv`} download className="btn-secondary !py-2.5 !px-3 text-center">
                Scores CSV
              </a>
              <a href={`${API_BASE_URL}/events/${event.id}/export/results.csv`} download className="btn-primary !py-2.5 !px-3 text-center col-span-2 shadow-soft">
                Official Final Results CSV
              </a>
            </div>
          </div>

          {/* Certificates Generation */}
          <div className="console-panel p-6 sm:p-7 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-500" />
              <span>HMAC Signed Certificates</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Generate tamper-evident, cryptographically verifiable certificates with verification codes.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleGenerateCertificates('PARTICIPANT')}
                className="btn-secondary w-full !py-2.5 text-xs font-semibold"
              >
                Issue Participant Certificates
              </button>
              <button
                onClick={() => handleGenerateCertificates('JUDGE')}
                className="btn-secondary w-full !py-2.5 text-xs font-semibold"
              >
                Issue Judge Certificates
              </button>
              <button
                onClick={() => handleGenerateCertificates('WINNER')}
                className="btn-primary w-full !py-2.5 text-xs font-semibold shadow-soft"
              >
                Issue Winner Certificates (Top 3)
              </button>
            </div>

            {certMsg && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 font-medium">
                {certMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Webhooks */}
      {activeTab === 'webhooks' && event && <WebhooksPanel eventId={event.id} />}

      {/* Tab: Bulk CSV Import */}
      {activeTab === 'import' && event && <BulkImportPanel eventId={event.id} />}

      {/* Tab: Audit Trails */}
      {activeTab === 'audit' && (
        <div className="console-panel p-6 sm:p-8 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              <span>Immutable Audit Log Records</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Full chronological log of mutations and security events.
            </p>
          </div>

          <div className="overflow-x-auto pt-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{log.user?.name || 'System / Anon'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{log.entityType} ({log.entityId || 'N/A'})</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.ipAddress || '—'}</td>
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
