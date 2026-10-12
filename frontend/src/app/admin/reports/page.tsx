"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  RotateCw, 
  ArrowRight,
  Info,
  Building2,
  Users
} from 'lucide-react';

interface SurveyStats {
  total_surveys: number;
  by_community: {
    community_name: string;
    count: number;
  }[];
}

interface SurveyList {
  id: string;
  student_email: string;
  community_name: string;
  group_number: number;
  submitted_at: string;
  status: string;
  type: string;
}

export default function AdminReportsPage() {
  const { user, token } = useAdminAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [surveys, setSurveys] = useState<SurveyList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    setLoading(true);
    setError('');
    try {
      const opts = { headers: { Authorization: `Bearer ${activeToken}` } };
      const [surveysRes, statsRes] = await Promise.all([
        api.get('/api/admin/surveys', opts),
        api.get('/api/admin/surveys/stats', opts)
      ]);
      setSurveys(surveysRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch reports data', err);
      setError(getErrorMessage(err, 'Failed to fetch aggregate survey analytics.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [user, token, router]);

  const totalCommunities = stats?.by_community?.length || 0;
  const avgPerCommunity = totalCommunities > 0 && stats?.total_surveys 
    ? (stats.total_surveys / totalCommunities).toFixed(1) 
    : '0';

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-primary">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Survey Analytics & Field Intelligence
            </h1>
          </div>
          <p className="text-secondary text-sm mt-1">
            Aggregated cross-community submission ratios and fieldwork progress indicators.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-primary bg-surface border border-border-strong rounded-lg hover:bg-page transition-colors shadow-xs disabled:opacity-50 font-semibold"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#093C22]' : 'text-secondary'}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <Link
            href="/admin/exports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#093C22] hover:bg-[#0c512e] rounded-lg transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Data Exports
          </Link>
        </div>
      </div>

      {/* Institutional Navigation Notice */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start justify-between gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#093C22] shrink-0 mt-0.5" />
          <p className="text-secondary leading-relaxed">
            <strong className="text-primary font-bold">System Notice:</strong> Administrative reporting is organized under two primary hubs. 
            For raw data spreadsheets, navigate to <Link href="/admin/exports" className="font-bold text-[#093C22] underline">Data Exports</Link>. 
            To inspect and verify individual student submissions, visit <Link href="/admin/surveys" className="font-bold text-[#093C22] underline">Fieldwork Submissions</Link>.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-surface rounded-xl border border-border-strong p-20 text-center text-muted shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-[#093C22] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Aggregating fieldwork surveys and analytics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions by Community Progress Chart (1 Col) */}
          <div className="lg:col-span-1 bg-surface rounded-xl border border-border-strong overflow-hidden flex flex-col shadow-xs">
            <div className="p-5 border-b border-border bg-page/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-primary">Submissions by Community</h2>
                <p className="text-xs text-secondary mt-0.5">Distribution across assigned locations</p>
              </div>
              <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#093C22] border border-emerald-200">
                {totalCommunities} Areas
              </span>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {stats?.by_community?.length ? (
                stats.by_community.map((c) => {
                  const percentage = Math.round((c.count / Math.max(stats.total_surveys, 1)) * 100);
                  return (
                    <div key={c.community_name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary truncate max-w-[180px]" title={c.community_name}>
                          {c.community_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary">{c.count}</span>
                          <span className="text-muted text-2xs">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-page rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-[#093C22] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted text-xs">
                  No community submissions recorded yet.
                </div>
              )}
            </div>

            <div className="p-4 bg-page/60 border-t border-border text-center">
              <Link
                href="/admin/surveys"
                className="text-xs font-semibold text-[#093C22] hover:underline"
              >
                Inspect all surveys
              </Link>
            </div>
          </div>

          {/* Recent Submissions Table (2 Cols) */}
          <div className="lg:col-span-2 bg-surface rounded-xl border border-border-strong overflow-hidden flex flex-col shadow-xs">
            <div className="p-5 border-b border-border bg-page/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-primary">Recent Field Submissions</h2>
                <p className="text-xs text-secondary mt-0.5">Chronological record of submitted student surveys</p>
              </div>
              <span className="text-2xs text-secondary font-mono">
                Showing top {Math.min(surveys.length, 15)} records
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {surveys.length === 0 ? (
                <div className="text-center py-16 text-muted text-xs">
                  No survey responses found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-page/60 border-b border-border text-secondary font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student Account</th>
                      <th className="py-3 px-4">Community</th>
                      <th className="py-3 px-4">Survey Instrument</th>
                      <th className="py-3 px-4 w-24">Status</th>
                      <th className="py-3 px-4 w-32">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-secondary">
                    {surveys.slice(0, 15).map((s) => (
                      <tr key={s.id} className="hover:bg-page transition-colors">
                        <td className="py-3 px-4 font-semibold text-primary">
                          {s.student_email || '—'}
                        </td>
                        <td className="py-3 px-4 text-secondary font-medium">
                          {s.community_name}
                        </td>
                        <td className="py-3 px-4 text-secondary">
                          <span className="font-mono text-2xs bg-page px-2 py-0.5 rounded-md border border-border text-secondary">
                            {s.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold bg-emerald-50 text-[#093C22] border border-emerald-200 capitalize">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted whitespace-nowrap font-mono text-2xs">
                          {new Date(s.submitted_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-page/60 border-t border-border flex items-center justify-between text-xs">
              <span className="text-secondary">
                Total submissions logged: <strong className="text-primary">{surveys.length}</strong>
              </span>
              <Link
                href="/admin/surveys"
                className="font-semibold text-[#093C22] hover:underline"
              >
                View full survey directory
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}