"use client";

import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  RefreshCw
} from 'lucide-react';

interface CommunityProgress {
  community_id: number;
  community_name: string;
  group_number: number;
  student_count: number;
  capacity: number;
  surveys_submitted: number;
  surveys_by_type: Record<string, number>;
  surveys_verified: number;
  surveys_flagged: number;
  open_issues: number;
  has_boundary: boolean;
}

interface ReportData {
  coordinator_name: string;
  generated_at: string;
  communities_progress: CommunityProgress[];
  issues_summary: {
    total_open: number;
    total_resolved: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
}

export default function CoordinatorReportsPage() {
  const { token, user } = useAuthStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [token]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate progress report'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-secondary">Compiling scoped supervision report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center bg-surface border border-border-strong rounded-2xl max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-primary">Unable to compile report</h3>
        <p className="text-xs text-secondary mt-1">{error || 'No active community scope found.'}</p>
        <button
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Aggregate totals
  const totalStudents = report.communities_progress.reduce((s, c) => s + c.student_count, 0);
  const totalSubmissions = report.communities_progress.reduce((s, c) => s + c.surveys_submitted, 0);
  const totalVerified = report.communities_progress.reduce((s, c) => s + c.surveys_verified, 0);
  const totalFlagged = report.communities_progress.reduce((s, c) => s + c.surveys_flagged, 0);
  const boundariesMapped = report.communities_progress.filter(c => c.has_boundary).length;
  const verificationRate = totalSubmissions > 0 ? Math.round((totalVerified / totalSubmissions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Supervision & Fieldwork Progress Report
          </h1>
          <p className="text-sm text-secondary mt-1">
            Official operational report scoped strictly to your assigned communities and cohort groups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReport}
            className="p-2 border border-border-strong bg-surface hover:bg-hover text-secondary hover:text-primary rounded-lg transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-surface border border-border-strong rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Title Header */}
        <div className="border-b border-border-strong pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Community Fieldwork & Survey System (CFSS)
              </div>
              <h2 className="text-xl font-bold text-primary mt-1">
                Fieldwork Progress & Data Quality Audit
              </h2>
            </div>
            <div className="text-right text-xs text-secondary">
              <div>Supervisor: <strong className="text-primary">{report.coordinator_name}</strong></div>
              <div className="text-muted mt-0.5">
                Generated: {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* High-Level Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl">
            <div className="text-xs text-secondary font-medium">Covered Communities</div>
            <div className="text-2xl font-bold text-primary mt-1">{report.communities_progress.length}</div>
            <div className="text-[11px] text-muted">{boundariesMapped} boundaries mapped</div>
          </div>

          <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl">
            <div className="text-xs text-secondary font-medium">Fieldworkers Enrolled</div>
            <div className="text-2xl font-bold text-primary mt-1">{totalStudents}</div>
            <div className="text-[11px] text-muted">Across assigned cohorts</div>
          </div>

          <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl">
            <div className="text-xs text-secondary font-medium">Total Submissions</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalSubmissions}</div>
            <div className="text-[11px] text-muted">{totalVerified} quality verified</div>
          </div>

          <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl">
            <div className="text-xs text-secondary font-medium">Verification Saturation</div>
            <div className="text-2xl font-bold text-primary mt-1">{verificationRate}%</div>
            <div className="text-[11px] text-muted">{totalFlagged} flagged submissions</div>
          </div>
        </div>

        {/* Community By Community Table */}
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Fieldwork Saturation by Community & Group
          </h3>

          <div className="border border-border-strong rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-secondary font-semibold uppercase tracking-wider border-b border-border-strong">
                <tr>
                  <th className="py-3 px-3">Community</th>
                  <th className="py-3 px-3">Group</th>
                  <th className="py-3 px-3">Students</th>
                  <th className="py-3 px-3">Total Surveys</th>
                  <th className="py-3 px-3">Surveys by Type</th>
                  <th className="py-3 px-3">Verified / Flagged</th>
                  <th className="py-3 px-3">Open Issues</th>
                  <th className="py-3 px-3">Boundary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {report.communities_progress.map(cp => (
                  <tr key={cp.community_id} className="hover:bg-hover/40">
                    <td className="py-3 px-3 font-bold text-primary">{cp.community_name}</td>
                    <td className="py-3 px-3 font-semibold text-secondary">Group {cp.group_number}</td>
                    <td className="py-3 px-3">{cp.student_count}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {cp.surveys_submitted}
                    </td>
                    <td className="py-3 px-3 text-secondary">
                      {Object.entries(cp.surveys_by_type).map(([t, c]) => `${t}: ${c}`).join(', ') || 'None'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-600 font-semibold">{cp.surveys_verified} v</span>
                      {' / '}
                      <span className="text-rose-600 font-semibold">{cp.surveys_flagged} f</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cp.open_issues > 0 ? 'text-amber-600 font-bold' : 'text-muted'}>
                        {cp.open_issues}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {cp.has_boundary ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Audit & Investigation Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Issues by Anomaly Type */}
          <div className="p-4 bg-subtle border border-border-subtle rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Incidents by Anomaly Type
            </h4>
            {Object.keys(report.issues_summary.by_type).length === 0 ? (
              <div className="text-xs text-muted italic">No anomalies logged in assigned scope.</div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(report.issues_summary.by_type).map(([typ, cnt]) => (
                  <div key={typ} className="flex items-center justify-between text-xs">
                    <span className="text-secondary">{typ.replace('_', ' ')}</span>
                    <span className="font-bold text-primary">{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issues by Lifecycle Status */}
          <div className="p-4 bg-subtle border border-border-subtle rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Investigation Resolutions
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Open Incidents:</span>
                <span className="font-bold text-amber-600">{report.issues_summary.total_open}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Resolved & Verified:</span>
                <span className="font-bold text-emerald-600">{report.issues_summary.total_resolved}</span>
              </div>
              {Object.entries(report.issues_summary.by_status).map(([st, cnt]) => (
                <div key={st} className="flex items-center justify-between text-muted text-[11px]">
                  <span>Status {st.replace('_', ' ')}</span>
                  <span>{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Sign-off Block for Printouts */}
        <div className="pt-8 border-t border-border-strong text-xs text-secondary flex justify-between items-end print:flex">
          <div>
            <div>Coordinator Signature: __________________________________</div>
            <div className="mt-1 text-[11px] text-muted">Field Faculty Supervisor</div>
          </div>
          <div>
            <div>Date of Verification: __________________________________</div>
            <div className="mt-1 text-[11px] text-muted">CFSS Quality Assurance</div>
          </div>
        </div>
      </div>
    </div>
  );
}

