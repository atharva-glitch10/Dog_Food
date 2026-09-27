import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Webhook, Trash2, Plus, CheckCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import api from '../../services/api.ts';
import { useToast } from '../ui/Toast.tsx';

interface Delivery {
  id: string;
  event: string;
  statusCode: number | null;
  attempts: number;
  deliveredAt: string | null;
}

interface Subscription {
  id: string;
  targetUrl: string;
  secret: string;
  events: string[];
  isActive: boolean;
  deliveries: Delivery[];
}

function deliveryStatus(code: number | null): { label: string; ok: boolean } {
  if (code === null) return { label: 'Pending', ok: false };
  if (code === 0) return { label: 'Network error', ok: false };
  if (code === 408) return { label: '408 Timeout', ok: false };
  return { label: String(code), ok: code >= 200 && code < 300 };
}

export const WebhooksPanel: React.FC<{ eventId: string }> = ({ eventId }) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const subsQuery = useQuery({
    queryKey: ['webhooks', eventId],
    queryFn: async () => ((await api.get(`/events/${eventId}/webhooks`)) as any).data as Subscription[],
  });

  const typesQuery = useQuery({
    queryKey: ['webhook-event-types'],
    queryFn: async () => ((await api.get('/webhooks/event-types')) as any).data as string[],
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      ((await api.post(`/events/${eventId}/webhooks`, { targetUrl, events: selectedEvents })) as any).data as Subscription,
    onSuccess: (sub) => {
      setNewSecret(sub.secret);
      setTargetUrl('');
      setSelectedEvents([]);
      toastSuccess('Webhook subscription created.');
      queryClient.invalidateQueries({ queryKey: ['webhooks', eventId] });
    },
    onError: (err: any) => {
      const detail = err?.details?.[0]?.message;
      toastError(detail ? `${err.message}: ${detail}` : err?.message || 'Could not create webhook.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => {
      toastSuccess('Webhook subscription deleted.');
      queryClient.invalidateQueries({ queryKey: ['webhooks', eventId] });
    },
    onError: (err: any) => toastError(err?.message || 'Could not delete webhook.'),
  });

  const toggleEvent = (name: string) =>
    setSelectedEvents((prev) => (prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl || selectedEvents.length === 0) return;
    createMutation.mutate();
  };

  const handleDelete = (sub: Subscription) => {
    if (window.confirm(`Delete the webhook for ${sub.targetUrl}? Its delivery log is removed too.`)) {
      deleteMutation.mutate(sub.id);
    }
  };

  const subscriptions = subsQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Create */}
      <form onSubmit={handleCreate} className="console-panel p-6 sm:p-7 space-y-4 lg:col-span-2 h-fit">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" />
          <span>New Webhook</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Each delivery is an HTTP POST signed with HMAC-SHA256 in the <code className="font-mono">X-Dogfood-Signature</code> header.
          Private, loopback and cloud-metadata addresses are rejected.
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target URL</span>
          <input
            type="url"
            required
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com/dogfood-hook"
            className="input-field"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Events</legend>
          {typesQuery.isLoading && <p className="text-xs text-slate-400">Loading event types...</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(typesQuery.data ?? []).map((name) => (
              <label key={name} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(name)}
                  onChange={() => toggleEvent(name)}
                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-mono">{name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={createMutation.isPending || !targetUrl || selectedEvents.length === 0}
          className="btn-primary w-full"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
        </button>

        {newSecret && (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 space-y-2">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Signing secret (shown once — store it now):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all text-slate-800 dark:text-slate-100">{newSecret}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(newSecret).then(() => toastSuccess('Secret copied.'))}
                className="btn-outline !px-2.5 !py-1.5"
                title="Copy secret"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </form>

      {/* List + delivery logs */}
      <div className="console-panel p-6 sm:p-7 space-y-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-500" />
            <span>Subscriptions</span>
          </h3>
          <button
            type="button"
            onClick={() => subsQuery.refetch()}
            className="btn-outline !px-3 !py-1.5 text-xs"
            disabled={subsQuery.isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${subsQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {subsQuery.isLoading && <p className="text-sm text-slate-400">Loading webhooks...</p>}
        {subsQuery.isError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{(subsQuery.error as any)?.message || 'Could not load webhooks.'}</p>
        )}
        {!subsQuery.isLoading && subscriptions.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No webhook subscriptions for this event yet.</p>
        )}

        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono break-all">{sub.targetUrl}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.isActive ? (
                      <span className="badge-mint">Active</span>
                    ) : (
                      <span className="badge-amber">Disabled after repeated failures</span>
                    )}
                    {sub.events.map((ev) => (
                      <span key={ev} className="badge-mono font-mono">{ev}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Secret: <span className="font-mono">{sub.secret}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(sub)}
                  disabled={deleteMutation.isPending}
                  className="btn-danger !px-3 !py-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Delivered</th>
                      <th className="py-2 px-3">Event</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sub.deliveries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-slate-400">No deliveries yet.</td>
                      </tr>
                    )}
                    {sub.deliveries.map((d) => {
                      const status = deliveryStatus(d.statusCode);
                      return (
                        <tr key={d.id}>
                          <td className="py-2 px-3 text-slate-500">
                            {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">{d.event}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                status.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {status.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400">Showing the 10 most recent deliveries.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
