"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  FileEdit, 
  Clock,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  Heart,
  Home,
  Book,
  Droplet,
  PlusSquare,
  CheckCircle,
  Cloud,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentDashboard() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [communityStats, setCommunityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(false);
      const opts = { headers: { Authorization: `Bearer ${token}` } };
      
      const [dashRes, commRes] = await Promise.all([
        api.get('/api/student/surveys/dashboard/stats', opts).catch(() => null),
        api.get('/api/student/community/stats', opts).catch(() => null)
      ]);
      
      if (dashRes?.data) setDashboardStats(dashRes.data);
      if (commRes?.data) setCommunityStats(commRes.data);
      
      if (!dashRes?.data) throw new Error("Failed to load dashboard stats");
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (!user) {
      api.get('/api/v2/students/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => useAuthStore.getState().setAuth(token, { ...res.data, role: 'student' }))
        .catch(() => { logout(); router.push('/login'); });
      return;
    }
    
    if (user.role !== 'student') {
      router.push('/login');
      return;
    }

    loadData();
    
    const interval = setInterval(loadData, 30000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, token, router, logout, loadData]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.full_name}</h1>
        {loading && <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />}
      </div>

      {error ? (
        <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="text-red-800 font-medium">Unable to load dashboard data</h3>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            
            {/* Total Surveys */}
            <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Surveys</p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{dashboardStats?.total_surveys || 0}</h3>
                </div>
              </div>
            </div>

            {/* Drafts */}
            <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                  <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Drafts</p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{dashboardStats?.draft_surveys || 0}</h3>
                </div>
              </div>
            </div>

            {/* Submitted */}
            <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Submitted</p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{dashboardStats?.submitted_surveys || 0}</h3>
                </div>
              </div>
            </div>

            {/* Pending Sync */}
            <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Pending Sync</p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{dashboardStats?.pending_sync || 0}</h3>
                </div>
              </div>
            </div>

            {/* Synced */}
            <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Synced</p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{dashboardStats?.synced_surveys || 0}</h3>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              
              <Link href="/surveys/household" className="bg-white p-4 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center hover:border-emerald-200 transition-colors group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 sm:mb-0 sm:mr-4 group-hover:bg-emerald-100 transition-colors shrink-0">
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">Household Survey</h3>
                  <p className="text-[10px] sm:text-sm text-gray-500 mt-1">Collect household info</p>
                </div>
                <ChevronRight className="hidden sm:block text-gray-400 group-hover:text-emerald-500 transition-colors ml-2" />
              </Link>

              <Link href="/surveys/health" className="bg-white p-4 sm:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center hover:border-emerald-200 transition-colors group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 sm:mb-0 sm:mr-4 group-hover:bg-emerald-100 transition-colors shrink-0">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">Health Survey</h3>
                  <p className="text-[10px] sm:text-sm text-gray-500 mt-1">Collect health data</p>
                </div>
                <ChevronRight className="hidden sm:block text-gray-400 group-hover:text-emerald-500 transition-colors ml-2" />
              </Link>

            </div>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Activity */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                <Link href="/surveys" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  View All
                </Link>
              </div>
              <div className="p-2 sm:p-5">
                <div className="space-y-1">
                  {dashboardStats?.recent_surveys?.length > 0 ? (
                    dashboardStats.recent_surveys.map((survey: any) => (
                      <div key={survey.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                          {survey.survey_type === 'HOUSEHOLD' ? <Home size={20} /> : 
                           survey.survey_type === 'HEALTH' ? <Heart size={20} /> :
                           survey.survey_type === 'EDUCATION' ? <Book size={20} /> :
                           <ClipboardList size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{survey.survey_type} Survey #{survey.house_number || survey.id.slice(0, 8)}</h4>
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            Status: {survey.status} {survey.sync_status === 'pending' ? '(Pending Sync)' : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500 mb-1">
                            {survey.updated_at ? formatDistanceToNow(new Date(survey.updated_at), { addSuffix: true }) : 'Unknown'}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            survey.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {survey.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center flex flex-col items-center">
                      <p className="text-gray-500 mb-4">No surveys yet. Start your first survey.</p>
                      <Link href="/surveys/household" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
                        Start Survey
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Community Overview */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="p-5 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Community Overview</h2>
              </div>
              <div className="p-5 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Households</p>
                    <h3 className="font-bold text-gray-900 text-lg mt-0.5">{communityStats?.summary?.household?.total || 0}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                    <PlusSquare size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Health Facilities</p>
                    <h3 className="font-bold text-gray-900 text-lg mt-0.5">{communityStats?.summary?.health?.hospitals || 0}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                    <Book size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Schools</p>
                    <h3 className="font-bold text-gray-900 text-lg mt-0.5">{communityStats?.summary?.education?.schools || 0}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                    <Droplet size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Water Sources</p>
                    <h3 className="font-bold text-gray-900 text-lg mt-0.5">{communityStats?.summary?.governance?.water_access || 0}</h3>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </>
      )}

    </div>
  );
}
