"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { BarChart3, FileText, Users, Globe } from 'lucide-react';

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
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [surveys, setSurveys] = useState<SurveyList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const opts = { headers: { Authorization: `Bearer ${token}` } };
        const [surveysRes, statsRes] = await Promise.all([
          api.get('/api/admin/surveys', opts),
          api.get('/api/admin/surveys/stats', opts)
        ]);
        setSurveys(surveysRes.data);
        setStats(statsRes.data);
      } catch (err: any) {
        console.error('Failed to fetch reports data', err);
        setError('Failed to fetch reports data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, router]);

  const communities = stats?.by_community?.length ? stats.by_community.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors">
            <BarChart3 className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Survey Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aggregate community survey statistics.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Surveys</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_surveys ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Communities</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{communities}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Survey Submissions</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{surveys.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Submissions by Community</h2>
              {stats?.by_community?.length ? (
                <div className="space-y-3">
                  {stats.by_community.map((c) => (
                    <div key={c.community_name} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 truncate">{c.community_name}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.round((c.count / Math.max(stats.total_surveys, 1)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No survey submissions yet.</p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Submissions</h2>
              {surveys.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                        <th className="py-2 pr-4 font-medium">Student</th>
                        <th className="py-2 pr-4 font-medium">Community</th>
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveys.slice(0, 20).map((s) => (
                        <tr key={s.id} className="border-b border-gray-100 dark:border-slate-700">
                          <td className="py-2 pr-4 text-gray-900 dark:text-white">{s.student_email || 'N/A'}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{s.community_name}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{s.type}</td>
                          <td className="py-2 pr-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 capitalize">
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-300">{new Date(s.submitted_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No surveys submitted yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}