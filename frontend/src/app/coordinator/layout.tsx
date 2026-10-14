"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileCheck2,
  AlertTriangle,
  Map,
  FileText,
  LogOut,
  Menu,
  X,
  Compass,
  CheckCircle2,
  Shield,
  Search
} from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  badge?: number | string;
}

function NavItem({ href, label, icon: Icon, pathname, badge }: NavItemProps) {
  const isActive = href === '/coordinator' ? pathname === '/coordinator' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
          : 'text-secondary hover:text-primary hover:bg-hover'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-secondary'}`} />
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.push('/login');
      return;
    }
    // Allow coordinator and admin roles
    if (user.role !== 'coordinator' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [hydrated, token, user, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== 'coordinator' && user.role !== 'admin')) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/coordinator', label: 'Overview', icon: LayoutDashboard },
    { href: '/coordinator/communities', label: 'Groups & Communities', icon: Building2 },
    { href: '/coordinator/fieldworkers', label: 'Supervised Fieldworkers', icon: Users },
    { href: '/coordinator/surveys', label: 'Submissions & Quality Review', icon: FileCheck2 },
    { href: '/coordinator/investigations', label: 'Investigation Queue', icon: AlertTriangle },
    { href: '/coordinator/map', label: 'Community GIS Maps', icon: Map },
    { href: '/coordinator/reports', label: 'Progress Reports', icon: FileText }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-border-strong">
      {/* Brand Header */}
      <div className="p-5 border-b border-border-strong flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-xs">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight text-primary">CFSS</div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Coordinator Portal
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-hover"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-3 py-2">
          Supervision Workflows
        </div>
        {navLinks.map(link => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            pathname={pathname}
          />
        ))}
      </div>

      {/* Coordinator Profile Footer */}
      <div className="p-4 border-t border-border-strong shrink-0 space-y-3">
        <div className="p-3 bg-subtle rounded-xl border border-border-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
            {(user.full_name || user.student_id || 'CO').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-primary truncate">{user.full_name || 'Faculty Coordinator'}</div>
            <div className="text-[10px] text-secondary truncate font-mono">{user.student_id}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
              {user.faculty || 'Supervisor'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-border-strong hover:border-rose-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-page font-sans overflow-hidden text-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-surface border-b border-border-strong p-3.5 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-hover"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-primary">Coordinator Portal</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

