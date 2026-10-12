"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Shield, 
  Sun, 
  Moon, 
  Laptop, 
  HelpCircle, 
  Info, 
  LogOut, 
  Check, 
  X, 
  AlertCircle, 
  ArrowLeft,
  User,
  Database,
  RefreshCw,
  Mail,
  ChevronDown,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync';

export default function StudentDashboardSettingsPage() {
  const { user, token, theme, setTheme, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync Diagnostics state
  const [storageStats, setStorageStats] = useState({
    totalSurveys: 0,
    drafts: 0,
    synced: 0,
    pendingOps: 0
  });
  const [lastSyncText, setLastSyncText] = useState('Never');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const parseSyncDate = (raw: string | null) => {
    if (!raw) return null;
    const num = Number(raw);
    const d = !isNaN(num) && num > 10000000000 ? new Date(num) : new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const loadStorageDiagnostics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const surveys = await db.surveys.where('student_id').equals(user.id).toArray();
      const ops = await db.sync_operations.where('student_id').equals(user.id).toArray();

      const drafts = surveys.filter(s => s.status === 'DRAFT').length;
      const synced = surveys.filter(s => s.sync_status === 'synced').length;
      const pendingOps = ops.filter(op => op.status === 'PENDING' || op.status === 'FAILED').length;

      setStorageStats({
        totalSurveys: surveys.length,
        drafts,
        synced,
        pendingOps
      });

      const rawLastSync = localStorage.getItem('cfss_last_sync');
      const d = parseSyncDate(rawLastSync);
      if (d) {
        setLastSyncText(d.toLocaleString());
      }
    } catch (e) {
      console.error("Failed to load storage diagnostics", e);
    }
  }, [user?.id]);

  const fetchSettings = useCallback(async () => {
    const activeToken = token || useAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setLoadError('');
      const res = await api.get('/api/student/settings', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.data?.theme) {
        setTheme(res.data.theme as 'light' | 'dark' | 'system');
      }
    } catch (e: any) {
      // Offline fallback: use local store
    }
  }, [token, setTheme]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || (user && user.role !== 'student')) {
      router.push('/login');
      return;
    }
    fetchSettings();
    loadStorageDiagnostics();

    window.addEventListener('sync-completed', loadStorageDiagnostics);
    window.addEventListener('sync-queued', loadStorageDiagnostics);
    return () => {
      window.removeEventListener('sync-completed', loadStorageDiagnostics);
      window.removeEventListener('sync-queued', loadStorageDiagnostics);
    };
  }, [hydrated, token, user, router, fetchSettings, loadStorageDiagnostics]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    const activeToken = token || useAuthStore.getState().token;
    try {
      await api.patch('/api/student/settings', { theme: newTheme }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
    } catch (e) {
      console.error("Failed to persist theme preference", e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);
    const activeToken = token || useAuthStore.getState().token;
    try {
      await api.post('/api/student/settings/change-password',
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 2500);
    } catch (e: any) {
      setPasswordError(e?.response?.data?.detail || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing || !token) return;
    setIsSyncing(true);
    setSyncFeedback('');
    try {
      await syncEngine.processQueue(token);
      localStorage.setItem('cfss_last_sync', new Date().toISOString());
      setSyncFeedback('Synchronization completed successfully.');
      await loadStorageDiagnostics();
      setTimeout(() => setSyncFeedback(''), 4000);
    } catch (e: any) {
      setSyncFeedback('Synchronization failed. Check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const faqs = [
    {
      q: "How does offline data collection work?",
      a: "All completed forms and drafts are stored locally on your device in secure IndexedDB storage. You do not need an active internet connection in the field. When your device reconnects to Wi-Fi or cellular service, pending records synchronize automatically."
    },
    {
      q: "Where do I find my drafts and submitted surveys?",
      a: "Navigate to the Work tab from the main navigation. You will find separate sections for in-progress Drafts and Submitted surveys."
    },
    {
      q: "Can I edit a survey after submitting it?",
      a: "Once a survey is submitted and synced with university servers, it becomes read-only to guarantee academic data integrity. If a correction is urgently required, speak with your designated Field Coordinator."
    },
    {
      q: "What happens if I log out while offline?",
      a: "Your unsynchronized offline records remain safely stored in your browser's local database. They are isolated by your student ID and will sync when you log back in."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Mobile Back Button */}
      <div className="lg:hidden mb-2">
        <Link href="/dashboard/more" className="inline-flex items-center text-sm font-medium text-secondary hover:text-primary transition-colors">
          <ArrowLeft size={16} className="mr-1.5" /> Back to More
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Account & Field Settings</h1>
        <p className="text-sm text-secondary mt-1">Manage your student profile, appearance preferences, security, and offline cache.</p>
      </div>

      {loadError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-sm text-amber-800 dark:text-amber-200">
          <span>{loadError}</span>
          <button
            onClick={() => fetchSettings()}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loadError ? (
        <div className="p-16 text-center text-secondary">
          <div className="w-8 h-8 border-3 border-border-strong border-t-cfss-green rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading preferences...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: PROFILE & FIELDWORK ASSIGNMENT */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-primary">Student Profile & Field Assignment</h2>
                <p className="text-xs text-secondary">Assigned academic parameters and field group</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Full Name</span>
                <span className="text-sm font-semibold text-primary mt-0.5 block truncate">{user?.full_name || 'Student Researcher'}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Student ID</span>
                <span className="text-sm font-semibold font-mono text-primary mt-0.5 block">{user?.student_id || '—'}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Academic Program</span>
                <span className="text-sm font-semibold text-primary mt-0.5 block truncate capitalize">{user?.program || 'Field Studies'}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Faculty</span>
                <span className="text-sm font-medium text-primary mt-0.5 block truncate">{user?.faculty || 'Faculty of Sciences'}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Assigned Community</span>
                <span className="text-sm font-semibold text-cfss-green mt-0.5 block truncate">{user?.community || 'Unassigned'}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Working Group</span>
                <span className="text-sm font-semibold text-primary mt-0.5 block">Group #{user?.group_number ?? 1}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-surface-elevated/30 border border-border rounded-lg flex items-start gap-2.5 text-xs text-secondary">
              <Info size={16} className="text-cfss-green shrink-0 mt-0.5" />
              <span>Fieldwork allocations and group memberships are governed by the academic faculty. To request reassignment, consult your Field Coordinator.</span>
            </div>
          </div>

          {/* SECTION 2: APPEARANCE & THEME PREFERENCES */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                <Sun size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-primary">Appearance & Display Mode</h2>
                <p className="text-xs text-secondary">Select your preferred color mode for field observation and indoor review</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                  theme === 'light'
                    ? 'border-cfss-green bg-cfss-green-soft'
                    : 'border-border-strong bg-surface hover:border-border hover:bg-surface-elevated/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-cfss-green text-white' : 'bg-surface-elevated text-secondary'}`}>
                    <Sun size={18} />
                  </div>
                  {theme === 'light' && (
                    <div className="w-5 h-5 rounded-full bg-cfss-green text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">Light Mode</span>
                <span className="text-xs text-secondary mt-1">High contrast clarity for indoor and office study</span>
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                  theme === 'dark'
                    ? 'border-cfss-green bg-cfss-green-soft'
                    : 'border-border-strong bg-surface hover:border-border hover:bg-surface-elevated/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-cfss-green text-white' : 'bg-surface-elevated text-secondary'}`}>
                    <Moon size={18} />
                  </div>
                  {theme === 'dark' && (
                    <div className="w-5 h-5 rounded-full bg-cfss-green text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">Dark Mode</span>
                <span className="text-xs text-secondary mt-1">Reduced eye strain for night-time field surveys</span>
              </button>

              {/* System Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                  theme === 'system'
                    ? 'border-cfss-green bg-cfss-green-soft'
                    : 'border-border-strong bg-surface hover:border-border hover:bg-surface-elevated/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2 rounded-lg ${theme === 'system' ? 'bg-cfss-green text-white' : 'bg-surface-elevated text-secondary'}`}>
                    <Laptop size={18} />
                  </div>
                  {theme === 'system' && (
                    <div className="w-5 h-5 rounded-full bg-cfss-green text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">System Match</span>
                <span className="text-xs text-secondary mt-1">Automatically adapts to your device operating system</span>
              </button>
            </div>
          </div>

          {/* SECTION 3: OFFLINE SYNC & STORAGE DIAGNOSTICS */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-primary">Offline Storage & Synchronization</h2>
                  <p className="text-xs text-secondary">Local IndexedDB diagnostics and server synchronization</p>
                </div>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-elevated border border-border-strong hover:bg-surface-elevated/80 rounded-lg text-xs font-semibold text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-cfss-green' : 'text-cfss-green'} />
                {isSyncing ? 'Syncing...' : 'Run Sync'}
              </button>
            </div>

            {syncFeedback && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {syncFeedback}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg text-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">IndexedDB</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">Active</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg text-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Total Surveys</span>
                <span className="text-lg font-bold text-primary mt-0.5 block">{storageStats.totalSurveys}</span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg text-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Pending Queue</span>
                <span className={`text-lg font-bold mt-0.5 block ${storageStats.pendingOps > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                  {storageStats.pendingOps}
                </span>
              </div>

              <div className="p-3.5 bg-surface-elevated/40 border border-border rounded-lg text-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Synced Records</span>
                <span className="text-lg font-bold text-cfss-green mt-0.5 block">{storageStats.synced}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-secondary gap-2 pt-3 border-t border-border">
              <span>Last confirmed sync with server: <strong className="text-primary">{lastSyncText}</strong></span>
              <Link href="/dashboard/work/attention" className="text-cfss-green font-semibold hover:underline">
                View Full Sync Queue &rarr;
              </Link>
            </div>
          </div>

          {/* SECTION 4: SECURITY & CREDENTIALS */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-primary">Account Security & Credentials</h2>
                  <p className="text-xs text-secondary">Manage your password to protect fieldwork collection data</p>
                </div>
              </div>

              {!showPasswordForm && (
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="px-3.5 py-2 bg-surface-elevated border border-border-strong hover:bg-surface-elevated/80 rounded-lg text-xs font-semibold text-primary transition-colors cursor-pointer"
                >
                  Change Password
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-lg">
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-9 px-3 border border-border-strong rounded-lg bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cfss-green/20 focus:border-cfss-green transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">New Password (minimum 6 characters)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-9 px-3 border border-border-strong rounded-lg bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cfss-green/20 focus:border-cfss-green transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-9 px-3 border border-border-strong rounded-lg bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cfss-green/20 focus:border-cfss-green transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-4 py-2 bg-cfss-green hover:bg-cfss-green-hover text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {changingPassword ? 'Updating...' : 'Save New Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="px-3.5 py-2 bg-surface border border-border hover:bg-surface-elevated rounded-lg text-xs font-semibold text-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex items-center gap-3 text-xs text-secondary">
                <Lock size={15} className="text-muted" />
                <span>Password was configured during account initialization. Use the button above to change your password.</span>
              </div>
            )}
          </div>

          {/* SECTION 5: FIELDWORK ASSISTANCE & FAQS */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-5 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-cfss-green-soft text-cfss-green flex items-center justify-center shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-primary">Fieldwork Support & Guidelines</h2>
                <p className="text-xs text-secondary">Technical troubleshooting and academic field coordination</p>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-surface-elevated/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-primary">Field Coordinator Office</h3>
                <p className="text-xs text-secondary mt-0.5">Need immediate assistance with community boundary mapping or questionnaire ambiguities?</p>
              </div>

              <a
                href={`mailto:cfss-support@university.edu?subject=CFSS%20Fieldwork%20Support%20-%20${encodeURIComponent(user?.student_id || '')}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-cfss-green hover:bg-cfss-green-hover text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                <Mail size={14} />
                Contact Coordinator
              </a>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Frequently Asked Questions</h3>
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-border rounded-lg overflow-hidden bg-surface-elevated/20">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-primary hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`text-muted transition-transform ${openFaq === idx ? 'rotate-180 text-cfss-green' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-3.5 pb-3.5 text-xs text-secondary leading-relaxed border-t border-border/50 pt-2.5">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 6: SYSTEM INFORMATION & SIGN OUT */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-primary">Community and Field Survey System (CFSS)</h2>
                <p className="text-xs text-secondary mt-0.5">Academic Fieldwork Portal &bull; Client Version 2.4.0</p>
                <p className="text-[11px] text-muted mt-2">
                  Unsynced offline records will remain stored safely in your browser until you sign back in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border-strong w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <LogOut size={22} />
            </div>
            <h2 className="text-base font-semibold text-primary mb-1">Confirm Sign Out</h2>
            <p className="text-xs text-secondary mb-5 leading-relaxed">
              Are you sure you want to end your fieldwork session? Unsynchronized offline survey drafts will remain preserved on this device.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 bg-surface border border-border-strong text-secondary hover:bg-surface-elevated rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
