"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import { 
  Settings as SettingsIcon, 
  KeyRound, 
  Sliders, 
  Users, 
  MapPin, 
  ShieldAlert, 
  Check, 
  Lock, 
  Calendar, 
  RotateCw, 
  Save, 
  AlertTriangle,
  ExternalLink,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const token = useAdminAuthStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgType, setPasswordMsgType] = useState<'success' | 'error'>('success');
  const [adminPasswordForSettings, setAdminPasswordForSettings] = useState('');

  // Survey collection password confirmation modal state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [pendingSurveyState, setPendingSurveyState] = useState<boolean | null>(null);
  const [surveyAdminPassword, setSurveyAdminPassword] = useState('');
  const [surveyModalError, setSurveyModalError] = useState('');
  const [surveyModalSaving, setSurveyModalSaving] = useState(false);

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
        registration_open: false,
        max_students_per_community: 10,
        auto_assign_enabled: true,
        assignment_strategy: 'balanced',
        survey_enabled: false,
        survey_deadline: '',
        allow_multiple_submissions: false,
        default_page_size: 100,
        strict_gps_enforcement: false,
        ...res.data
      });
    } catch (err: any) {
      setMsg(getErrorMessage(err, 'Failed to load system settings'));
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
      setMsg('Administrator password confirmation is required to save system settings.');
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
      setMsg('Institutional system settings updated successfully.');
      setMsgType('success');
      setAdminPasswordForSettings('');
    } catch (err: any) {
      setMsg(err.response?.data?.detail || getErrorMessage(err, 'Failed to save settings'));
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New password and confirmation do not match.');
      setPasswordMsgType('error');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg('New password must be at least 8 characters long.');
      setPasswordMsgType('error');
      return;
    }

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
      setPasswordMsg('Administrator password changed successfully.');
      setPasswordMsgType('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.detail || getErrorMessage(err, 'Failed to change password'));
      setPasswordMsgType('error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSurveyToggleClick = (targetState: boolean) => {
    setPendingSurveyState(targetState);
    setSurveyAdminPassword('');
    setSurveyModalError('');
    setShowSurveyModal(true);
  };

  const handleConfirmSurveyToggle = async () => {
    if (pendingSurveyState === null || !surveyAdminPassword) return;
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    setSurveyModalSaving(true);
    setSurveyModalError('');
    try {
      await api.put('/api/admin/settings/survey-collection', {
        survey_enabled: pendingSurveyState,
        admin_password: surveyAdminPassword
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setSettings((prev: any) => ({ ...prev, survey_enabled: pendingSurveyState }));
      setShowSurveyModal(false);
      setMsg(`Fieldwork survey collection has been ${pendingSurveyState ? 'enabled' : 'paused'} successfully.`);
      setMsgType('success');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setSurveyModalError('Incorrect administrator password.');
      } else {
        setSurveyModalError(getErrorMessage(err, 'Failed to update survey collection setting.'));
      }
    } finally {
      setSurveyModalSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-primary max-w-4xl animate-fade-in pb-12">

      {/* Password Confirmation Modal for Survey Collection */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full shadow-2xl border border-border-strong p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#093C22]" />
                  <span>{pendingSurveyState ? 'Enable Survey Collection?' : 'Pause Survey Collection?'}</span>
                </h3>
                <p className="text-secondary mt-1">
                  Enter your administrator password to confirm turning fieldwork survey collection <strong>{pendingSurveyState ? 'ON' : 'OFF'}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSurveyModal(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {surveyModalError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{surveyModalError}</span>
              </div>
            )}

            <div>
              <label className="block text-primary font-semibold mb-1">Administrator Password</label>
              <input
                type="password"
                placeholder="Enter admin password..."
                value={surveyAdminPassword}
                onChange={(e) => setSurveyAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && surveyAdminPassword && !surveyModalSaving && handleConfirmSurveyToggle()}
                autoFocus
                className="w-full px-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSurveyModal(false)}
                disabled={surveyModalSaving}
                className="px-3.5 py-2 rounded-lg border border-border-strong text-primary hover:bg-page font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSurveyToggle}
                disabled={surveyModalSaving || !surveyAdminPassword}
                className="px-3.5 py-2 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] disabled:opacity-50 font-semibold shadow-2xs transition-colors"
              >
                {surveyModalSaving ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-[#093C22]" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">System Settings</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Global institutional parameters, fieldwork survey rules, allocation quotas, and administrator security.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-2xs disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#093C22]' : 'text-muted'}`} />
          <span>Reload Settings</span>
        </button>
      </div>

      {loading && !settings ? (
        <div className="p-16 text-center text-xs text-muted bg-surface rounded-xl border border-border-strong shadow-xs">
          <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#093C22] mb-2" />
          Loading system settings...
        </div>
      ) : !settings ? (
        <div className="p-6 bg-surface rounded-xl border border-border-strong text-xs text-secondary shadow-xs">
          Settings currently unavailable. <button onClick={fetchSettings} className="text-[#093C22] underline font-medium">Retry</button>
        </div>
      ) : (
        <div className="space-y-6">

          {msg && (
            <div className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
              msgType === 'success' 
                ? 'bg-emerald-50 text-[#093C22] border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {msgType === 'success' ? <Check className="w-4 h-4 shrink-0 text-[#093C22]" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{msg}</span>
            </div>
          )}

          {/* Form: General System Settings */}
          <form onSubmit={handleSave} className="space-y-6">

            {/* SECTION 1: Intake & Registration */}
            <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
              <div className="px-5 py-4 bg-page/50 border-b border-border flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#093C22]" />
                <h2 className="font-bold text-sm text-primary">1. Intake & Registration Gateway</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <label className="font-semibold text-primary block text-xs">
                        Student Registration Gateway Status
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        settings.registration_open 
                          ? 'bg-emerald-50 text-[#093C22] border-emerald-200' 
                          : 'bg-page text-secondary border-border'
                      }`}>
                        {settings.registration_open ? 'Open (Active)' : 'Closed (Locked)'}
                      </span>
                    </div>
                    <p className="text-secondary text-[11px] leading-relaxed max-w-xl">
                      Registration availability is controlled exclusively through the dedicated authorization workflow to maintain student audit security.
                    </p>
                  </div>
                  <Link
                    href="/admin/registration"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#093C22]/30 text-xs font-semibold text-[#093C22] bg-emerald-50 hover:bg-emerald-100/70 transition-colors whitespace-nowrap shadow-2xs"
                  >
                    <span>Manage Registration Control</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* SECTION 2: Fieldwork Parameters */}
            <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
              <div className="px-5 py-4 bg-page/50 border-b border-border flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#093C22]" />
                <h2 className="font-bold text-sm text-primary">2. Fieldwork & Survey Parameters</h2>
              </div>

              <div className="p-5 space-y-4 divide-y divide-border">
                {/* Survey Enabled */}
                <div className="flex items-start justify-between gap-4 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <label className="font-semibold text-primary block text-xs">
                        Fieldwork Survey Collection
                      </label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        settings.survey_enabled
                          ? 'bg-emerald-50 text-[#093C22] border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {settings.survey_enabled ? 'Active (Collecting)' : 'Paused (Locked)'}
                      </span>
                    </div>
                    <p className="text-secondary text-[11px] leading-relaxed max-w-xl">
                      Enable or pause the submission of fieldwork surveys across all student survey modules. Requires password confirmation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSurveyToggleClick(!settings.survey_enabled)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border shadow-2xs ${
                      settings.survey_enabled
                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        : 'bg-[#093C22] text-white border-[#093C22] hover:bg-[#0c512e]'
                    }`}
                  >
                    {settings.survey_enabled ? 'Pause Collection' : 'Enable Collection'}
                  </button>
                </div>

                {/* Submission Deadline */}
                <div className="pt-4 pb-4">
                  <label className="font-semibold text-primary block mb-1 text-xs">
                    Fieldwork Submission Cutoff Deadline
                  </label>
                  <p className="text-secondary text-[11px] mb-2.5">
                    Universal cutoff timestamp after which all new survey responses are locked.
                  </p>
                  <div className="relative max-w-sm">
                    <input
                      type="datetime-local"
                      value={settings.survey_deadline ? settings.survey_deadline.slice(0, 16) : ''}
                      onChange={(e) => setSettings({ ...settings, survey_deadline: e.target.value })}
                      className="w-full px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22]"
                    />
                  </div>
                </div>

                {/* GPS Boundary Validation */}
                <div className="flex items-start justify-between gap-4 pt-4 pb-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-primary block text-xs">
                      Strict Geographic Boundary & GPS Validation
                    </label>
                    <p className="text-secondary text-[11px] leading-relaxed max-w-xl">
                      Require students to be physically within their assigned community coordinates to submit field forms.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.strict_gps_enforcement}
                      onChange={(e) => setSettings({ ...settings, strict_gps_enforcement: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-page border border-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#093C22]"></div>
                  </label>
                </div>

                {/* Multiple Submissions */}
                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-primary block text-xs">
                      Permit Multiple Submissions per Student
                    </label>
                    <p className="text-secondary text-[11px] leading-relaxed max-w-xl">
                      Allow student fieldworkers to submit multiple entries of the same questionnaire instrument.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_multiple_submissions}
                      onChange={(e) => setSettings({ ...settings, allow_multiple_submissions: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-page border border-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#093C22]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 3: Allocation Quotas */}
            <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
              <div className="px-5 py-4 bg-page/50 border-b border-border flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#093C22]" />
                <h2 className="font-bold text-sm text-primary">3. Allocation Quotas & System Limits</h2>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Max Students Per Community */}
                  <div>
                    <label className="font-semibold text-primary block mb-1 text-xs">
                      Maximum Students per Community
                    </label>
                    <p className="text-secondary text-[11px] mb-2">
                      Upper bound quota for student allocations per community location.
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={settings.max_students_per_community || 10}
                      onChange={(e) => setSettings({ ...settings, max_students_per_community: parseInt(e.target.value) || 10 })}
                      className="w-full sm:w-48 px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                    />
                  </div>

                  {/* Assignment Strategy */}
                  <div>
                    <label className="font-semibold text-primary block mb-1 text-xs">
                      Allocation Balancing Strategy
                    </label>
                    <p className="text-secondary text-[11px] mb-2">
                      Distribution algorithm used when placing new registrants.
                    </p>
                    <select
                      value={settings.assignment_strategy || 'balanced'}
                      onChange={(e) => setSettings({ ...settings, assignment_strategy: e.target.value })}
                      className="w-full sm:w-48 px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                    >
                      <option value="balanced">Balanced (Even Fill)</option>
                      <option value="sequential">Sequential Fill</option>
                      <option value="random">Randomized</option>
                    </select>
                  </div>

                  {/* Auto Assign Toggle */}
                  <div>
                    <label className="font-semibold text-primary block mb-1 text-xs">
                      Automatic Community Placement
                    </label>
                    <p className="text-secondary text-[11px] mb-2">
                      Automatically place verified registrants upon registration completion.
                    </p>
                    <div className="pt-1">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.auto_assign_enabled}
                          onChange={(e) => setSettings({ ...settings, auto_assign_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-page border border-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#093C22]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Page Size */}
                  <div>
                    <label className="font-semibold text-primary block mb-1 text-xs">
                      Default Records Page Size
                    </label>
                    <p className="text-secondary text-[11px] mb-2">
                      Number of rows displayed across administrative directory tables.
                    </p>
                    <select
                      value={settings.default_page_size || 100}
                      onChange={(e) => setSettings({ ...settings, default_page_size: parseInt(e.target.value) || 100 })}
                      className="w-full sm:w-48 px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                    >
                      <option value="50">50 rows</option>
                      <option value="100">100 rows</option>
                      <option value="250">250 rows</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Administrator Security & Save Confirmation */}
            <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
              <div className="px-5 py-4 bg-page/50 border-b border-border flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#093C22]" />
                <h2 className="font-bold text-sm text-primary">4. Save Changes Authorization</h2>
              </div>

              <div className="p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <label className="block text-primary font-semibold mb-1 text-xs">
                    Administrator Password <span className="text-red-500">*</span>
                  </label>
                  <p className="text-secondary text-[11px] mb-2">
                    Enter your active administrator password to authenticate and persist these changes.
                  </p>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Enter current admin password to save changes"
                      value={adminPasswordForSettings}
                      onChange={(e) => setAdminPasswordForSettings(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !adminPasswordForSettings}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093C22] text-white rounded-lg hover:bg-[#0c512e] disabled:opacity-50 transition-colors font-semibold text-xs shadow-2xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>

          </form>

          {/* Form: Administrator Password Update */}
          <form onSubmit={handlePasswordChange} className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
            <div className="px-5 py-4 bg-page/50 border-b border-border flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#093C22]" />
              <h2 className="font-bold text-sm text-primary">Change Administrator Password</h2>
            </div>

            <div className="p-5 space-y-4">
              {passwordMsg && (
                <div className={`p-4 rounded-xl font-medium flex items-center gap-2.5 ${
                  passwordMsgType === 'success' 
                    ? 'bg-emerald-50 text-[#093C22] border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {passwordMsgType === 'success' ? <Check className="w-4 h-4 text-[#093C22]" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <span>{passwordMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-primary font-semibold mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                  />
                </div>

                <div>
                  <label className="block text-primary font-semibold mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                  />
                </div>

                <div>
                  <label className="block text-primary font-semibold mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2 border border-border-strong rounded-lg text-primary bg-page focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-strong text-primary hover:bg-page font-semibold text-xs transition-colors shadow-2xs disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4 text-muted" />
                  <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      )}

    </div>
  );
}

