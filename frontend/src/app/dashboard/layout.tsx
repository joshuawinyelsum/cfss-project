"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';


import { 
  Home, 
  FileEdit, 
  CheckSquare, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Users, 
  BarChart2,
  ClipboardList,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { syncEngine } from '@/lib/sync';



function ProvisioningScreen({ user, token, logout }: { user: any, token: string, logout: () => void }) {
  const status = useAuthStore((state: any) => state.provisionedUsers[user.id]?.status) || 'UNPROVISIONED';
  const setStatus = useAuthStore((state: any) => state.setProvisioningStatus);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // If the component mounts and the status is an "active" provisioning state, 
    // it means the previous attempt was interrupted by a page reload.
    if (['PROVISIONING_DEVICE', 'PROVISIONING_DATA', 'VERIFYING_LOCAL_STATE'].includes(status)) {
      if (user.id) setStatus(user.id, 'PROVISIONING_FAILED');
      return;
    }

    if (status === 'UNPROVISIONED' && !retrying) {
      if (user.id) import('@/lib/provisioning').then(m => m.executeProvisioning(user.id as number, token));
    }
  }, [status, retrying, user.id, token, setStatus]);

  const handleRetry = () => {
    setRetrying(true);
    if (user.id) import('@/lib/provisioning').then(m => m.executeProvisioning(user.id as number, token).finally(() => setRetrying(false)));
  };

  const getStatusText = () => {
    switch (status) {
      case 'UNPROVISIONED':
      case 'AUTHENTICATING':
      case 'AUTHENTICATED': return "Starting provisioning...";
      case 'PROVISIONING_DEVICE': return "Fetching survey schemas...";
      case 'PROVISIONING_DATA': return "Downloading historical records...";
      case 'VERIFYING_LOCAL_STATE': return "Syncing local database...";
      case 'PROVISIONED':
      case 'READY': return "Device ready!";
      case 'PROVISIONING_FAILED': return "Provisioning interrupted or failed.";
      default: return "Please wait...";
    }
  };

  const isFailed = status === 'PROVISIONING_FAILED';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page p-6 text-center">
      <div className="bg-surface p-8 rounded-2xl shadow-sm border border-border max-w-md w-full">
        <div className="w-16 h-16 bg-[#093C22]/10 text-[#093C22] rounded-full flex items-center justify-center mx-auto mb-6">
          {isFailed ? <X size={32} className="text-red-600" /> : <RefreshCw size={32} className="animate-spin" />}
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Setting up your workspace</h2>
        <p className="text-secondary mb-8">{getStatusText()}</p>
        
        {isFailed && (
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleRetry}
              disabled={retrying}
              className="w-full py-3 bg-[#093C22] text-white rounded-xl font-medium hover:bg-[#0c512e] transition-colors disabled:opacity-70"
            >
              {retrying ? "Retrying..." : "Retry Provisioning"}
            </button>
            <button 
              onClick={logout}
              className="w-full py-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors"
            >
              Cancel and Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [syncStatus, setSyncStatus] = useState('Online');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState('Never');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);

  useEffect(() => {
    if (!token || !user || user.role !== 'student') return;

    // Load initial sync time
    const stored = localStorage.getItem('cfss_last_sync');
    if (stored) setLastSyncTime(stored);

    const handleOnline = () => {
      setSyncStatus('Online');
      if (token) {
        setIsSyncing(true);
        syncEngine.processQueue(token).finally(() => setIsSyncing(false));
      }
    };
    const handleOffline = () => setSyncStatus('Offline');

    const handleSyncCompleted = () => {
      setIsSyncing(false);
      const now = new Date().toISOString();
      localStorage.setItem('cfss_last_sync', now);
      setLastSyncTime(now);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-completed', handleSyncCompleted);

    if (navigator.onLine && token) {
      setIsSyncing(true);
      syncEngine.processQueue(token).finally(() => setIsSyncing(false));
    } else if (!navigator.onLine) {
      setSyncStatus('Offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncCompleted);
    };
  }, [user, token]);

  useEffect(() => {
    if (!lastSyncTime) return;
    const updateText = () => {
      try {
        setLastSyncText(formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true }));
      } catch (e) {
        // Ignored
      }
    };
    updateText();
    const interval = setInterval(updateText, 60000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!token || !user || user.role !== 'student') {
      logout();
      router.push('/login');
      return;
    }

    const verifyToken = async () => {
      try {
        const { api } = await import('@/lib/api');
        await api.get('/api/v2/students/me', {
          headers: { Authorization: 'Bearer ' + token }
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          logout();
          router.push('/login');
          return;
        }
      }
      setAuthVerified(true);
    };
    verifyToken();
  }, [hydrated, token, user, logout, router]);

  const [draftCount, setDraftCount] = useState(0);
  
  useEffect(() => {
    if (!user || !token) return;
    const fetchCount = async () => {
      try {
        let count = 0;
        // First try to get real count from server if online
        if (navigator.onLine) {
           const { api } = await import('@/lib/api');
           const res = await api.get('/api/student/surveys/dashboard/stats', {
              headers: { Authorization: `Bearer ${token}` }
           }).catch(() => null);
           if (res?.data) {
              count = res.data.draft_surveys || 0;
           }
        }
        
        // If offline, fallback to Dexie local count
        if (!navigator.onLine) {
           const { db } = await import('@/lib/db');
           const drafts = await db.surveys.where('status').equals('DRAFT').toArray();
           count = drafts.filter(d => d.student_id === user.id).length;
        }

        setDraftCount(count);
      } catch (e) {
        // Ignored
      }
    };
    fetchCount();
    
    const interval = setInterval(fetchCount, 30000); // refresh every 30s
    window.addEventListener('sync-queued', fetchCount);
    window.addEventListener('sync-completed', fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queued', fetchCount);
      window.removeEventListener('sync-completed', fetchCount);
    };
  }, [user, token]);

  const primaryNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/work', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: ClipboardList, prominent: true },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
  ];

  const secondaryNavItems = [
    { name: 'My Group', href: '/dashboard/group', icon: Users },
    { name: 'Sync & Activity', href: '/dashboard/sync', icon: RefreshCw },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const mobileNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Work', href: '/dashboard/work', icon: FileEdit, badge: draftCount > 0 ? draftCount : undefined },
    { name: 'Collect', href: '/surveys', icon: ClipboardList, prominent: true },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
    { name: 'More', href: '/dashboard/more', icon: MoreHorizontal },
  ];

  
  const provisionedUsers = useAuthStore((state: any) => state.provisionedUsers);

  if (!user) return null;

  if (!hydrated || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-4 border-[#093C22] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const provRecord = user.id ? provisionedUsers[user.id] : null;
  const isReady = provRecord?.status === 'READY' || provRecord?.status === 'PROVISIONED';

  if (!isReady) {
    return <ProvisioningScreen user={user} token={token as string} logout={logout} />;
  }


  return (
    <div className="flex flex-1 w-full bg-page overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      {!pathname.includes("/fill") && !pathname.includes("/view") && (
<aside className="hidden lg:flex flex-col w-64 bg-[#093C22] shrink-0 z-10">
        <div className="p-6 flex items-center gap-3 border-b border-[#0c512e]">
          <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#093C22] font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white">CFSS</h1>
            <p className="text-[10px] text-emerald-100/70 leading-tight">Fieldwork Workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-emerald-100/50 mb-2 px-3 uppercase tracking-wider">Fieldwork</div>
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-surface/10 text-white' 
                    : 'text-emerald-100/70 hover:bg-surface/5 hover:text-white'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-100/70'} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-emerald-100/50 mt-8 mb-2 px-3 uppercase tracking-wider">Account & System</div>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-surface/10 text-white' 
                    : 'text-emerald-100/70 hover:bg-surface/5 hover:text-white'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-100/70'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-[#0c512e]">
          <div className="bg-surface/5 border border-white/10 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-white mb-2">Sync Status</h3>
            <div className="flex items-center gap-2 text-xs text-emerald-100/80 mb-3">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'Online' && !isSyncing ? 'bg-green-500' : isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isSyncing ? 'Syncing...' : syncStatus}
            </div>
            <p className="text-[10px] text-emerald-100/50 mb-3">Last sync: {lastSyncText}</p>
            <button 
              className={`w-full py-2 bg-surface/10 hover:bg-surface/20 border border-white/10 rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 ${isSyncing || syncStatus === 'Offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isSyncing && token && syncStatus === 'Online') {
                  setIsSyncing(true);
                  syncEngine.processQueue(token).finally(() => setIsSyncing(false));
                }
              }}
              disabled={isSyncing || syncStatus === 'Offline'}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
)}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-surface border-b border-border-strong h-14 flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#093C22] rounded flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-primary text-sm">CFSS Workspace</span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
               <span className={`w-2 h-2 rounded-full ${syncStatus === 'Online' && !isSyncing ? 'bg-green-500' : isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
             </div>
             <div className="w-8 h-8 rounded-full bg-[#093C22]/10 text-[#093C22] flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
             </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-page p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {!pathname.includes("/fill") && !pathname.includes("/view") && (
<nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-strong flex items-center justify-around h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-50">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            
            if (item.prominent) {
               return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex flex-col items-center justify-center -mt-5 relative z-10"
                  >
                    <div className="w-12 h-12 bg-[#093C22] rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 text-white">
                      <item.icon size={22} />
                    </div>
                    <span className="text-[10px] font-medium text-secondary mt-1">{item.name}</span>
                  </Link>
               );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-16 h-full relative"
              >
                <item.icon 
                  size={22} 
                  className={`mb-1 ${isActive ? 'text-[#093C22]' : 'text-muted'}`} 
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#093C22]' : 'text-muted'}`}>
                  {item.name}
                </span>
                {item.badge && (
                  <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        )}
      </div>

    </div>
  );
}
