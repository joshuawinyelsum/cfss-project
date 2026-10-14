"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Users,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  GraduationCap,
  Clock,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus
} from 'lucide-react';

interface Fieldworker {
  id: number;
  student_id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  faculty?: string | null;
  program?: string | null;
  community_id: number;
  community_name: string;
  group_number: number;
  submissions_count: number;
  drafts_count: number;
  last_activity?: string | null;
  open_issues_count: number;
  is_active: boolean;
}

interface StudentDetailData {
  student: Fieldworker;
  surveys: Array<{
    id: string;
    entity_id: string;
    survey_type: string;
    status: string;
    review_status: string;
    submitted_at?: string | null;
    created_at: string;
  }>;
  issues: Array<{
    id: string;
    title: string;
    issue_type: string;
    severity: string;
    status: string;
    created_at: string;
  }>;
}

export default function CoordinatorFieldworkersPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const paramStudentId = searchParams.get('student_id');

  const [fieldworkers, setFieldworkers] = useState<Fieldworker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedCommunity, setSelectedCommunity] = useState('ALL');

  // Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<StudentDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadFieldworkers();
  }, [token]);

  useEffect(() => {
    if (paramStudentId && token) {
      handleInspectStudent(parseInt(paramStudentId, 10));
    }
  }, [paramStudentId, token]);

  const loadFieldworkers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/fieldworkers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFieldworkers(res.data || []);
    } catch (err) {
      setToast(getErrorMessage(err, 'Failed to load fieldworkers'));
    } finally {
      setLoading(false);
    }
  };

  const handleInspectStudent = async (studentId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/coordinator/fieldworkers/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDetail(res.data);
    } catch (err) {
      setToast(getErrorMessage(err, 'Failed to load student details'));
    } finally {
      setDetailLoading(false);
    }
  };

  // Distinct groups & communities
  const groups = useMemo(() => {
    const s = new Set<number>();
    fieldworkers.forEach(f => {
      if (f.group_number != null) s.add(f.group_number);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [fieldworkers]);

  const communities = useMemo(() => {
    const map = new Map<number, string>();
    fieldworkers.forEach(f => {
      if (f.community_id && f.community_name) map.set(f.community_id, f.community_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [fieldworkers]);

  // Filtered fieldworkers
  const filtered = useMemo(() => {
    return fieldworkers.filter(f => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.faculty && f.faculty.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.email && f.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGroup = selectedGroup === 'ALL' || f.group_number === parseInt(selectedGroup, 10);
      const matchesCommunity = selectedCommunity === 'ALL' || f.community_id === parseInt(selectedCommunity, 10);

      return matchesSearch && matchesGroup && matchesCommunity;
    });
  }, [fieldworkers, searchQuery, selectedGroup, selectedCommunity]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Supervised Fieldworkers
          </h1>
          <p className="text-sm text-secondary mt-1">
            Monitor student field activity, survey submission output, and individual quality records across assigned cohorts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coordinator/investigations"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Investigation Queue</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, index ID, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Groups</option>
            {groups.map(g => (
              <option key={g} value={g.toString()}>
                Group {g}
              </option>
            ))}
          </select>

          <select
            value={selectedCommunity}
            onChange={e => setSelectedCommunity(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Communities</option>
            {communities.map(c => (
              <option key={c.id} value={c.id.toString()}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fieldworkers Table */}
      <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-secondary">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading fieldworkers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <Users className="w-10 h-10 text-muted opacity-40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-primary">No fieldworkers found</h3>
            <p className="text-xs text-secondary mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No students found in your assigned communities.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-secondary border-b border-border-strong text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fieldworker</th>
                  <th className="py-3 px-4">Student ID & Faculty</th>
                  <th className="py-3 px-4">Assigned Community</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4">Issues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(fw => (
                  <tr key={fw.id} className="hover:bg-hover/50 transition-colors">
                    {/* Student Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {fw.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-primary">{fw.name}</div>
                          {fw.email && <div className="text-xs text-secondary truncate">{fw.email}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Student ID & Faculty */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-primary">{fw.student_id}</div>
                      <div className="text-xs text-secondary mt-0.5">{fw.faculty || fw.program || 'Unassigned Faculty'}</div>
                    </td>

                    {/* Community */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{fw.community_name}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-subtle text-secondary border border-border-subtle mt-0.5">
                        Group {fw.group_number}
                      </span>
                    </td>

                    {/* Submissions vs Drafts */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fw.submissions_count} submitted
                      </div>
                      <div className="text-xs text-muted">{fw.drafts_count} drafts</div>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3 px-4">
                      {fw.last_activity ? (
                        <div className="text-xs text-secondary">
                          {new Date(fw.last_activity).toLocaleDateString()}{' '}
                          <span className="text-muted">
                            {new Date(fw.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">No activity</span>
                      )}
                    </td>

                    {/* Issues Flag */}
                    <td className="py-3 px-4">
                      {fw.open_issues_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          {fw.open_issues_count} open
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> None
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectStudent(fw.id)}
                        className="px-3 py-1.5 rounded-lg border border-border-strong bg-subtle hover:bg-hover text-xs font-medium text-primary transition-colors inline-flex items-center gap-1"
                      >
                        <span>Profile & Submissions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          FIELDWORKER PROFILE & WORKFLOW INSPECTION MODAL
      ========================================================================= */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm">
                  {selectedDetail.student.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">{selectedDetail.student.name}</h3>
                  <div className="text-xs text-secondary font-mono">
                    {selectedDetail.student.student_id} • {selectedDetail.student.community_name} (Group {selectedDetail.student.group_number})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Contact and Overview Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Contact Details</div>
                  <div className="text-xs text-primary font-medium mt-1 truncate">
                    {selectedDetail.student.email || 'No email registered'}
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    {selectedDetail.student.phone_number || 'No phone registered'}
                  </div>
                </div>

                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Faculty & Program</div>
                  <div className="text-xs text-primary font-medium mt-1 truncate">
                    {selectedDetail.student.faculty || 'Unspecified Faculty'}
                  </div>
                  <div className="text-xs text-secondary mt-0.5 truncate">
                    {selectedDetail.student.program || 'Undergraduate'}
                  </div>
                </div>

                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Fieldwork Output</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedDetail.surveys.length} submissions
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    {selectedDetail.issues.length} flagged incidents
                  </div>
                </div>
              </div>

              {/* Submissions Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Submitted Surveys ({selectedDetail.surveys.length})
                  </h4>
                </div>

                {selectedDetail.surveys.length === 0 ? (
                  <div className="py-6 text-center text-secondary border border-border-subtle rounded-xl">
                    No survey submissions on record for this student.
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle border border-border-strong rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {selectedDetail.surveys.map(s => (
                      <div key={s.id} className="p-3 flex items-center justify-between text-xs hover:bg-hover/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">{s.entity_id}</span>
                            <span className="uppercase font-semibold text-secondary">{s.survey_type}</span>
                          </div>
                          <div className="text-muted mt-0.5">
                            {s.submitted_at
                              ? `Submitted ${new Date(s.submitted_at).toLocaleDateString()}`
                              : `Created ${new Date(s.created_at).toLocaleDateString()}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              s.review_status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : s.review_status === 'FLAGGED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {s.review_status}
                          </span>
                          <Link
                            href={`/coordinator/surveys?survey_id=${s.id}`}
                            className="p-1 text-secondary hover:text-primary"
                            title="Inspect Survey"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Issues / Investigations Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Fieldwork Issues & Incidents ({selectedDetail.issues.length})
                  </h4>
                  <Link
                    href={`/coordinator/investigations?create=true&student_id=${selectedDetail.student.id}&community_id=${selectedDetail.student.community_id}`}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Raise New Issue
                  </Link>
                </div>

                {selectedDetail.issues.length === 0 ? (
                  <div className="py-6 text-center text-secondary border border-border-subtle rounded-xl">
                    No investigation incidents or anomalies raised for this student.
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle border border-border-strong rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {selectedDetail.issues.map(iss => (
                      <div key={iss.id} className="p-3 flex items-center justify-between text-xs hover:bg-hover/50">
                        <div>
                          <div className="font-semibold text-primary">{iss.title}</div>
                          <div className="text-secondary mt-0.5">
                            Type: {iss.issue_type} • Severity: {iss.severity}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            iss.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : iss.status === 'UNDER_INVESTIGATION'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {iss.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-strong flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-subtle hover:bg-hover text-sm font-semibold text-primary rounded-lg transition-colors border border-border-strong"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

