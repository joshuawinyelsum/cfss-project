"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { Activity, Clock, Shield, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface AuditLog {
  id: number;
  action: string;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata_payload?: Record<string, any> | null;
  trace_id?: string | null;
  timestamp?: string | null;
}

export default function AdminActivityPage() {
  const { user, token } = useAdminAuthStore();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/admin/activity', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setLogs(res.data);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to load activity logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchLogs();
  }, [user, router, token]);

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.metadata_payload && JSON.stringify(log.metadata_payload).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const formatMetadata = (meta?: Record<string, any> | null) => {
    if (!meta) return '—';
    const entries = Object.entries(meta);
    if (entries.length === 0) return '—';
    return entries.map(([key, value]) => {
      const cleanKey = key.replace(/_/g, ' ');
      const cleanVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${cleanKey}: ${cleanVal}`;
    }).join(' • ');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-200';
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('AUTH') || action.includes('LOGIN')) return 'bg-slate-100 text-slate-800 border-slate-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-slate-600" />
            Activity Logs
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Institutional audit trail of administrative operations, reassignments, and system updates.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by action, actor, IP address, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-slate-50 border-slate-200"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter by action type"
          className="w-full sm:w-56 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="ALL">All Action Types</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <div className="inline-block w-7 h-7 border-3 border-cfss-green border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Loading activity audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No activity records match the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold w-40">Timestamp</th>
                  <th className="py-3 px-4 font-semibold w-52">Action Event</th>
                  <th className="py-3 px-4 font-semibold w-32">Actor</th>
                  <th className="py-3 px-4 font-semibold">Event Details</th>
                  <th className="py-3 px-4 font-semibold w-32">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredLogs.map((log) => {
                  const dateStr = log.timestamp
                    ? new Date(log.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : '—';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.user_id ? `User #${log.user_id}` : 'System'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={formatMetadata(log.metadata_payload)}>
                        {formatMetadata(log.metadata_payload)}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

