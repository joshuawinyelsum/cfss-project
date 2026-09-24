"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
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
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  total_surveys: number;
  draft_surveys: number;
  submitted_surveys: number;
  pending_sync: number;
  synced_surveys?: number;
  failed_sync?: number;
  last_activity?: string | null;
  recent_surveys?: { id: string; survey_type: string; entity_id: string | null; status: string; updated_at: string }[];
  _isLocal?: boolean;
}

interface CommunityStats {
  summary?: {
    household?: { total?: number };
    health?: { hospitals?: number };
    water?: { boreholes?: number };
  };
}

export default function StudentDashboard() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'auth' | 'server' | 'no-local-data' | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const loadLocalStats = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const all = await db.surveys
        .where('student_id').equals(user.id as number)
        .filter(s => s.status !== 'DELETED')
        .toArray();
      if (all.length === 0) return null;
      const drafts = all.filter(s => s.status === 'DRAFT');
      const submitted = all.filter(s => s.status === 'SUBMITTED');
      const pendingOps = await db.sync_operations
        .where('student_id').equals(user.id as number)
        .filter(op => op.status === 'PENDING' || op.status === 'FAILED')
        .toArray();
      const pendingCount = new Set(pendingOps.map(op => op.entity_id)).size;
      const synced = all.filter(s => s.sync_status === 'synced');
      const failed = all.filter(s => s.sync_status === 'failed');
      const recent = [...all]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);
      const lastActivity = all.reduce<string | null>(
        (latest, s) => (!latest || s.updated_at > latest ? s.updated_at : latest), null
      );
      return {
        total_surveys: all.length,
        draft_surveys: drafts.length,
        submitted_surveys: submitted.length,
        pending_sync: pendingCount,
        synced_surveys: synced.length,
        failed_sync: failed.length,
        last_activity: lastActivity,
        recent_surveys: recent,
        _isLocal: true,
      };
    } catch (e) {
      console.error("Failed to load local stats", e);
      return null;
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      setError(null);
      setIsOfflineMode(false);
      const opts = { headers: { Authorization: `Bearer ${token}` } };

      const [dashRes, commRes] = await Promise.all([
        api.get('/api/student/surveys/dashboard/stats', opts).catch((err: any) => ({ _err: err })),
        api.get('/api/student/community/stats', opts).catch((err: any) => ({ _err: err }))
      ]);

      const dashErr = (dashRes as any)?._err;
      const commErr = (commRes as any)?._err;

      // --- Handle dashboard stats ---
      if (!dashErr && (dashRes as any)?.data) {
        setDashboardStats((dashRes as any).data);
      } else if (dashErr?.response?.status === 401) {
        setError('auth');
        logout();
        router.push('/login');
        return;
      } else {
        // Network failure or server error — fall back to IndexedDB
        const localStats = await loadLocalStats();
        if (localStats) {
          setDashboardStats(localStats);
          setIsOfflineMode(true);
        } else {
          setError('no-local-data');
        }
      }

      // --- Handle community stats (best-effort, no fatal error) ---
      if (!commErr && (commRes as any)?.data) {
        setCommunityStats((commRes as any).data);
      }
      // Community stats are purely informational — silent fail offline is acceptable.

    } catch (e: any) {
      console.error("Unexpected dashboard load error", e);
      // Last-resort: try IndexedDB
      const localStats = await loadLocalStats();
      if (localStats) {
        setDashboardStats(localStats);
        setIsOfflineMode(true);
      } else {
        setError('no-local-data');
      }
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, loadLocalStats, logout, router]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (!user) {
      api.get('/api/v2/students/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => useAuthStore.getState().setAuth(token, { ...res.data, role: 'student' }))
        .catch((err: any) => { 
          if (err.response?.status === 401) {
            logout(); 
            router.push('/login'); 
          }
        });
      return;
    }
    
    if (user.role !== 'student') {
      router.push('/login');
      return;
    }

    loadData();
    
    const interval = setInterval(loadData, 30000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) loadData();
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

      {/* Offline banner */}
      {isOfflineMode && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <WifiOff size={16} className="shrink-0 text-amber-600" />
          <span>Offline — showing data saved on this device. Changes will sync when you&apos;re back online.</span>
        </div>
      )}

      {/* Error states */}
      {error === 'no-local-data' && !loading && (
        <div className="bg-page p-10 rounded-xl border border-border-strong flex flex-col items-center justify-center text-center gap-3">
          <WifiOff className="w-10 h-10 text-muted opacity-40" />
          <h3 className="font-semibold text-primary">You&apos;re offline</h3>
          <p className="text-sm text-muted max-w-xs">
            No local data is available yet. Connect to the internet to load your workspace.
          </p>
        </div>
      )}

      {error === 'server' && !loading && (
        <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="text-red-800 font-medium">Server error</h3>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard content — shown when we have any stats (server or local) */}
      {dashboardStats && !error && (
        <>
          {/* Fieldwork Summary */}
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
                {(dashboardStats?.recent_surveys?.length ?? 0) > 0 ? (
                  dashboardStats!.recent_surveys!.map((survey) => (
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
                  <span className="font-bold text-primary">
                    {isOfflineMode ? <span className="text-xs font-medium text-muted italic">Unavailable offline</span> : (communityStats?.summary?.household?.total ?? '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <PlusSquare size={18} className="text-muted" />
                    <span className="text-sm font-medium text-secondary">Health Facilities</span>
                  </div>
                  <span className="font-bold text-primary">
                    {isOfflineMode ? <span className="text-xs font-medium text-muted italic">Unavailable offline</span> : (communityStats?.summary?.health?.hospitals ?? '—')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Droplet size={18} className="text-muted" />
                    <span className="text-sm font-medium text-secondary">Water Points</span>
                  </div>
                  <span className="font-bold text-primary">
                    {isOfflineMode ? <span className="text-xs font-medium text-muted italic">Unavailable offline</span> : (communityStats?.summary?.water?.boreholes ?? '—')}
                  </span>
                </div>
              </div>
            </section>

          </div>
        </>
      )}
    </div>
  );
}
