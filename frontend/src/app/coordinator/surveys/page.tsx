"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  FileCheck2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  MapPin,
  Calendar,
  User,
  Building2,
  Eye,
  MessageSquare,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface SurveyItem {
  id: string;
  community_id: number;
  community_name: string;
  group_number: number;
  student_id: number;
  student_name: string;
  student_index: string;
  survey_type: string;
  entity_id: string;
  field_feature_id?: string | null;
  status: string;
  review_status: 'PENDING' | 'VERIFIED' | 'FLAGGED';
  review_notes?: string | null;
  reviewed_at?: string | null;
  submitted_at?: string | null;
  created_at: string;
}

interface DeepSurveyDetail {
  survey: {
    id: string;
    community_id: number;
    community_name: string;
    group_number: number;
    student_id: number;
    student_name: string;
    student_index: string;
    survey_type: string;
    entity_id: string;
    status: string;
    review_status: string;
    review_notes?: string | null;
    reviewed_at?: string | null;
    reviewed_by_name?: string | null;
    submitted_at?: string | null;
    created_at: string;
  };
  answers: Array<{
    question_id: string;
    question_text: string;
    section: string;
    question_type: string;
    answer_value: any;
  }>;
  field_feature?: {
    id: string;
    feature_type: string;
    name?: string | null;
    category?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geometry?: any | null;
  } | null;
}

export default function CoordinatorSurveysPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const paramSurveyId = searchParams.get('survey_id');

  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reviewFilter, setReviewFilter] = useState('ALL');

  // Inspection Drawer
  const [activeDetail, setActiveDetail] = useState<DeepSurveyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Flag action modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!token) return;
    loadSurveys();
  }, [token, typeFilter, reviewFilter]);

  useEffect(() => {
    if (paramSurveyId && token) {
      handleInspect(paramSurveyId);
    }
  }, [paramSurveyId, token]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSurveys = async () => {
    setLoading(true);
    try {
      let url = '/api/coordinator/surveys?limit=100';
      if (typeFilter !== 'ALL') url += `&survey_type=${encodeURIComponent(typeFilter)}`;
      if (reviewFilter !== 'ALL') url += `&review_status=${encodeURIComponent(reviewFilter)}`;

      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSurveys(res.data.items || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load surveys'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (surveyId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/coordinator/surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveDetail(res.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to inspect survey details'), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReviewAction = async (status: 'VERIFIED' | 'FLAGGED', notes?: string) => {
    if (!activeDetail) return;
    setActionLoading(true);
    try {
      await api.post(
        `/api/coordinator/surveys/${activeDetail.survey.id}/review`,
        { review_status: status, review_notes: notes || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Survey ${status === 'VERIFIED' ? 'verified successfully' : 'flagged with notes'}`);
      setShowFlagModal(false);
      setFlagNotes('');
      // Refresh active inspection
      await handleInspect(activeDetail.survey.id);
      await loadSurveys();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update review status'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Local text search
  const filteredSurveys = useMemo(() => {
    if (!searchQuery.trim()) return surveys;
    const q = searchQuery.toLowerCase();
    return surveys.filter(s =>
      s.entity_id.toLowerCase().includes(q) ||
      s.student_name.toLowerCase().includes(q) ||
      s.student_index.toLowerCase().includes(q) ||
      s.community_name.toLowerCase().includes(q)
    );
  }, [surveys, searchQuery]);

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
            <FileCheck2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Fieldwork Submissions & Quality Review Gate
          </h1>
          <p className="text-sm text-secondary mt-1">
            Audit submitted fieldwork responses, verify GPS capture, inspect answers, and flag anomalies.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, student, or locality..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Review status filter */}
          <select
            value={reviewFilter}
            onChange={e => setReviewFilter(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="FLAGGED">Flagged</option>
          </select>

          {/* Survey type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Survey Types</option>
            <option value="HOUSEHOLD">Household</option>
            <option value="HEALTH">Health</option>
            <option value="EDUCATION">Education</option>
            <option value="GOVERNANCE">Governance</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-secondary">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading submissions...</p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <FileCheck2 className="w-10 h-10 text-muted opacity-40 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-primary">No submissions found</h3>
            <p className="text-xs text-secondary mt-1">Try modifying your filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-secondary border-b border-border-strong text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Survey Type</th>
                  <th className="py-3 px-4">Fieldworker</th>
                  <th className="py-3 px-4">Community</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredSurveys.map(s => (
                  <tr key={s.id} className="hover:bg-hover/50 transition-colors">
                    {/* Entity ID */}
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {s.entity_id}
                    </td>

                    {/* Survey Type */}
                    <td className="py-3 px-4 font-semibold text-xs text-secondary uppercase tracking-wider">
                      {s.survey_type}
                    </td>

                    {/* Fieldworker */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{s.student_name}</div>
                      <div className="text-xs text-secondary font-mono">{s.student_index}</div>
                    </td>

                    {/* Community */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-primary">{s.community_name}</div>
                      <span className="text-[11px] text-secondary">Group {s.group_number}</span>
                    </td>

                    {/* Submitted At */}
                    <td className="py-3 px-4 text-xs text-secondary">
                      {s.submitted_at ? (
                        <>
                          <div>{new Date(s.submitted_at).toLocaleDateString()}</div>
                          <div className="text-muted">
                            {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      ) : (
                        new Date(s.created_at).toLocaleDateString()
                      )}
                    </td>

                    {/* Review Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.review_status === 'VERIFIED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : s.review_status === 'FLAGGED'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {s.review_status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                        {s.review_status === 'FLAGGED' && <AlertTriangle className="w-3 h-3" />}
                        {s.review_status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {s.review_status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspect(s.id)}
                        className="px-3 py-1.5 rounded-lg border border-border-strong bg-subtle hover:bg-hover text-xs font-semibold text-primary transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
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
          DEEP SURVEY INSPECTION & REVIEW DRAWER
      ========================================================================= */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-bold text-primary bg-subtle px-2 py-0.5 rounded border border-border-subtle">
                    {activeDetail.survey.entity_id}
                  </span>
                  <span className="font-bold uppercase text-sm text-secondary">
                    {activeDetail.survey.survey_type} Survey
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeDetail.survey.review_status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : activeDetail.survey.review_status === 'FLAGGED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {activeDetail.survey.review_status}
                  </span>
                </div>
                <p className="text-xs text-secondary mt-1">
                  Fieldworker: <strong className="text-primary">{activeDetail.survey.student_name}</strong> ({activeDetail.survey.student_index}) • Locality:{' '}
                  <strong className="text-primary">{activeDetail.survey.community_name}</strong> (Group {activeDetail.survey.group_number})
                </p>
              </div>

              <button
                onClick={() => setActiveDetail(null)}
                className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Existing Review Notes if flagged */}
              {activeDetail.survey.review_notes && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Reviewer Flag Notes:</div>
                    <div className="mt-0.5">{activeDetail.survey.review_notes}</div>
                    {activeDetail.survey.reviewed_at && (
                      <div className="text-[11px] opacity-75 mt-1">
                        Reviewed by {activeDetail.survey.reviewed_by_name || 'Coordinator'} on {new Date(activeDetail.survey.reviewed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spatial Location Information */}
              {activeDetail.field_feature && (
                <div className="p-3.5 bg-subtle border border-border-subtle rounded-xl text-xs space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Spatial GPS Capture Verified
                  </div>
                  <div className="text-secondary">
                    Feature Category:{' '}
                    <strong className="text-primary">{activeDetail.field_feature.category || activeDetail.field_feature.feature_type}</strong>
                    {activeDetail.field_feature.name && ` (${activeDetail.field_feature.name})`}
                  </div>
                  {activeDetail.field_feature.latitude != null && activeDetail.field_feature.longitude != null && (
                    <div className="font-mono text-muted text-[11px]">
                      Latitude: {activeDetail.field_feature.latitude.toFixed(6)}, Longitude: {activeDetail.field_feature.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              )}

              {/* Survey Answers Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                  Recorded Questionnaire Responses ({activeDetail.answers.length})
                </h4>

                {activeDetail.answers.length === 0 ? (
                  <div className="p-6 text-center text-secondary border border-border-subtle rounded-xl">
                    No answer data recorded in this survey form.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDetail.answers.map((ans, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border-subtle bg-subtle/50 text-xs">
                        <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                          <span className="uppercase font-semibold">{ans.section || 'General'}</span>
                          <span>Type: {ans.question_type}</span>
                        </div>
                        <div className="font-semibold text-primary">{ans.question_text}</div>
                        <div className="mt-1.5 p-2 bg-surface rounded-lg border border-border-subtle text-primary font-medium">
                          {typeof ans.answer_value === 'object'
                            ? JSON.stringify(ans.answer_value, null, 2)
                            : String(ans.answer_value || '(No answer provided)')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-border-strong flex flex-wrap items-center justify-between gap-3 bg-subtle">
              <div className="flex items-center gap-2">
                <Link
                  href={`/coordinator/investigations?create=true&student_id=${activeDetail.survey.student_id}&community_id=${activeDetail.survey.community_id}&survey_id=${activeDetail.survey.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Raise Investigation</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlagModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag with Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewAction('VERIFIED')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Verified</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLAG SUBMISSION NOTES MODAL
      ========================================================================= */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Flag Survey Submission
              </h3>
              <button onClick={() => setShowFlagModal(false)} className="p-1 rounded text-secondary hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-secondary">
              Provide specific review feedback on why this submission is flagged (e.g. coordinates outside community, repetitive responses, incomplete data).
            </p>

            <textarea
              required
              rows={4}
              placeholder="Enter audit reasons or instructions for correction..."
              value={flagNotes}
              onChange={e => setFlagNotes(e.target.value)}
              className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFlagModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-secondary hover:bg-hover rounded-lg border border-border-strong"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('FLAGGED', flagNotes)}
                disabled={actionLoading || !flagNotes.trim()}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Flagging...' : 'Confirm Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

