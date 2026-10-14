"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Building2,
  Users,
  FileCheck2,
  AlertTriangle,
  MapPin,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Compass,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface OverviewStats {
  assigned_communities_count: number;
  assigned_groups: number[];
  assigned_fieldworkers_count: number;
  surveys_total: number;
  surveys_submitted: number;
  surveys_verified: number;
  surveys_flagged: number;
  surveys_pending_review: number;
  open_issues_count: number;
  resolved_issues_count: number;
  gis_summary: {
    has_boundary_count: number;
    total_roads: number;
    total_facilities: number;
  };
  recent_activity: Array<{
    type: string;
    id: string;
    entity_id: string;
    survey_type: string;
    student_name: string;
    student_index: string;
    community_name: string;
    timestamp: string;
    review_status: string;
  }>;
}

export default function CoordinatorOverviewPage() {
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadStats();
  }, [token]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load supervisor metrics'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-secondary">Loading supervision dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-surface border border-border-strong rounded-2xl max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-primary">Unable to load coordinator data</h3>
        <p className="text-xs text-secondary mt-1">{error || 'Please ensure you have active community assignments.'}</p>
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Supervisor Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-emerald-950/20 to-surface border border-emerald-800/40 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Supervision Scope Active</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Welcome, {user?.full_name || 'Coordinator'}
            </h1>
            <p className="text-sm text-secondary mt-1">
              Supervising <strong className="text-primary">{stats.assigned_communities_count} communities</strong> across{' '}
              <strong className="text-primary">{stats.assigned_groups.length} cohort {stats.assigned_groups.length === 1 ? 'group' : 'groups'}</strong> ({stats.assigned_groups.map(g => `Group ${g}`).join(', ') || 'No groups assigned'}).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/coordinator/surveys"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Review Submissions ({stats.surveys_pending_review})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fieldworkers */}
        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Supervised Fieldworkers</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{stats.assigned_fieldworkers_count}</div>
          <div className="text-xs text-secondary mt-1 flex items-center justify-between">
            <span>Students in assigned scope</span>
            <Link href="/coordinator/fieldworkers" className="text-emerald-600 hover:underline inline-flex items-center text-[11px]">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Surveys & Verified */}
        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Total Submissions</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{stats.surveys_submitted}</div>
          <div className="text-xs text-secondary mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">{stats.surveys_verified} verified</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{stats.surveys_pending_review} pending</span>
          </div>
        </div>

        {/* Flagged & Investigations */}
        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Investigation Issues</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.open_issues_count}</div>
          <div className="text-xs text-secondary mt-1 flex items-center justify-between">
            <span>{stats.resolved_issues_count} resolved incidents</span>
            <Link href="/coordinator/investigations" className="text-amber-600 hover:underline inline-flex items-center text-[11px]">
              Queue <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Community GIS Coverage */}
        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Community GIS Assets</span>
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {stats.gis_summary.total_facilities + stats.gis_summary.total_roads}
          </div>
          <div className="text-xs text-secondary mt-1">
            {stats.gis_summary.has_boundary_count} of {stats.assigned_communities_count} boundaries mapped
          </div>
        </div>
      </div>

      {/* Main Content Grid: Activity Stream & Supervision Quicklinks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Submissions & Quality Review Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Recent Field Submissions
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Latest survey responses recorded by supervised fieldworkers
                </p>
              </div>
              <Link
                href="/coordinator/surveys"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Inspection Gate <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {stats.recent_activity.length === 0 ? (
              <div className="py-12 text-center text-secondary">
                <FileCheck2 className="w-8 h-8 text-muted opacity-40 mx-auto mb-2" />
                <p className="text-xs">No survey submissions recorded yet in your assigned communities.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {stats.recent_activity.map(act => (
                  <div key={act.id} className="py-3 flex items-center justify-between gap-3 hover:bg-hover/50 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-subtle px-1.5 py-0.5 rounded border border-border-subtle">
                          {act.entity_id}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                          {act.survey_type}
                        </span>
                        <span className="text-xs text-muted">•</span>
                        <span className="text-xs text-secondary truncate">{act.community_name}</span>
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        By <span className="text-primary font-medium">{act.student_name}</span> ({act.student_index})
                        {act.timestamp && (
                          <span className="text-muted ml-2">
                            • {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          act.review_status === 'VERIFIED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : act.review_status === 'FLAGGED'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {act.review_status}
                      </span>
                      <Link
                        href={`/coordinator/surveys?survey_id=${act.id}`}
                        className="p-1 rounded-md text-secondary hover:text-primary hover:bg-subtle"
                        title="Inspect Submission"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links & Scope Summary */}
        <div className="space-y-4">
          {/* Quick Actions Panel */}
          <div className="bg-surface border border-border-strong rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-primary mb-3">Supervision Actions</h3>
            <div className="space-y-2">
              <Link
                href="/coordinator/surveys"
                className="flex items-center justify-between p-3 rounded-xl border border-border-strong bg-subtle hover:bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary group-hover:text-emerald-600 transition-colors">
                      Quality Review Gate
                    </div>
                    <div className="text-[11px] text-secondary">Verify or flag submissions</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/coordinator/investigations"
                className="flex items-center justify-between p-3 rounded-xl border border-border-strong bg-subtle hover:bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary group-hover:text-amber-600 transition-colors">
                      Fieldwork Investigations
                    </div>
                    <div className="text-[11px] text-secondary">Track anomalies and resolutions</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/coordinator/map"
                className="flex items-center justify-between p-3 rounded-xl border border-border-strong bg-subtle hover:bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary group-hover:text-blue-600 transition-colors">
                      GIS & Boundary Inspection
                    </div>
                    <div className="text-[11px] text-secondary">Read-only spatial validation</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/coordinator/reports"
                className="flex items-center justify-between p-3 rounded-xl border border-border-strong bg-subtle hover:bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-primary group-hover:text-purple-600 transition-colors">
                      Scoped Progress Reports
                    </div>
                    <div className="text-[11px] text-secondary">Export & audit summary</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          {/* Assigned Cohort Groups Badge List */}
          <div className="bg-surface border border-border-strong rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
              Assigned Cohort Groups
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.assigned_groups.length > 0 ? (
                stats.assigned_groups.map(grp => (
                  <Link
                    key={grp}
                    href={`/coordinator/communities?group=${grp}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    Group {grp}
                  </Link>
                ))
              ) : (
                <div className="text-xs text-muted italic">No groups assigned yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

