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

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgType, setPasswordMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchSettings();
  }, []);

  const [adminPasswordForSettings, setAdminPasswordForSettings] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/admin/settings');
      setSettings(res.data);
    } catch (err: any) {
      console.error(err);
      setMsg('Failed to load settings');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

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
      await api.put('/api/admin/settings', {
        ...settings,
        admin_password: adminPasswordForSettings
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
      await api.post('/api/admin/change-password', {
        current_password: currentPassword,
        new_password: newPassword
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

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading configuration...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-center text-status-error">Configuration unavailable</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Settings</h1>
        <p className="text-secondary mt-1 text-sm">Configure global application behavior and preferences.</p>
      </div>

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
    </div>
  );
}
