"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  AlertTriangle,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  X,
  FileCheck2,
  Calendar,
  MessageSquare,
  Building2,
  Users,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface FieldworkIssue {
  id: string;
  community_id: number;
  community_name: string;
  group_number: number;
  student_id: number;
  student_name: string;
  student_index: string;
  survey_id?: string | null;
  survey_type?: string | null;
  created_by_id: number;
  created_by_name: string;
  title: string;
  issue_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'ESCALATED';
  reason: string;
  evidence?: any | null;
  fieldworker_explanation?: string | null;
  action_requested?: string | null;
  outcome?: string | null;
  deadline?: string | null;
  resolved_at?: string | null;
  escalated_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ScopeOption {
  community_id: number;
  community_name: string;
  group_number: number;
  students: Array<{ id: number; name: string; student_id: string }>;
}

export default function CoordinatorInvestigationsPage() {
  const { token, user } = useAuthStore();
  const searchParams = useSearchParams();

  const [issues, setIssues] = useState<FieldworkIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeIssue, setActiveIssue] = useState<FieldworkIssue | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    community_id: '',
    student_id: '',
    survey_id: '',
    title: '',
    issue_type: 'DATA_ANOMALY',
    severity: 'MEDIUM',
    reason: '',
    evidence: '',
    action_requested: '',
    deadline: ''
  });

  // Manage / Update form state
  const [updateForm, setUpdateForm] = useState({
    fieldworker_explanation: '',
    outcome: '',
    action_requested: '',
    status: '',
    severity: ''
  });

  useEffect(() => {
    if (!token) return;
    loadIssues();
    loadSupervisionScope();
  }, [token]);

  // Handle URL pre-fill params (e.g. from Survey Review or Fieldworker Profile)
  useEffect(() => {
    const isCreate = searchParams.get('create') === 'true';
    const cId = searchParams.get('community_id');
    const sId = searchParams.get('student_id');
    const survId = searchParams.get('survey_id');

    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        community_id: cId || prev.community_id,
        student_id: sId || prev.student_id,
        survey_id: survId || prev.survey_id,
        title: survId ? `Anomaly flagged on survey ${survId.slice(0, 8)}` : prev.title
      }));
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/issues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIssues(res.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load investigation issues'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSupervisionScope = async () => {
    try {
      const commsRes = await api.get('/api/coordinator/communities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const commsList = commsRes.data || [];

      // Fetch students roster for each assigned community
      const opts: ScopeOption[] = [];
      for (const comm of commsList) {
        try {
          const detail = await api.get(`/api/coordinator/communities/${comm.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          opts.push({
            community_id: comm.id,
            community_name: comm.name,
            group_number: comm.group_number,
            students: detail.data.roster || []
          });
        } catch {
          // ignore
        }
      }
      setScopeOptions(opts);
    } catch {
      // ignore
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.community_id || !createForm.student_id || !createForm.title.trim() || !createForm.reason.trim()) {
      showToast('Community, student, title, and reason are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const payload: any = {
        community_id: parseInt(createForm.community_id, 10),
        student_id: parseInt(createForm.student_id, 10),
        survey_id: createForm.survey_id.trim() || undefined,
        title: createForm.title.trim(),
        issue_type: createForm.issue_type,
        severity: createForm.severity,
        reason: createForm.reason.trim(),
        evidence: createForm.evidence.trim() || undefined,
        action_requested: createForm.action_requested.trim() || undefined,
        deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : undefined
      };

      await api.post('/api/coordinator/issues', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Investigation issue raised successfully');
      setShowCreateModal(false);
      setCreateForm({
        community_id: '',
        student_id: '',
        survey_id: '',
        title: '',
        issue_type: 'DATA_ANOMALY',
        severity: 'MEDIUM',
        reason: '',
        evidence: '',
        action_requested: '',
        deadline: ''
      });
      await loadIssues();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to raise issue'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenManage = (issue: FieldworkIssue) => {
    setActiveIssue(issue);
    setUpdateForm({
      fieldworker_explanation: issue.fieldworker_explanation || '',
      outcome: issue.outcome || '',
      action_requested: issue.action_requested || '',
      status: issue.status,
      severity: issue.severity
    });
  };

  const handleUpdateSubmit = async (statusOverride?: string) => {
    if (!activeIssue) return;
    setActionLoading(true);
    try {
      const payload: any = {
        fieldworker_explanation: updateForm.fieldworker_explanation.trim() || undefined,
        outcome: updateForm.outcome.trim() || undefined,
        action_requested: updateForm.action_requested.trim() || undefined,
        status: statusOverride || updateForm.status,
        severity: updateForm.severity || undefined
      };

      await api.patch(`/api/coordinator/issues/${activeIssue.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Issue updated: status is now ${payload.status}`);
      setActiveIssue(null);
      await loadIssues();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update issue'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics calculation
  const totalOpen = issues.filter(i => i.status === 'OPEN').length;
  const totalInvestigation = issues.filter(i => i.status === 'UNDER_INVESTIGATION').length;
  const totalResolved = issues.filter(i => i.status === 'RESOLVED').length;
  const totalEscalated = issues.filter(i => i.status === 'ESCALATED').length;

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
      const matchesSeverity = severityFilter === 'ALL' || i.severity === severityFilter;
      const matchesSearch =
        searchQuery === '' ||
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.student_index.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.community_name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [issues, statusFilter, severityFilter, searchQuery]);

  // Students for the currently selected community in create modal
  const selectedCommunityStudents = useMemo(() => {
    if (!createForm.community_id) return [];
    const found = scopeOptions.find(o => o.community_id === parseInt(createForm.community_id, 10));
    return found ? found.students : [];
  }, [createForm.community_id, scopeOptions]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Review & Investigation Queue
          </h1>
          <p className="text-sm text-secondary mt-1">
            Track suspicious fieldwork activity, repetitive patterns, GPS discrepancies, record student explanations, and resolve or escalate incidents.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Investigation</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border-strong rounded-xl p-3.5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary">Open</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{totalOpen}</div>
          <div className="text-[11px] text-muted mt-0.5">Awaiting initial review</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-3.5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary">In Review</div>
          <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{totalInvestigation}</div>
          <div className="text-[11px] text-muted mt-0.5">Field explanation pending</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-3.5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalResolved}</div>
          <div className="text-[11px] text-muted mt-0.5">Corrective action verified</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-3.5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary">Escalated</div>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{totalEscalated}</div>
          <div className="text-[11px] text-muted mt-0.5">Referred to Admin</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, student, locality..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          {/* Severity selector */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-secondary">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading investigation queue...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-60 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-primary">No issues in this queue</h3>
            <p className="text-xs text-secondary mt-1">
              All fieldwork submissions and activities in your assigned scope are currently in good order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-secondary border-b border-border-strong text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Incident Title</th>
                  <th className="py-3 px-4">Severity & Type</th>
                  <th className="py-3 px-4">Fieldworker</th>
                  <th className="py-3 px-4">Community</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredIssues.map(iss => (
                  <tr key={iss.id} className="hover:bg-hover/50 transition-colors">
                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{iss.title}</div>
                      <div className="text-xs text-secondary truncate max-w-xs">{iss.reason}</div>
                      {iss.survey_id && (
                        <div className="text-[11px] text-muted font-mono mt-0.5">
                          Linked Survey: {iss.survey_id.slice(0, 8)}...
                        </div>
                      )}
                    </td>

                    {/* Severity & Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          iss.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : iss.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                            : iss.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-subtle text-secondary'
                        }`}
                      >
                        {iss.severity}
                      </span>
                      <div className="text-xs text-secondary mt-1">{iss.issue_type}</div>
                    </td>

                    {/* Fieldworker */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{iss.student_name}</div>
                      <div className="text-xs text-secondary font-mono">{iss.student_index}</div>
                    </td>

                    {/* Community */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-primary">{iss.community_name}</div>
                      <div className="text-xs text-secondary">Group {iss.group_number}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          iss.status === 'RESOLVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : iss.status === 'UNDER_INVESTIGATION'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : iss.status === 'ESCALATED'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {iss.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3" />}
                        {iss.status === 'UNDER_INVESTIGATION' && <Clock className="w-3 h-3" />}
                        {iss.status === 'ESCALATED' && <AlertTriangle className="w-3 h-3" />}
                        {iss.status === 'OPEN' && <AlertCircle className="w-3 h-3" />}
                        {iss.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="py-3 px-4 text-xs text-secondary">
                      {iss.deadline ? (
                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(iss.deadline).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-muted">No deadline</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenManage(iss)}
                        className="px-3 py-1.5 rounded-lg border border-border-strong bg-subtle hover:bg-hover text-xs font-semibold text-primary transition-colors inline-flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Manage Case</span>
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
          RAISE INVESTIGATION MODAL
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-primary">Raise Fieldwork Investigation</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-md text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Supervised Locality <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.community_id}
                    onChange={e => setCreateForm({ ...createForm, community_id: e.target.value, student_id: '' })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Community</option>
                    {scopeOptions.map(opt => (
                      <option key={opt.community_id} value={opt.community_id.toString()}>
                        {opt.community_name} (Group {opt.group_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Assigned Fieldworker <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!createForm.community_id}
                    value={createForm.student_id}
                    onChange={e => setCreateForm({ ...createForm, student_id: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select Student</option>
                    {selectedCommunityStudents.map(st => (
                      <option key={st.id} value={st.id.toString()}>
                        {st.name} ({st.student_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Incident Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Household coordinates outside community boundary"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Anomaly Type</label>
                  <select
                    value={createForm.issue_type}
                    onChange={e => setCreateForm({ ...createForm, issue_type: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="DATA_ANOMALY">Data Anomaly</option>
                    <option value="SUSPICIOUS_SPEED">Suspicious Rapid Entry</option>
                    <option value="REPETITIVE_ANSWERS">Repetitive Questionnaire Responses</option>
                    <option value="GPS_INCONSISTENCY">GPS / Spatial Inconsistency</option>
                    <option value="MISSING_WORK">Unfulfilled Quota / Missing Work</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Severity</label>
                  <select
                    value={createForm.severity}
                    onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Reason & Audit Observations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this issue is being raised..."
                  value={createForm.reason}
                  onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Evidence / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Recorded GPS: 9.452, -1.551"
                    value={createForm.evidence}
                    onChange={e => setCreateForm({ ...createForm, evidence: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Resolution Deadline</label>
                  <input
                    type="date"
                    value={createForm.deadline}
                    onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border-strong flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border-strong bg-surface hover:bg-hover text-xs font-medium text-secondary rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Raise Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANAGE CASE / RESOLVE / ESCALATE MODAL
      ========================================================================= */}
      {activeIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  Manage Case: {activeIssue.title}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Fieldworker: <strong className="text-primary">{activeIssue.student_name}</strong> ({activeIssue.student_index}) •{' '}
                  {activeIssue.community_name} (Group {activeIssue.group_number})
                </p>
              </div>
              <button onClick={() => setActiveIssue(null)} className="p-1 rounded-md text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Reason & Evidence Box */}
              <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl space-y-1.5">
                <div className="font-bold text-primary">Coordinator Reason:</div>
                <div className="text-secondary">{activeIssue.reason}</div>
                {activeIssue.evidence && (
                  <div className="text-[11px] text-muted font-mono mt-1">Evidence: {JSON.stringify(activeIssue.evidence)}</div>
                )}
                {activeIssue.survey_id && (
                  <div className="mt-1">
                    <Link
                      href={`/coordinator/surveys?survey_id=${activeIssue.survey_id}`}
                      className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Inspect Linked Survey Submission</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Record Student's Explanation */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Fieldworker&apos;s Verbal or Written Explanation</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Record explanation given by fieldworker upon interview..."
                  value={updateForm.fieldworker_explanation}
                  onChange={e => setUpdateForm({ ...updateForm, fieldworker_explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Action Requested & Outcome */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Resolution Outcome & Action Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Student clarified household was interviewed jointly; verified with village head."
                  value={updateForm.outcome}
                  onChange={e => setUpdateForm({ ...updateForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Status Update Options */}
              <div className="p-3 bg-subtle/50 rounded-xl border border-border-subtle space-y-2">
                <div className="font-bold text-primary">Case Disposition & Status:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit('UNDER_INVESTIGATION')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold text-xs hover:bg-blue-100 transition-colors"
                  >
                    Mark In Review / Under Investigation
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit('RESOLVED')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    Resolve Case
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit('ESCALATED')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold text-xs hover:bg-rose-100 transition-colors"
                  >
                    Escalate to Administrator
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-border-strong flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIssue(null)}
                  className="px-4 py-2 border border-border-strong bg-surface hover:bg-hover text-xs font-medium text-secondary rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSubmit()}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-subtle hover:bg-hover text-xs font-semibold text-primary rounded-lg border border-border-strong transition-colors"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

