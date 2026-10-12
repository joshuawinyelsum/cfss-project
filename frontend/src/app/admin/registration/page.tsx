"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Info,
  X,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';

export default function RegistrationControlPage() {
  const { token } = useAdminAuthStore();

  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [pendingState, setPendingState] = useState<boolean | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modalError, setModalError] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrationEnabled(Boolean(res.data.registration_open));
    } catch {
      showToast('Failed to check current registration status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onToggleClick = (newValue: boolean) => {
    setPendingState(newValue);
    setAdminPassword('');
    setModalError('');
    setShowPasswordModal(true);
  };

  const handleConfirm = async () => {
    if (!token || pendingState === null || !adminPassword) return;

    setSaving(true);
    setModalError('');

    try {
      await api.put('/api/admin/settings/registration',
        {
          registration_enabled: pendingState,
          admin_password: adminPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRegistrationEnabled(pendingState);
      setShowPasswordModal(false);
      showToast(`Registration window ${pendingState ? 'opened' : 'closed'} successfully`, 'success');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setModalError('Incorrect administrator password');
      } else {
        setModalError(err.response?.data?.detail || 'Failed to update settings');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-primary max-w-4xl animate-fade-in pb-12">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full shadow-2xl border border-border-strong p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#093C22]" />
                  <span>{pendingState ? 'Open student registration?' : 'Close student registration?'}</span>
                </h3>
                <p className="text-secondary mt-1">
                  Enter your password to confirm this change.
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block text-primary font-semibold mb-1">Administrator Password</label>
              <input
                type="password"
                placeholder="Enter admin password..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminPassword && !saving && handleConfirm()}
                autoFocus
                className="w-full px-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                disabled={saving}
                className="px-3.5 py-2 rounded-lg border border-border-strong text-primary hover:bg-page font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || !adminPassword}
                className="px-3.5 py-2 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] disabled:opacity-50 font-semibold shadow-2xs transition-colors"
              >
                {saving ? 'Verifying...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#093C22]" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Registration Control</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Manage system self-registration gateway, student intake policy, and onboarding access.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Main Status & Control Panel */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted bg-surface rounded-xl border border-border-strong">
          Loading registration configuration...
        </div>
      ) : (
        <div className="space-y-6">

          {/* Primary Status Card */}
          <div className="bg-surface rounded-xl border border-border-strong p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                  Gateway Access State
                </span>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    registrationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted'
                  }`} />
                  <span className="text-2xl font-bold text-primary">
                    {registrationEnabled ? 'Registration Window Open' : 'Registration Window Closed'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    registrationEnabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-page text-secondary border border-border'
                  }`}>
                    {registrationEnabled ? 'Active' : 'Locked'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onToggleClick(!registrationEnabled)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
                  registrationEnabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#093C22] hover:bg-[#0c512e] text-white'
                }`}
              >
                {registrationEnabled ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Close Registration Window</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Open Registration Window</span>
                  </>
                )}
              </button>
            </div>

            {/* Description & Impact Summary */}
            <div className="p-4 rounded-xl bg-page border border-border text-xs text-secondary space-y-2">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-primary">
                    {registrationEnabled
                      ? 'Self-registration is currently active for all eligible students.'
                      : 'Self-registration is currently disabled.'}
                  </p>
                  <p className="text-secondary leading-relaxed">
                    {registrationEnabled
                      ? 'Incoming students matching an active whitelist roster can create accounts, complete profile registration, and be allocated to fieldwork community groups.'
                      : 'Incoming student registration requests are denied with HTTP 403 Forbidden. Existing accounts and previously submitted field data remain intact and accessible.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Policy & Prerequisites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Access Rules */}
            <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ShieldCheck className="w-4 h-4 text-[#093C22]" />
                <h2 className="text-sm font-bold text-primary">Enrollment Constraints</h2>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary block">Whitelist Roster Verification</span>
                    <span className="text-secondary">Only student IDs present in an active whitelist file can register.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary block">Single Active Account</span>
                    <span className="text-secondary">Each student ID may establish only one authenticated student profile.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary block">Community Quota Enforcement</span>
                    <span className="text-secondary">Students are automatically placed into communities with available capacity.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Administrative Safeguards */}
            <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Lock className="w-4 h-4 text-[#093C22]" />
                <h2 className="text-sm font-bold text-primary">Security Safeguards</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-page border border-border">
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Authentication Requirement</span>
                  <span className="text-primary font-semibold mt-0.5 block">Administrator Password Required</span>
                  <p className="text-secondary text-[11px] mt-0.5">
                    Modifying registration access state requires re-authentication with active admin credentials.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-page border border-border">
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Audit Trail</span>
                  <span className="text-primary font-semibold mt-0.5 block">Recorded in Audit Logs</span>
                  <p className="text-secondary text-[11px] mt-0.5">
                    Every gateway status change is timestamped and logged under system activity records.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
