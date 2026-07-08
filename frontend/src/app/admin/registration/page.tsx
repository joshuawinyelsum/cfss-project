"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, ShieldAlert, Settings, Loader2, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function RegistrationControlPage() {
  const { token } = useAuthStore();
  
  // Actual verified state from the backend
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  
  // Intended state when user clicks the toggle
  const [pendingState, setPendingState] = useState<boolean | null>(null);
  
  // UI States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modalError, setModalError] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrationEnabled(res.data.registration_open);
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        showToast('Cannot reach server. Check backend or CORS.', 'error');
      } else {
        showToast(err.response.data?.detail || 'Failed to fetch current settings', 'error');
      }
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
      
      // Success: update real state and close modal
      setRegistrationEnabled(pendingState);
      setShowPasswordModal(false);
      showToast(`Registration window ${pendingState ? 'opened' : 'closed'} successfully`, 'success');
    } catch (err: any) {
      console.error(err);
      // Failure: show error, do NOT update toggle
      if (err.response?.status === 403) {
        setModalError('Incorrect password');
      } else if (!err.response) {
        setModalError('Cannot reach server.');
      } else {
        setModalError(err.response.data?.detail || 'Failed to update settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowPasswordModal(false);
    setPendingState(null);
    setAdminPassword('');
    setModalError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8 animate-fade-in relative text-slate-900 dark:text-white">
      
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Action</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter your admin password to confirm {pendingState ? 'opening' : 'closing'} the registration window.
              </p>
            </div>
            
            <div className="p-6">
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm border border-red-200 dark:border-red-800 rounded">
                  {modalError}
                </div>
              )}
              
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Admin Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:text-white"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminPassword && !saving && handleConfirm()}
                autoFocus
              />
            </div>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                onClick={handleConfirm}
                disabled={saving || !adminPassword}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-medium transition-opacity z-50 ${toast.type === 'success' ? 'bg-green-600 dark:bg-green-500' : 'bg-red-600 dark:bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Registration Control
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage global system access and registration windows.</p>
      </div>

      {/* Main Control Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Student Registration Window
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Controls whether new students can create accounts on the platform. Whitelisted IDs are still required even when open.
            </p>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${registrationEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${registrationEnabled ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
            {registrationEnabled ? 'SYSTEM OPEN' : 'SYSTEM LOCKED'}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleClick(!registrationEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${registrationEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${registrationEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                {registrationEnabled ? 'Allow New Registrations' : 'Block New Registrations'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Toggle to instantly lock or unlock the registration endpoint.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      {!registrationEnabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 dark:text-amber-400">Registration is currently locked</h3>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
              Any requests to the <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-300">/register</code> endpoint will be rejected with a 403 Forbidden status. Ensure you notify students before closing the registration window to prevent confusion.
            </p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {registrationEnabled && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Registration is currently open</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-500 mt-1">
              Students whose IDs are present in the whitelist can successfully register. All requests are processed using the strict Zenith idempotency flow.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
