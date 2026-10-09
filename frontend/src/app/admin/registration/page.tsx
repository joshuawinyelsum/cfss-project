"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, ShieldAlert, Settings, Loader2, KeyRound } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export default function RegistrationControlPage() {
  const { token } = useAdminAuthStore();
  
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 className="w-8 h-8 animate-spin text-cfss-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8 bg-page text-primary animate-fade-in relative">
      
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Confirm Action</h3>
              <p className="text-sm text-secondary mt-1">
                Enter your admin password to confirm {pendingState ? 'opening' : 'closing'} the registration window.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {modalError && (
                <Alert variant="destructive" title={modalError} />
              )}
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adminPassword && !saving && handleConfirm()}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-surface-alt border-t border-border flex justify-end gap-3 rounded-b-xl">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleConfirm}
                disabled={saving || !adminPassword}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : 'Confirm'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-medium transition-opacity z-50 ${toast.type === 'success' ? 'bg-status-success' : 'bg-status-error'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <Settings className="w-8 h-8 text-cfss-green" />
          Registration Control
        </h1>
        <p className="text-secondary mt-2">Manage global system access and registration windows.</p>
      </div>

      {/* Main Control Card */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-secondary" />
              Student Registration Window
            </h2>
            <p className="text-sm text-secondary mt-1">
              Controls whether new students can create accounts on the platform. Whitelisted IDs are still required even when open.
            </p>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${registrationEnabled ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'}`}>
            <span className={`w-2 h-2 rounded-full ${registrationEnabled ? 'bg-status-success' : 'bg-status-error animate-pulse'}`}></span>
            {registrationEnabled ? 'SYSTEM OPEN' : 'SYSTEM LOCKED'}
          </div>
        </div>

        <div className="p-6 bg-surface-alt flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleClick(!registrationEnabled)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cfss-green focus:ring-offset-2 ${registrationEnabled ? 'bg-status-success' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${registrationEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <div>
              <span className="font-semibold text-primary block">
                {registrationEnabled ? 'Allow New Registrations' : 'Block New Registrations'}
              </span>
              <span className="text-xs text-secondary">
                Toggle to instantly lock or unlock the registration endpoint.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Warning Alert */}
      {!registrationEnabled && (
        <Alert 
          variant="warning" 
          title="Registration is currently locked"
        >
          <p className="text-sm mt-1">
            Any requests to the <code className="bg-status-warning/20 px-1.5 py-0.5 rounded text-status-warning">/register</code> endpoint will be rejected with a 403 Forbidden status. Ensure you notify students before closing the registration window to prevent confusion.
          </p>
        </Alert>
      )}

      {/* Success Alert */}
      {registrationEnabled && (
        <Alert 
          variant="success" 
          title="Registration is currently open"
        >
          <p className="text-sm mt-1">
            Students whose IDs are present in the whitelist can successfully register. All requests are processed using the strict Zenith idempotency flow.
          </p>
        </Alert>
      )}

    </div>
  );
}
