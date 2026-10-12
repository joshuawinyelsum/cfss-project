"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Users,
  Sliders,
  Building2,
  AlertCircle,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileText,
  FileCheck,
  Layers,
  ExternalLink
} from 'lucide-react';

interface Student {
  id: string | number;
  student_id: string;
  name: string;
  faculty?: string;
  program?: string;
  community_id?: number | null;
  community_name?: string | null;
  group_number?: number | null;
}

interface Community {
  id: number;
  name: string;
  capacity?: number;
  current_count?: number;
  district?: string;
  region?: string;
  group_number?: number;
}

interface WhitelistSummary {
  total_files: number;
  active_files: number;
  expected_students?: number;
  expected_registrations: number;
  registered_students?: number;
  awaiting_registration?: number;
  active_expected_students?: number;
  active_expected_registrations: number;
  active_registered_students?: number;
  active_awaiting_registration?: number;
}

interface SurveyStats {
  total_surveys: number;
  total_drafts?: number;
  submitted_today?: number;
  submitted_last_7_days?: number;
  submitted_last_30_days?: number;
  by_community?: { community_name: string; count: number }[];
  by_type?: { survey_type: string; count: number }[];
}

interface AuditLog {
  id: number;
  action: string;
  user_id?: string | null;
  metadata_payload?: Record<string, any> | null;
  timestamp?: string | null;
}

export default function AdminDashboardPage() {
  const { user, token } = useAdminAuthStore();
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [whitelistSummary, setWhitelistSummary] = useState<WhitelistSummary | null>(null);
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    updateTime();

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, router, token]);

  const fetchData = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      const opts = { headers: { Authorization: `Bearer ${activeToken}` } };
      const [commRes, setRes, studRes, wlRes, survRes, actRes] = await Promise.allSettled([
        api.get('/api/admin/communities', opts),
        api.get('/api/admin/settings', opts),
        api.get('/api/admin/students', opts),
        api.get('/api/admin/whitelist/summary', opts),
        api.get('/api/admin/surveys/stats', opts),
        api.get('/api/admin/activity', opts)
      ]);

      if (commRes.status === 'fulfilled') setCommunities(commRes.value.data || []);
      if (setRes.status === 'fulfilled') setRegistrationOpen(Boolean(setRes.value.data?.registration_open));
      if (studRes.status === 'fulfilled') setStudents(studRes.value.data || []);
      if (wlRes.status === 'fulfilled') setWhitelistSummary(wlRes.value.data || null);
      if (survRes.status === 'fulfilled') setSurveyStats(survRes.value.data || null);
      if (actRes.status === 'fulfilled') setActivityLogs(actRes.value.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Authoritative operational figures
  const metrics = useMemo(() => {
    const regStudents = whitelistSummary?.registered_students ?? students.length;
    const expStudents = whitelistSummary?.expected_students ?? whitelistSummary?.expected_registrations ?? 0;
    const awaitingReg = whitelistSummary?.awaiting_registration ?? Math.max(0, expStudents - regStudents);
    const progressPct = expStudents > 0 ? Math.round((regStudents / expStudents) * 100) : (regStudents > 0 ? 100 : 0);
    const totalComms = communities.length;
    const totalSurveys = surveyStats?.total_surveys ?? 0;
    const assignedCount = students.filter(s => s.community_id || s.community_name).length;
    const unassignedCount = Math.max(0, students.length - assignedCount);

    return {
      registeredStudents: regStudents,
      expectedStudents: expStudents,
      awaitingRegistration: awaitingReg,
      progressPct,
      totalCommunities: totalComms,
      totalSurveys,
      assignedCount,
      unassignedCount
    };
  }, [whitelistSummary, students, communities, surveyStats]);

  // Survey instrument breakdown
  const surveyTypeBreakdown = useMemo(() => {
    const defaultTypes = ['HOUSEHOLD', 'EDUCATION', 'HEALTH', 'GOVERNANCE'];
    const total = surveyStats?.total_surveys || 1;
    return defaultTypes.map((t) => {
      const match = surveyStats?.by_type?.find(item => item.survey_type.toUpperCase() === t);
      const count = match?.count || 0;
      return {
        type: t,
        label: t.charAt(0) + t.slice(1).toLowerCase(),
        count,
        pct: Math.round((count / total) * 100)
      };
    });
  }, [surveyStats]);

  // Faculty distribution
  const facultyDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const f = s.faculty || 'General Sciences';
      counts[f] = (counts[f] || 0) + 1;
    });
    const total = students.length || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [students]);

  // Students requiring placement
  const studentsNeedingAttention = useMemo(() => {
    return students.filter(s => !s.community_id && !s.community_name).slice(0, 5);
  }, [students]);

  if (!user) return null;

  return (
    <div className="space-y-6 text-primary animate-fade-in pb-12">

      {/* Title & Date Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-border-strong pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Institutional Administration Dashboard</h1>
          <p className="text-sm text-secondary mt-1">
            Real-time status of student registration intake, fieldwork allocation, and community survey collection.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-secondary">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>{currentDateTime}</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface border border-transparent hover:border-border-strong transition-colors"
            title="Refresh statistics"
            aria-label="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Row 1: Intake & Registration Lifecycle Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Registered Students */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Registered students</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {metrics.registeredStudents.toLocaleString()}
          </div>
          <div className="text-xs text-secondary mt-1">
            of <strong className="text-primary font-semibold">{metrics.expectedStudents.toLocaleString()}</strong> eligible students
          </div>
        </div>

        {/* Metric 2: Registration Progress */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Registration progress</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              %
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {metrics.progressPct}%
          </div>
          <div className="w-full bg-page rounded-full h-2 mt-2.5 overflow-hidden border border-border">
            <div
              className="bg-[#093C22] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.progressPct)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Outstanding Eligible */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Awaiting registration</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              metrics.awaitingRegistration > 0 ? 'bg-amber-50 text-amber-700' : 'bg-page text-muted'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {metrics.awaitingRegistration.toLocaleString()}
          </div>
          <div className="text-xs text-secondary mt-1">
            Eligible whitelist candidates pending
          </div>
        </div>

        {/* Metric 4: Registration Window Status */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Registration availability</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              registrationOpen ? 'bg-emerald-50 text-[#093C22]' : 'bg-page text-muted'
            }`}>
              <Sliders className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2 flex items-center gap-2">
            <span>{registrationOpen ? 'Open' : 'Closed'}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${registrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
          </div>
          <div className="text-xs text-secondary mt-1 flex items-center justify-between">
            <span>{registrationOpen ? 'Intake gateway active' : 'Self-enrollment locked'}</span>
            <Link href="/admin/registration" className="text-[#093C22] hover:underline font-semibold text-xs">
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Operational Data Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 5: Total Communities */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Fieldwork communities</span>
            <div className="w-10 h-10 rounded-lg bg-page text-secondary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {metrics.totalCommunities}
          </div>
          <div className="text-xs text-secondary mt-1">
            Active geographical survey clusters
          </div>
        </div>

        {/* Metric 6: Field Survey Submissions */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Survey submissions</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#093C22] mt-2">
            {metrics.totalSurveys}
          </div>
          <div className="text-xs text-secondary mt-1 flex items-center justify-between">
            <span>Submitted fieldwork records</span>
            <Link href="/admin/surveys" className="text-[#093C22] hover:underline font-semibold text-xs">
              View →
            </Link>
          </div>
        </div>

        {/* Metric 7: CV Submissions */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">CV submissions</span>
            <div className="w-10 h-10 rounded-lg bg-page text-muted flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-muted mt-2 flex items-center gap-2">
            <span>0</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-page text-muted border border-border">
              Not configured
            </span>
          </div>
          <div className="text-xs text-muted mt-1">
            Module inactive for current session
          </div>
        </div>

        {/* Metric 8: Group Allocation */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Allocated to groups</span>
            <div className="w-10 h-10 rounded-lg bg-page text-secondary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {metrics.assignedCount}
          </div>
          <div className="text-xs text-secondary mt-1">
            <strong className="text-amber-700 font-semibold">{metrics.unassignedCount}</strong> unallocated students
          </div>
        </div>
      </div>

      {/* Visualizations Grid: Survey Breakdown & Community Placement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Survey Submissions by Type (1 col) */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#093C22]" />
              <h2 className="text-sm font-bold text-primary">Survey Module Submissions</h2>
            </div>
            <span className="text-xs font-semibold text-secondary">
              {metrics.totalSurveys} Total
            </span>
          </div>

          <div className="p-5 space-y-4">
            {surveyTypeBreakdown.map((item) => (
              <div key={item.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">{item.label}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <strong className="text-primary">{item.count}</strong>
                    <span className="text-muted">({item.pct}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-page rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-[#093C22] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, item.pct)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-border text-xs">
              <Link
                href="/admin/surveys"
                className="inline-flex items-center gap-1.5 text-[#093C22] hover:underline font-semibold"
              >
                <span>Explore field submissions repository</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Community Placement vs Capacity (2 cols) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#093C22]" />
              <h2 className="text-sm font-bold text-primary">Community Placement vs Capacity Quotas</h2>
            </div>
            <Link
              href="/admin/communities"
              className="inline-flex items-center gap-1 text-xs text-[#093C22] hover:underline font-semibold"
            >
              <span>Manage communities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5">
            {communities.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No fieldwork communities configured yet.
              </div>
            ) : (
              <div className="space-y-4">
                {communities.slice(0, 5).map((comm) => {
                  const count = comm.current_count || 0;
                  const capacity = comm.capacity || 20;
                  const pct = Math.min(100, Math.round((count / capacity) * 100));
                  const isFull = count >= capacity;

                  return (
                    <div key={comm.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-primary truncate">{comm.name}</span>
                          {comm.district && (
                            <span className="text-[11px] text-muted truncate">({comm.district})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-primary">{count}</span>
                          <span className="text-muted">/</span>
                          <span className="text-secondary font-medium">{capacity} slots</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isFull
                              ? 'bg-red-50 text-red-700'
                              : pct > 80
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-[#093C22]'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      {/* Comparative Progress Bar */}
                      <div className="h-2 bg-page rounded-full overflow-hidden border border-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? 'bg-red-500' : 'bg-[#093C22]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Section: Registration Summary & Faculty Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Registration Window Information (1 col) */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">Registration Intake Policy</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              registrationOpen ? 'bg-emerald-50 text-emerald-800' : 'bg-page text-secondary border border-border'
            }`}>
              {registrationOpen ? 'Active' : 'Locked'}
            </span>
          </div>

          <div className="p-5 space-y-3.5 text-xs">
            <div>
              <div className="text-muted">Academic Year</div>
              <div className="text-primary font-semibold mt-0.5">2025/2026 Academic Session</div>
            </div>
            <div>
              <div className="text-muted">Eligible Cohorts</div>
              <div className="text-primary font-semibold mt-0.5">Level 200, 300, 400</div>
            </div>
            <div>
              <div className="text-muted">Security Requirement</div>
              <div className="text-primary font-semibold mt-0.5">Active whitelist roster enrollment verified</div>
            </div>

            <div className="pt-3 border-t border-border">
              <Link
                href="/admin/registration"
                className="inline-flex items-center gap-1.5 text-xs text-[#093C22] hover:underline font-semibold"
              >
                <span>Manage registration gateway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Students by Faculty (2 cols) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">Students by Faculty / Department</h2>
            <span className="text-xs text-secondary font-medium">{students.length} Total Registered</span>
          </div>

          <div className="p-5">
            {facultyDistribution.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No faculty distribution data available.
              </div>
            ) : (
              <div className="space-y-3.5">
                {facultyDistribution.map(f => (
                  <div key={f.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-primary font-medium">{f.name}</span>
                      <span className="text-secondary font-semibold">{f.count} ({f.pct}%)</span>
                    </div>
                    <div className="h-2 bg-page rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-[#093C22] rounded-full transition-all duration-500"
                        style={{ width: `${f.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Requiring Attention and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Students Requiring Attention */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">Students Requiring Group Allocation</h2>
            <Link href="/admin/students" className="text-xs text-[#093C22] hover:underline font-semibold">
              View all students
            </Link>
          </div>

          <div className="p-5">
            {studentsNeedingAttention.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>All registered students currently have community allocations.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-secondary border-b border-border">
                      <th className="py-2.5 font-semibold">Index No.</th>
                      <th className="py-2.5 font-semibold">Name</th>
                      <th className="py-2.5 font-semibold">Faculty</th>
                      <th className="py-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-primary">
                    {studentsNeedingAttention.map(s => (
                      <tr key={s.id} className="hover:bg-page transition-colors">
                        <td className="py-2.5 font-mono text-secondary">{s.student_id}</td>
                        <td className="py-2.5 text-primary font-semibold">{s.name}</td>
                        <td className="py-2.5 text-secondary">{s.faculty || '—'}</td>
                        <td className="py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800">
                            Unassigned
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-border bg-page/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">Recent Institutional Audit Log</h2>
            <Link href="/admin/activity" className="text-xs text-[#093C22] hover:underline font-semibold">
              View full audit log
            </Link>
          </div>

          <div className="p-5">
            {activityLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No recent administrative actions recorded.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {activityLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="py-3 flex items-baseline justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <span className="font-semibold text-primary">{log.action}</span>
                      <span className="text-secondary ml-2 font-mono text-[11px]">
                        {log.user_id ? `By User #${log.user_id}` : 'System Action'}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted font-mono shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
