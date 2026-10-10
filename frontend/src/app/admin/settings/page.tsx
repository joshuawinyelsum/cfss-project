"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const { theme, setTheme } = useAdminAuthStore();
  const token = useAdminAuthStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgType, setPasswordMsgType] = useState<'success' | 'error'>('success');
  const [adminPasswordForSettings, setAdminPasswordForSettings] = useState('');

  useEffect(() => {
    setHydrated(true);
  }, []);

  const fetchSettings = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setLoading(true);
      setMsg('');
      const res = await api.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setSettings({
        strict_gps_enforcement: false,
        allow_multiple_submissions: false,
        default_page_size: 100,
        survey_enabled: false,
        registration_open: false,
        ...res.data
      });
    } catch (err: any) {
      console.error(err);
      setMsg(err?.response?.data?.detail || 'Failed to load configuration');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && token) {
      fetchSettings();
    }
  }, [hydrated, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordForSettings) {
      setMsg('Admin password is required to save settings.');
      setMsgType('error');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const activeToken = token || useAdminAuthStore.getState().token;
      await api.put('/api/admin/settings', {
        ...settings,
        admin_password: adminPasswordForSettings
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setMsg('Configuration saved successfully');
      setMsgType('success');
      setAdminPasswordForSettings('');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Failed to save configuration');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg('');
    try {
      const activeToken = token || useAdminAuthStore.getState().token;
      await api.post('/api/admin/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setPasswordMsg('Administrator password updated successfully');
      setPasswordMsgType('success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.detail || 'Failed to update password');
      setPasswordMsgType('error');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Settings</h1>
        <p className="text-secondary mt-1 text-sm">Configure global application behavior and preferences.</p>
      </div>

      {loading && !settings ? (
        <Card>
          <CardContent className="p-12 text-center text-secondary">
            <div className="inline-block w-8 h-8 border-4 border-cfss-green border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>Loading configuration...</p>
          </CardContent>
        </Card>
      ) : !settings ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Alert variant="destructive">
              {msg || 'Configuration unavailable'}
            </Alert>
            <Button onClick={() => fetchSettings()}>Retry Loading Configuration</Button>
          </CardContent>
        </Card>
      ) : (
        <>
      <form onSubmit={handleSave} className="space-y-8">
        
        {msg && (
          <Alert variant={msgType === 'success' ? 'success' : 'destructive'}>
            {msg}
          </Alert>
        )}

        {/* SECTION: Global Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Global Constraints</CardTitle>
            <CardDescription>Rules applying to all student submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
              <div>
                <Label className="text-base font-semibold">Strict GPS Verification</Label>
                <p className="text-xs text-secondary mt-1">If enabled, surveys submitted outside community boundaries will be rejected by the backend.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.strict_gps_enforcement}
                  onChange={(e) => setSettings({...settings, strict_gps_enforcement: e.target.checked})}
                />
                <div className="w-11 h-6 bg-border-strong rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cfss-green"></div>
              </label>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
              <div>
                <Label className="text-base font-semibold">Allow Multiple Submissions</Label>
                <p className="text-xs text-secondary mt-1">Permit students to submit the same survey type multiple times.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.allow_multiple_submissions}
                  onChange={(e) => setSettings({...settings, allow_multiple_submissions: e.target.checked})}
                />
                <div className="w-11 h-6 bg-border-strong rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cfss-green"></div>
              </label>
            </div>

            <div>
              <Label className="text-base font-semibold">Submission Deadline (Optional)</Label>
              <p className="text-xs text-secondary mb-3">After this date, the system will reject all incoming survey submissions.</p>
              <Input 
                type="datetime-local"
                className="w-full sm:w-64"
                value={settings.survey_deadline || ''}
                onChange={(e) => setSettings({...settings, survey_deadline: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION: Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>General dashboard preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
              <div>
                <Label className="text-base font-semibold">Dark Mode</Label>
                <p className="text-xs text-secondary mt-1">Toggle the global visual theme of the dashboard.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={theme === 'dark'}
                  onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                />
                <div className="w-11 h-6 bg-border-strong rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cfss-green"></div>
              </label>
            </div>

            <div>
              <Label className="text-base font-semibold">Default Page Size</Label>
              <select
                className="flex h-10 w-full sm:w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cfss-green"
                value={settings.default_page_size}
                onChange={(e) => setSettings({...settings, default_page_size: parseInt(e.target.value) || 100})}
              >
                <option value="50">50 Rows</option>
                <option value="100">100 Rows</option>
                <option value="250">250 Rows</option>
                <option value="500">500 Rows</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-sm font-semibold mb-2 block text-primary">Admin Password <span className="text-status-error">*</span></Label>
              <Input
                type="password"
                placeholder="Enter current admin password to save changes"
                value={adminPasswordForSettings}
                onChange={(e) => setAdminPasswordForSettings(e.target.value)}
                className="w-full sm:w-64 border-cfss-green/30 focus:border-cfss-green bg-cfss-green/5"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* SECTION: Change Admin Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Admin Password</CardTitle>
          <CardDescription>Update the administrator login credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {passwordMsg && (
              <Alert variant={passwordMsgType === 'success' ? 'success' : 'destructive'} className="mb-4">
                {passwordMsg}
              </Alert>
            )}
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={passwordSaving}>
              {passwordSaving ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
