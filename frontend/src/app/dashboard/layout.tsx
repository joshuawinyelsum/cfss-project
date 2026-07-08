"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  ClipboardList, 
  FileEdit, 
  CheckSquare, 
  BarChart2, 
  Mail, 
  User as UserIcon, 
  Settings, 
  Bell, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { syncEngine } from '@/lib/sync';

import { formatDistanceToNow } from 'date-fns';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Online');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncText, setLastSyncText] = useState('Never');
  const [isSyncing, setIsSyncing] = useState(false);

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

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Surveys', href: '/surveys', icon: ClipboardList },
    { name: 'Drafts', href: '/dashboard/surveys/drafts', icon: FileEdit, badge: 3 },
    { name: 'Submitted', href: '/dashboard/surveys/submitted', icon: CheckSquare },
    { name: 'Reports', href: '/reports', icon: BarChart2 },
    { name: 'Inbox', href: '/inbox', icon: Mail, badge: 2 },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#0a4628] to-[#052b18] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#0a4628] font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CFSS</h1>
            <p className="text-[10px] text-emerald-100/80 leading-tight">Community Field<br/>Survey System</p>
          </div>
          <button 
            className="ml-auto lg:hidden text-white/80 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#105f38] text-white' 
                    : 'text-emerald-100/70 hover:bg-[#105f38]/50 hover:text-white'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-100/70'} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-[#105f38]/40 border border-[#105f38] rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-white mb-2">Sync Status</h3>
            <div className="flex items-center gap-2 text-xs text-emerald-100 mb-3">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'Online' && !isSyncing ? 'bg-green-400' : isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`}></span>
              {isSyncing ? 'Syncing...' : syncStatus}
            </div>
            <p className="text-[10px] text-emerald-200/60 mb-3">Last sync: {lastSyncText}</p>
            <button 
              className={`w-full py-2 bg-[#0a4628] hover:bg-[#07361e] border border-[#1e7c4c] rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 ${isSyncing || syncStatus === 'Offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isSyncing && token && syncStatus === 'Online') {
                  setIsSyncing(true);
                  syncEngine.processQueue(token).finally(() => setIsSyncing(false));
                }
              }}
              disabled={isSyncing || syncStatus === 'Offline'}
            >
              <svg className={isSyncing ? 'animate-spin' : ''} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <span className="lg:hidden font-bold text-gray-900 ml-2">CFSS</span>
          </div>

          <div className="flex items-center gap-4 lg:gap-6 ml-auto">
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user.full_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Level 100 • Group {user.group_number || 'Pending'} {user.community ? `• ${user.community}` : ''}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
