"use client";

import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Users, UsersRound, ClipboardList, BarChart3,
  ShieldCheck, Settings2, Download, Settings, Activity,
  Search, Bell, Menu, LogOut
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, theme } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (!hydrated) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, hydrated]);

  // Auth Guard
  useEffect(() => {
    if (!hydrated) return;

    const verifyAuth = async () => {
      if (!token || user?.role !== 'admin') {
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        } else {
          setAuthLoading(false);
        }
        return;
      }

      try {
        await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (pathname === '/admin/login') {
          router.push('/admin');
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        // Invalid token
        logout();
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        } else {
          setAuthLoading(false);
        }
      }
    };

    verifyAuth();
  }, [token, user, router, pathname, logout, hydrated]);

  const handleLogout = async () => {
    try {
      await api.post('/api/admin/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      // ignore
    }
    logout();
    router.push('/admin/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-slate-50 font-sans">{children}</div>;
  }

  if (!user || user.role !== 'admin') return null;

  const NavItem = ({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active?: boolean }) => {
    const isActive = active || pathname === href;
    return (
      <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    );
  };

  const NavSection = ({ title }: { title: string }) => (
    <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
      {title}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className={`flex flex-col bg-[#0B1727] dark:bg-black text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        
        {/* Logo */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CFSS</h1>
            <p className="text-[10px] text-slate-400">Community Field<br/>Survey System</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <NavSection title="MAIN" />
          <NavItem href="/admin" icon={LayoutDashboard} label="Dashboard" active={pathname === '/admin'} />
          <NavItem href="/admin/students" icon={Users} label="Students" />
          <NavItem href="/admin/communities" icon={UsersRound} label="Communities & Groups" />
          <NavItem href="/admin/surveys" icon={ClipboardList} label="Surveys" />
          <NavItem href="/admin/reports" icon={BarChart3} label="Reports" />

          <NavSection title="MANAGEMENT" />
          <NavItem href="/admin/whitelist" icon={ShieldCheck} label="Whitelist" />
          <NavItem href="/admin/registration" icon={Settings2} label="Registration Control" />
          <NavItem href="/admin/exports" icon={Download} label="Exports" />

          <NavSection title="SYSTEM" />
          <NavItem href="/admin/settings" icon={Settings} label="Settings" />
          <NavItem href="/admin/activity" icon={Activity} label="Activity Logs" />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.student_id}</p>
              <p className="text-[10px] text-slate-400 truncate">Administrator</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors" title="Log Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">CFSS Admin Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, Admin. Here's what's happening in your system.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative hidden md:block w-64 lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search students, surveys..." 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm dark:text-white rounded-lg pl-10 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800">⌘K</span>
              </div>
            </div>

            <div className="flex items-center gap-5 border-l border-slate-200 dark:border-slate-700 pl-6">
              <Link href="/admin/notifications" className="relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800"></span>
              </Link>
              
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full flex items-center justify-center font-bold">
                   A
                 </div>
                 <div className="hidden sm:block text-right">
                   <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">admin</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
                 </div>
              </div>
            </div>
          </div>

        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] dark:bg-slate-900">
          {children}
        </main>
      </div>
      
    </div>
  );
}
