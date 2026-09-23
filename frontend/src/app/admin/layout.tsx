"use client";

import { useAdminAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Users, UsersRound, ClipboardList, BarChart3,
  ShieldCheck, Settings2, Download, Settings, Activity,
  Search, Bell, Menu, LogOut
} from 'lucide-react';
import Link from 'next/link';

function NavSection({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 mt-4 text-xs font-semibold text-emerald-100/50 uppercase tracking-wider">
      {title}
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, pathname }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  pathname: string;
}) {
  const isActive = active || pathname === href;
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-surface/10 text-white' : 'text-emerald-100/70 hover:bg-surface/5 hover:text-white'}`}>
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, theme } = useAdminAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      } catch {
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
    } catch {
      // ignore
    }
    logout();
    router.push('/admin/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cfss-green"></div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-slate-50 font-sans">{children}</div>;
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex h-screen bg-page font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className={`flex flex-col bg-cfss-green text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        
        {/* Logo */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-cfss-green-hover shrink-0">
          <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-cfss-green" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CFSS</h1>
            <p className="text-[10px] text-muted">Community Field<br/>Survey System</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <NavSection title="MAIN" />
          <NavItem href="/admin" icon={LayoutDashboard} label="Dashboard" active={pathname === '/admin'} pathname={pathname} />
          <NavItem href="/admin/students" icon={Users} label="Students" pathname={pathname} />
          <NavItem href="/admin/communities" icon={UsersRound} label="Communities & Groups" pathname={pathname} />
          <NavItem href="/admin/surveys" icon={ClipboardList} label="Surveys" pathname={pathname} />
          <NavItem href="/admin/reports" icon={BarChart3} label="Reports" pathname={pathname} />

          <NavSection title="MANAGEMENT" />
          <NavItem href="/admin/whitelist" icon={ShieldCheck} label="Whitelist" pathname={pathname} />
          <NavItem href="/admin/registration" icon={Settings2} label="Registration Control" pathname={pathname} />
          <NavItem href="/admin/exports" icon={Download} label="Exports" pathname={pathname} />

          <NavSection title="SYSTEM" />
          <NavItem href="/admin/settings" icon={Settings} label="Settings" pathname={pathname} />
          <NavItem href="/admin/notifications" icon={Activity} label="Activity Logs" pathname={pathname} />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-cfss-green-hover shrink-0">
          <div className="flex items-center gap-3 bg-surface/10 p-3 rounded-xl border border-white/10">
            <div className="w-10 h-10 bg-cfss-green rounded-full flex items-center justify-center font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.student_id}</p>
              <p className="text-[10px] text-muted truncate">Administrator</p>
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-white transition-colors" title="Log Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="h-20 bg-white  border-b border-border  px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted hover:text-slate-700    hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary ">CFSS Admin Dashboard</h1>
              <p className="text-sm text-muted ">Welcome back, Admin. Here&apos;s what&apos;s happening in your system.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative hidden md:block w-64 lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted" />
              </div>
              <input 
                type="text" 
                placeholder="Search students, surveys..." 
                className="w-full bg-page border border-border  text-sm  rounded-lg pl-10 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-cfss-green focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <span className="text-xs text-muted font-medium px-1.5 py-0.5 border border-border  rounded bg-white ">⌘K</span>
              </div>
            </div>

            <div className="flex items-center gap-5 border-l border-border  pl-6">
              <Link href="/admin/notifications" className="relative text-muted  hover:text-slate-700  transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cfss-green rounded-full flex items-center justify-center border-2 border-white"></span>
              </Link>
              
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-cfss-green-soft  text-cfss-green  rounded-full flex items-center justify-center font-bold">
                   A
                 </div>
                 <div className="hidden sm:block text-right">
                   <p className="text-sm font-bold text-primary  leading-tight">admin</p>
                   <p className="text-xs text-muted ">Administrator</p>
                 </div>
              </div>
            </div>
          </div>

        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-page">
          {children}
        </main>
      </div>
      
    </div>
  );
}
