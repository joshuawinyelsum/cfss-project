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
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Welcome, {user.full_name}</h1>
          <p className="text-sm text-muted mt-1">Here is your fieldwork overview.</p>
        </div>
        {loading && <RefreshCw className="w-5 h-5 text-muted animate-spin" />}
      </div>

      {error ? (
        <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
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
          {/* Fieldwork Summary - Flat UI (Level 3) */}
          <section className="bg-surface rounded-xl border border-border-strong overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              <Link href="/surveys" className="p-4 hover:bg-page transition-colors">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-bold text-primary">{dashboardStats?.total_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/surveys/drafts" className="p-4 hover:bg-page transition-colors">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Drafts</p>
                <p className="text-2xl font-bold text-[#093C22]">{dashboardStats?.draft_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/surveys/submitted" className="p-4 hover:bg-page transition-colors">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Submitted</p>
                <p className="text-2xl font-bold text-primary">{dashboardStats?.submitted_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/sync" className="p-4 hover:bg-page transition-colors">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Pending Sync</p>
                <p className="text-2xl font-bold text-amber-600">{dashboardStats?.pending_sync || 0}</p>
              </Link>
            </div>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Activity */}
            <section className="lg:col-span-2 bg-surface rounded-xl border border-border-strong flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-page/50">
                <h2 className="text-base font-bold text-primary">Recent Activity</h2>
                <Link href="/dashboard/surveys/drafts" className="text-sm font-medium text-[#093C22] hover:underline">
                  View Drafts
                </Link>
              </div>
              <div className="divide-y divide-border">
                {dashboardStats?.recent_surveys?.length > 0 ? (
                  dashboardStats.recent_surveys.map((survey: any) => (
                    <Link 
                      href={`/surveys/${survey.survey_type.toLowerCase()}/${survey.status === 'SUBMITTED' ? 'view' : 'fill'}?id=${survey.id}`}
                      key={survey.id} 
                      className="flex items-center gap-4 p-4 hover:bg-page transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-page flex items-center justify-center text-secondary shrink-0">
                        {survey.survey_type === 'HOUSEHOLD' ? <Home size={20} /> : 
                         survey.survey_type === 'HEALTH' ? <Heart size={20} /> :
                         survey.survey_type === 'EDUCATION' ? <Book size={20} /> :
                         <ClipboardList size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-primary truncate">
                          {survey.survey_type} Survey #{survey.entity_id || survey.id.slice(0, 8)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            survey.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {survey.status}
                          </span>
                          <span className="text-xs text-muted">
                            {survey.updated_at ? formatDistanceToNow(new Date(survey.updated_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-muted transition-colors" />
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted">No recent activity.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Community Overview */}
            <section className="bg-surface rounded-xl border border-border-strong flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-page/50">
                <h2 className="text-base font-bold text-primary">Community Context</h2>
              </div>
              <div className="p-0 divide-y divide-border">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-muted" />
                    <span className="text-sm font-medium text-secondary">Households</span>
                  </div>
                  <span className="font-bold text-primary">{communityStats?.summary?.household?.total || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <PlusSquare size={18} className="text-muted" />
                    <span className="text-sm font-medium text-secondary">Health Facilities</span>
                  </div>
                  <span className="font-bold text-primary">{communityStats?.summary?.health?.hospitals || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Droplet size={18} className="text-muted" />
                    <span className="text-sm font-medium text-secondary">Water Points</span>
                  </div>
                  <span className="font-bold text-primary">{communityStats?.summary?.water?.boreholes || 0}</span>
                </div>
              </div>
            </section>

          </div>
        </>
      )}
    </div>
  );
}
