const fs = require('fs');

const layoutContent = 
"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  FileEdit, 
  CheckSquare, 
  User as UserIcon, 
  Settings, 
  Bell, 
  LogOut,
  Menu,
  X,
  Users,
  HelpCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { syncEngine } from '@/lib/sync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Online');
  const [isSyncing, setIsSyncing] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (!token || !user || user.role !== 'student') return;
    const fetchCount = async () => {
      try {
        const { db } = await import('@/lib/db');
        const localSurveys = await db.surveys.where('student_id').equals(user.id).toArray();
        const localDrafts = localSurveys.filter(s => s.status === 'DRAFT').length;
        setDraftCount(localDrafts);
      } catch (err) {}
    };
    fetchCount();
  }, [user, token, pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/work', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: Plus },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
  ];

  const moreItems = [
    { name: 'My Group', href: '/dashboard/group', icon: Users },
    { name: 'Sync & Activity', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Help', href: '#', icon: HelpCircle },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-800">
      
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={\ixed lg:static inset-y-0 right-0 z-50 w-72 bg-white border-l lg:border-l-0 lg:border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col \\}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-700 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="font-semibold tracking-tight text-slate-900">CFSS Fieldwork</span>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-gray-600 p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          
          <div className="hidden lg:block space-y-1">
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                className={\lex items-center justify-between px-3 py-2.5 rounded-lg transition-colors \\}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) ? 'text-emerald-700' : 'text-slate-400'} />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">More</h4>
            {moreItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:bg-gray-50 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={item.name === 'Sync & Activity' && isSyncing ? 'text-emerald-500 animate-spin' : 'text-slate-400'} />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.name === 'Sync & Activity' && (
                  <div className="flex items-center gap-2">
                     <span className={\w-2 h-2 rounded-full \\}></span>
                  </div>
                )}
              </Link>
            ))}
          </div>

        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
          >
            <LogOut size={18} className="text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        <header className="lg:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-base tracking-tight">{user.full_name}</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
            {user.full_name.charAt(0)}
          </div>
        </header>

        <header className="hidden lg:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 text-sm text-slate-500">
             <span>{user.community || 'No Community'}</span>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span>Group {user.group_number || 'Pending'}</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user.full_name}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24 lg:p-8 lg:pb-8">
          <div className="max-w-4xl mx-auto h-full">
            {children}
          </div>
        </main>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-2 pb-safe pt-2 h-16 z-40">
          <Link href="/dashboard" className={\lex flex-col items-center justify-center w-1/5 h-full transition-colors \\}>
            <Home size={22} className={pathname === '/dashboard' ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>
          <Link href="/dashboard/work" className={\lex flex-col items-center justify-center w-1/5 h-full transition-colors relative \\}>
            <FileEdit size={22} className={pathname.includes('/dashboard/work') ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Work</span>
            {draftCount > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
            )}
          </Link>
          <Link href="/surveys" className="flex flex-col items-center justify-center w-1/5 h-full transition-colors text-emerald-700">
            <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg mb-0.5">
              <Plus size={22} className="stroke-2" />
            </div>
            <span className="text-[10px] font-medium">Collect</span>
          </Link>
          <Link href="/dashboard/surveys/submitted" className={\lex flex-col items-center justify-center w-1/5 h-full transition-colors \\}>
            <CheckSquare size={22} className={pathname.includes('/submitted') ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">Submitted</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(true)} className={\lex flex-col items-center justify-center w-1/5 h-full transition-colors \\}>
            <Menu size={22} className={isMobileMenuOpen ? 'stroke-2' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </div>

    </div>
  );
}
\;

fs.writeFileSync('frontend/src/app/dashboard/layout.tsx', layoutContent);

const pageContent = \
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentDashboard() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState({
    total_surveys: 0,
    draft_surveys: 0,
    submitted_surveys: 0,
    pending_sync: 0
  });
  const [activity, setActivity] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPending, setHasPending] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !user) return;
    try {
      let dashData = {
        total_surveys: 0,
        draft_surveys: 0,
        submitted_surveys: 0,
        pending_sync: 0,
      };
      let recent: any[] = [];
      let localDrafts: any[] = [];
      
      if (navigator.onLine) {
        const opts = { headers: { Authorization: \\\Bearer \\\\ } };
        const res = await api.get('/api/student/surveys/dashboard/stats', opts).catch(() => null);
        if (res?.data) dashData = res.data;
      }
      
      try {
        const { db } = await import('@/lib/db');
        const localSurveys = await db.surveys.where('student_id').equals(user.id).toArray();
        
        if (localSurveys && localSurveys.length > 0) {
          const lDrafts = localSurveys.filter(s => s.status === 'DRAFT');
          localDrafts = lDrafts;
          
          const localDraftsCount = lDrafts.length;
          const localSubmittedCount = localSurveys.filter(s => s.status === 'SUBMITTED').length;
          const localPendingSubmits = localSurveys.filter(s => s.status === 'SUBMITTED' && s.sync_status !== 'synced').length;
          const pendingSync = localSurveys.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed').length;
          
          const adjustedServerDrafts = Math.max(0, (dashData.draft_surveys || 0) - localPendingSubmits);
          dashData.draft_surveys = Math.max(adjustedServerDrafts, localDraftsCount);
          dashData.submitted_surveys = Math.max(dashData.submitted_surveys || 0, localSubmittedCount);
          dashData.total_surveys = dashData.draft_surveys + dashData.submitted_surveys;
          dashData.pending_sync = pendingSync;
          
          setHasPending(pendingSync > 0);
        }
        
        const pendingIds = new Set(localSurveys.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed').map(s => s.id));
        
        recent = localSurveys
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
          .map(s => ({
            id: s.id,
            survey_type: s.survey_type,
            status: s.status,
            sync_status: pendingIds.has(s.id) ? 'pending' : 'synced',
            updated_at: s.updated_at,
            entity_id: s.entity_id
          }));
          
      } catch (e) {
        console.warn("Could not load local stats", e);
      }
      
      setDashboardStats(dashData);
      setActivity(recent);
      setDrafts(localDrafts);
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!user) {
      api.get('/api/v2/students/me', { headers: { Authorization: \\\Bearer \\\\ } })
        .then(res => useAuthStore.getState().setAuth(token, { ...res.data, role: 'student' }))
        .catch(() => { logout(); router.push('/login'); });
      return;
    }
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('sync-completed', handleSync);
    return () => window.removeEventListener('sync-completed', handleSync);
  }, [user, token, loadData, router, logout]);

  if (loading || !user) return null;

  return (
    <div className="space-y-8 pb-8 font-sans text-slate-800">
      
      {/* 1. ASSIGNMENT CONTEXT */}
      <section>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-slate-900">{user.community || 'No Community'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Group {user.group_number || 'Pending'} · {user.full_name}
          </p>
        </div>
      </section>

      {/* 2. CONTINUE FIELDWORK */}
      <section>
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fieldwork</h2>
        {drafts.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Link 
              href="/dashboard/work" 
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Unfinished</span>
                  <span className="text-xs text-slate-500">{drafts.length} {drafts.length === 1 ? 'record' : 'records'}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-1">Continue fieldwork</h3>
                <p className="text-sm text-slate-500 mt-0.5">Resume your saved drafts</p>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-emerald-600 transition-colors" size={20} />
            </Link>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-slate-700">No unfinished fieldwork</p>
            <p className="text-xs text-slate-500 mt-1">Your saved work will appear here.</p>
          </div>
        )}
      </section>

      {/* 3. FIELDWORK STATISTICS (2x2 Grid) */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between aspect-[3/2]">
             <span className="text-3xl font-light text-slate-900 tracking-tight">{dashboardStats?.total_surveys || 0}</span>
             <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Records</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between aspect-[3/2]">
             <span className="text-3xl font-light text-slate-900 tracking-tight">{dashboardStats?.draft_surveys || 0}</span>
             <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Drafts</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between aspect-[3/2]">
             <span className="text-3xl font-light text-slate-900 tracking-tight">{dashboardStats?.pending_sync || 0}</span>
             <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Sync</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between aspect-[3/2]">
             <span className="text-3xl font-light text-slate-900 tracking-tight">{dashboardStats?.submitted_surveys || 0}</span>
             <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted</span>
          </div>
        </div>
      </section>

      {/* 4. RECENT ACTIVITY */}
      <section>
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</h2>
        {activity.length > 0 ? (
          <div className="space-y-3">
             {activity.slice(0, 4).map((item, idx) => {
               const timeStr = item.updated_at ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true }) : '';
               const isSynced = item.status === 'SUBMITTED' && item.sync_status === 'synced';
               const isPending = item.sync_status === 'pending';
               
               let statusText = 'Draft';
               if (isSynced) statusText = 'Synced';
               else if (isPending) statusText = 'Pending sync';
               else if (item.status === 'SUBMITTED') statusText = 'Submitted';

               return (
                 <div key={\\-\\} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                   <div>
                     <p className="text-sm font-medium text-slate-900">
                       <span className="capitalize">{item.survey_type.toLowerCase()}</span>
                       {item.entity_id && <span className="text-slate-400 font-normal ml-1">· {item.entity_id}</span>}
                     </p>
                     <p className="text-xs text-slate-500 mt-0.5">{statusText}</p>
                   </div>
                   <div className="text-right flex items-center gap-2">
                     <span className="text-xs text-slate-400">{timeStr}</span>
                     {isSynced && <CheckCircle size={14} className="text-emerald-500" />}
                   </div>
                 </div>
               );
             })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No recent activity.</p>
        )}
      </section>

      {/* 5. SYNC STATUS */}
      <section className="pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasPending ? (
             <>
               <span className="w-2 h-2 rounded-full bg-amber-500"></span>
               <span className="text-sm font-medium text-slate-700">{dashboardStats.pending_sync} {dashboardStats.pending_sync === 1 ? 'record' : 'records'} waiting to sync</span>
             </>
          ) : (
             <>
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               <span className="text-sm font-medium text-slate-700">All changes synced</span>
             </>
          )}
        </div>
      </section>

    </div>
  );
}
\

fs.writeFileSync('frontend/src/app/dashboard/page.tsx', pageContent);

console.log("Rewritten correctly.");
