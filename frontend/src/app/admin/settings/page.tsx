"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';

interface Settings {
  registration_open: boolean;
  max_students_per_community: number;
  auto_assign_enabled: boolean;
  assignment_strategy: string;
  survey_enabled: boolean;
  survey_deadline: string | null;
  allow_multiple_submissions: boolean;
  default_page_size: number;
}

export default function AdminSettingsPage() {
  const { user, token, theme, setTheme } = useAuthStore();
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>({
    registration_open: false,
    max_students_per_community: 10,
    auto_assign_enabled: true,
    assignment_strategy: 'balanced',
    survey_enabled: false,
    survey_deadline: '',
    allow_multiple_submissions: false,
    default_page_size: 100,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchSettings();
  }, [user, router, token]);

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      if (!data.survey_deadline) {
        data.survey_deadline = '';
      } else {
        data.survey_deadline = data.survey_deadline.slice(0, 16); 
      }
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (settings.max_students_per_community < 1) {
      setError("Max students per community must be at least 1.");
      return;
    }
    if (settings.default_page_size < 1) {
      setError("Default page size must be at least 1.");
      return;
    }

    setError('');
    setSuccess('');
    setAdminPassword('');
    setModalError('');
    setShowPasswordModal(true);
  };

  const confirmSave = async () => {
    if (!adminPassword) {
      setModalError('Please enter your admin password.');
      return;
    }

    setSaving(true);
    setModalError('');
    
    try {
      const payload = {
        ...settings,
        survey_deadline: settings.survey_deadline ? new Date(settings.survey_deadline).toISOString() : null,
        admin_password: adminPassword
      };

      await api.put('/api/admin/settings', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Settings updated successfully!');
      setShowPasswordModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setModalError('Incorrect password. Please try again.');
      } else {
        setModalError(getErrorMessage(err, 'Failed to save settings.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null; 

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 relative">
      
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Action</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your admin password to confirm these critical system changes.</p>
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
                onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
                autoFocus
              />
            </div>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setShowPasswordModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                onClick={confirmSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure global application behavior and features.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
          <div className="flex items-center">
            <p className="text-red-700 dark:text-red-400 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
          <div className="flex items-center">
            <p className="text-green-700 dark:text-green-400 font-medium text-sm">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveInit} className="space-y-8">
        
        {/* SECTION: User Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Controls</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage global user registration.</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Allow Registration</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">When enabled, new users can sign up using their Student ID.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.registration_open}
                  onChange={(e) => setSettings({...settings, registration_open: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION: System Rules */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Rules</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure community capacity and auto-assignment behaviors.</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Max Students per Community</label>
                <input 
                  type="number"
                  min="1"
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={settings.max_students_per_community}
                  onChange={(e) => setSettings({...settings, max_students_per_community: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Assignment Strategy</label>
                <select
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={settings.assignment_strategy}
                  onChange={(e) => setSettings({...settings, assignment_strategy: e.target.value})}
                >
                  <option value="balanced">Balanced (Distribute evenly)</option>
                  <option value="sequential">Sequential (Fill one by one)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Auto Assign Enabled</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Automatically assign new students to communities upon registration.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.auto_assign_enabled}
                  onChange={(e) => setSettings({...settings, auto_assign_enabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION: Survey Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Survey Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Control survey submissions and deadlines.</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Enable Surveys</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Allow students to fill out and submit surveys.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.survey_enabled}
                  onChange={(e) => setSettings({...settings, survey_enabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Allow Multiple Submissions</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Permit students to submit the same survey type multiple times.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.allow_multiple_submissions}
                  onChange={(e) => setSettings({...settings, allow_multiple_submissions: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Submission Deadline (Optional)</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">After this date, the system will reject all incoming survey submissions.</p>
              <input 
                type="datetime-local"
                className="block w-full sm:w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={settings.survey_deadline || ''}
                onChange={(e) => setSettings({...settings, survey_deadline: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* SECTION: Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Preferences</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">General dashboard preferences.</p>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Dark Mode</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Toggle the global visual theme of the dashboard.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={theme === 'dark'}
                  onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Default Page Size</label>
              <select
                className="block w-full sm:w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={settings.default_page_size}
                onChange={(e) => setSettings({...settings, default_page_size: parseInt(e.target.value) || 100})}
              >
                <option value="50">50 Rows</option>
                <option value="100">100 Rows</option>
                <option value="250">250 Rows</option>
                <option value="500">500 Rows</option>
              </select>
            </div>
            
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 pt-6">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
          >
            Save Configuration
          </button>
        </div>

      </form>
    </div>
  );
}
