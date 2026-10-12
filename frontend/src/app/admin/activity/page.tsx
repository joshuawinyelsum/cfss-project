"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { 
  History, 
  Search, 
  Filter, 
  RotateCw, 
  Eye, 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  Laptop 
} from 'lucide-react';

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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

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
    logs.forEach((l) => { if (l.action) set.add(l.action); });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.user_id && String(log.user_id).toLowerCase().includes(q)) ||
        (log.metadata_payload && JSON.stringify(log.metadata_payload).toLowerCase().includes(q)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(q));

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

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('REMOVE')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          {action}
        </span>
      );
    }
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('UPLOAD')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#093C22] border border-emerald-200">
          {action}
        </span>
      );
    }
    if (act.includes('REASSIGN') || act.includes('UPDATE') || act.includes('STATUS')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {action}
        </span>
      );
    }
    if (act.includes('SECURITY') || act.includes('PASSWORD') || act.includes('LOGIN')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-page text-secondary border border-border">
        {action}
      </span>
    );
  };

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.metadata_payload || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 text-primary animate-fade-in pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Activity Logs</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Institutional audit trail of administrative operations, student reassignments, and system configurations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-strong bg-surface text-xs font-semibold text-primary hover:bg-page disabled:opacity-50 transition-colors shadow-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#093C22]' : 'text-secondary'}`} />
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200 rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl border border-border-strong p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action, actor, IP, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:border-[#093C22] focus:bg-surface transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-page border border-border-strong rounded-lg text-secondary focus:outline-none focus:border-[#093C22] focus:bg-surface font-medium"
            >
              <option value="ALL">All action types</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {(searchTerm || actionFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setActionFilter('ALL'); }}
              className="text-xs text-secondary hover:text-primary underline font-medium"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-secondary text-xs font-medium">
          Showing <strong className="text-primary">{filteredLogs.length}</strong> recorded event{filteredLogs.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Main Activity Table */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center text-muted">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#093C22] mb-2" />
            Loading activity records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-muted">
            No activity records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-secondary bg-page/60 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-44 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 w-44 whitespace-nowrap">Action Type</th>
                  <th className="py-3 px-4 w-36 whitespace-nowrap">Actor</th>
                  <th className="py-3 px-4">Record Details / Payload Summary</th>
                  <th className="py-3 px-4 w-32 whitespace-nowrap">Client IP</th>
                  <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-secondary">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-page transition-colors">
                    <td className="py-3 px-4 text-secondary font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-page text-secondary border border-border">
                        {log.user_id ? (
                          <>
                            <UserCheck className="w-3 h-3 text-secondary" />
                            User #{log.user_id}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3 text-[#093C22]" />
                            Administrator
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary max-w-md truncate" title={formatMetadata(log.metadata_payload)}>
                      {formatMetadata(log.metadata_payload)}
                    </td>
                    <td className="py-3 px-4 text-muted font-mono text-[11px] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-muted" />
                        {log.ip_address || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-[#093C22] bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Inspection Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl max-w-xl w-full shadow-2xl border border-border-strong p-6 space-y-4 text-xs animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-primary">
                  Audit Event #{selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 bg-page/60 p-4 rounded-xl border border-border">
                <div>
                  <span className="text-secondary block text-[11px] font-medium">Action</span>
                  <span className="font-bold text-primary">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-secondary block text-[11px] font-medium">Actor</span>
                  <span className="text-primary font-semibold">
                    {selectedLog.user_id ? `User #${selectedLog.user_id}` : 'Administrator'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary block text-[11px] font-medium">Client IP</span>
                  <span className="font-mono text-secondary">{selectedLog.ip_address || '—'}</span>
                </div>
                <div>
                  <span className="text-secondary block text-[11px] font-medium">Timestamp</span>
                  <span className="font-mono text-secondary">
                    {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-secondary font-semibold text-xs">Metadata Payload</span>
                  <button
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1 text-[11px] text-secondary hover:text-primary bg-surface px-2.5 py-1 rounded-lg border border-border-strong hover:bg-page transition-colors font-medium shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[#093C22]" />
                        <span className="text-[#093C22] font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 bg-page/60 border border-border rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 text-primary leading-relaxed">
                  {JSON.stringify(selectedLog.metadata_payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-border-strong bg-surface text-primary hover:bg-page font-semibold text-xs transition-colors shadow-xs"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

