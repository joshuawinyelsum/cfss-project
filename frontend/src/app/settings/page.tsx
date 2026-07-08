"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/dashboard/layout';
import { api } from '@/lib/api';
import { Shield, Monitor, HelpCircle, Info, LogOut, Check, X, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, token, theme, setTheme, logout } = useAuthStore();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  
  // Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Logout state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }
    
    // Fetch user settings
    const fetchSettings = async () => {
      try {
        const res = await api.get('/api/student/settings', { headers: { Authorization: `Bearer ${token}` } });
        setTheme(res.data.theme || 'light');
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user, token, router, setTheme]);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    try {
      await api.patch('/api/student/settings', { theme: newTheme }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.error("Failed to update theme", e);
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
    try {
      await api.post('/api/student/settings/change-password', 
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (e: any) {
      setPasswordError(e.response?.data?.detail || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user || loading) return (
    <DashboardLayout>
      <div className="flex justify-center items-center h-full text-gray-500">Loading settings...</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12 dark:text-gray-200">
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account preferences and security.</p>
        </div>

        {/* ACCOUNT SECURITY */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Shield className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account Security</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update your password to keep your account secure.</p>
            </div>
          </div>
          <div className="p-6">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* APPEARANCE PREFERENCES */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Monitor className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customize the dashboard appearance.</p>
            </div>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-4">
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors flex-1 ${theme === 'light' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-gray-500'}`}>
              <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => handleThemeChange('light')} className="hidden" />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${theme === 'light' ? 'border-emerald-600' : 'border-gray-300 dark:border-gray-500'}`}>
                {theme === 'light' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>}
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">Light Mode</span>
            </label>
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors flex-1 ${theme === 'dark' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-gray-500'}`}>
              <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => handleThemeChange('dark')} className="hidden" />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${theme === 'dark' ? 'border-emerald-600' : 'border-gray-300 dark:border-gray-500'}`}>
                {theme === 'dark' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>}
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</span>
            </label>
          </div>
        </div>

        {/* HELP & SUPPORT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <HelpCircle className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Help & Support</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get assistance and read frequently asked questions.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-500">Contact Support</h3>
                <p className="text-sm text-amber-700 dark:text-amber-600 mt-1">Need help with the system? Contact your field coordinator.</p>
              </div>
              <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap">
                Email Support
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">How do I start a survey?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Go to Surveys and select the survey type assigned to your field work.</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Can I edit submitted surveys?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Submitted surveys cannot be edited unless approved by the coordinator.</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">How do I save unfinished surveys?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Use Save Draft and continue later from Draft Surveys.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ABOUT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Info className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">About CFSS</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">System information and details.</p>
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 dark:text-white">Community Field Survey System (CFSS)</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm leading-relaxed max-w-3xl">
              CFSS is a digital field data collection platform designed to simplify university field practical surveys, student coordination, and community data management.
            </p>
            <div className="mt-4 inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300">
              Version: v1.0
            </div>
          </div>
        </div>

        {/* LOGOUT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Sign Out</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Log out of your account on this device.</p>
            </div>
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

      </div>

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0" />
                  {passwordSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input 
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Are you sure?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to logout? You will need to sign in again to access the system.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm shadow-red-200 dark:shadow-none"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
