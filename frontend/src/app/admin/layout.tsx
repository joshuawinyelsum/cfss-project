"use client";

import { useAdminAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Sliders,
  Building2,
  History,
  Bell,
  FileCheck,
  Settings,
  Menu,
  Search,
  ChevronDown,
  LogOut,
  X
} from 'lucide-react';

function NavSection({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold text-emerald-100/50 mt-6 mb-2 px-3 uppercase tracking-wider select-none">
      {title}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  pathname,
  badge
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  pathname: string;
  badge?: string | number;
}) {
  const isActive = active !== undefined ? active : (
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  );

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-emerald-100/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {Icon && (
        <Icon className={`w-5 h-5 shrink-0 transition-colors ${
          isActive ? 'text-white' : 'text-emerald-100/70'
        }`} />
      )}
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, theme } = useAdminAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Theme application
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
        logout();
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        } else {
          setAuthLoading(false);
        }
      }
    };

    verifyAuth();
  }, [hydrated, token, user, pathname, router, logout]);

  // Fetch unread notifications count for badge
  useEffect(() => {
    if (!token || user?.role !== 'admin') return;

    const fetchUnread = async () => {
      try {
        const res = await api.get('/api/admin/notifications?limit=20', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data)) {
          const unread = res.data.filter((n: any) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [token, user]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

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

  // Determine breadcrumb title
  const getBreadcrumbName = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/students')) return 'Students';
    if (pathname.startsWith('/admin/communities')) return 'Communities';
    if (pathname.startsWith('/admin/whitelist')) return 'Whitelist';
    if (pathname.startsWith('/admin/registration')) return 'Registration Control';
    if (pathname.startsWith('/admin/activity')) return 'Activity Logs';
    if (pathname.startsWith('/admin/notifications')) return 'Notifications';
    if (pathname.startsWith('/admin/surveys') || pathname.startsWith('/admin/services')) return 'Fieldwork Submissions';
    if (pathname.startsWith('/admin/exports')) return 'Exports';
    if (pathname.startsWith('/admin/settings')) return 'Settings';
    return 'Dashboard';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-4 border-[#093C22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-page font-sans">{children}</div>;
  }

  if (!user || user.role !== 'admin') return null;

  const sidebarContent = (
    <>
      {/* Top Branding */}
      <div className="p-6 flex items-center justify-between border-b border-[#0c512e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-[#093C22] font-bold text-xl">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white">CFSS</h1>
            <p className="text-[10px] text-emerald-100/70 leading-tight">Administration</p>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1 text-white/70 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 no-scrollbar">
        <NavSection title="Overview" />
        <NavItem href="/admin" label="Dashboard" icon={LayoutDashboard} pathname={pathname} />

        <NavSection title="Student Administration" />
        <NavItem href="/admin/students" label="Students" icon={Users} pathname={pathname} />
        <NavItem href="/admin/whitelist" label="Manage Whitelist" icon={ClipboardList} pathname={pathname} />
        <NavItem href="/admin/registration" label="Registration Control" icon={Sliders} pathname={pathname} />

        <NavSection title="Community Administration" />
        <NavItem href="/admin/communities" label="Communities & Groups" icon={Building2} pathname={pathname} />

        <NavSection title="System Administration" />
        <NavItem href="/admin/activity" label="Activity Logs" icon={History} pathname={pathname} />
        <NavItem
          href="/admin/notifications"
          label="Notifications"
          icon={Bell}
          pathname={pathname}
          badge={unreadCount > 0 ? unreadCount : undefined}
        />
        <NavItem href="/admin/surveys" label="Field Submissions" icon={FileCheck} pathname={pathname} />
        <NavItem href="/admin/settings" label="Settings" icon={Settings} pathname={pathname} />
      </div>

      {/* User Profile Footer */}
      <div className="p-4 mt-auto border-t border-[#0c512e] shrink-0">
        <div className="bg-surface/5 border border-white/10 rounded-xl p-3 mb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface/20 flex items-center justify-center font-bold text-white text-xs shrink-0">
            {(user.student_id || 'A').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{user.student_id || 'Administrator'}</div>
            <div className="text-[10px] text-emerald-100/70 truncate">{user.email || 'admin@cfss.local'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-100/70 hover:bg-white/5 hover:text-white transition-colors w-full"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-emerald-100/60" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-page font-sans overflow-hidden text-primary">

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-[#093C22] text-white transition-all duration-200 shrink-0 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-[#093C22] text-white h-full z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Top Header */}
        <header className="h-16 bg-surface border-b border-border-strong px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-10">

          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 rounded-lg text-secondary hover:text-primary hover:bg-page transition-colors"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-page transition-colors"
              title="Open menu"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs">
              <span className="text-muted">Administration</span>
              <span className="text-muted">/</span>
              <span className="text-primary font-semibold truncate">{getBreadcrumbName()}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Quick Search */}
            <div className="relative hidden md:block w-48 lg:w-60">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-page hover:bg-surface focus:bg-surface border border-border-strong rounded-lg pl-9 pr-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
              />
            </div>

            {/* Notifications Button */}
            <Link
              href="/admin/notifications"
              className="relative p-2 rounded-lg text-secondary hover:text-primary hover:bg-page transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
              )}
            </Link>

            {/* Admin Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-strong hover:bg-page"
              >
                <div className="w-6 h-6 rounded-md bg-[#093C22]/10 text-[#093C22] flex items-center justify-center font-bold text-xs">
                  {(user.student_id || 'A').slice(0, 1).toUpperCase()}
                </div>
                <span>Administrator</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-surface rounded-xl border border-border-strong shadow-lg py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-border">
                    <p className="font-semibold text-primary truncate">{user.student_id || 'Administrator'}</p>
                    <p className="text-[11px] text-muted truncate">{user.email || 'admin@cfss.local'}</p>
                  </div>
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-secondary hover:text-primary hover:bg-page transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/admin/activity"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-secondary hover:text-primary hover:bg-page transition-colors"
                  >
                    <History className="w-4 h-4 text-muted" />
                    <span>Activity logs</span>
                  </Link>
                  <button
                    onClick={() => { setUserDropdownOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors border-t border-border text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-page">
          {children}
        </main>
      </div>
    </div>
  );
}
