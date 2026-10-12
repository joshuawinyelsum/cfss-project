"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { downloadExport } from '@/lib/export';
import { 
  FileText, 
  Search, 
  Filter, 
  RotateCw, 
  Eye, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  X, 
  Building2,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';

interface SurveyStats {
  total_surveys: number;
  total_drafts?: number;
  submitted_today?: number;
  submitted_last_7_days?: number;
  submitted_last_30_days?: number;
  by_community: {
    community_name: string;
    count: number;
  }[];
  by_type?: {
    survey_type: string;
    count: number;
  }[];
}

interface SurveyList {
  id: string;
  user_id: number;
  student_id: string;
  student_name: string;
  student_email: string;
  community_id: number;
  community_name: string;
  group_number: number;
  submitted_at: string;
  status: string;
  type: string;
}

interface SurveyDetail extends SurveyList {
  responses: Record<string, any>;
}

export function SurveysView({ pageTitle }: { pageTitle?: string }) {
  const { user, token } = useAdminAuthStore();
  const router = useRouter();

  const [surveys, setSurveys] = useState<SurveyList[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [communityFilter, setCommunityFilter] = useState('All');

  // A4 Document Preview Modal
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDetail | null>(null);
  const [surveyDetailsLoading, setSurveyDetailsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const printRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [user, router, token]);

  const fetchData = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    setLoading(true);
    setError('');
    try {
      const opts = { headers: { Authorization: `Bearer ${activeToken}` } };
      const [surveysRes, statsRes] = await Promise.all([
        api.get('/api/admin/surveys', opts),
        api.get('/api/admin/surveys/stats', opts)
      ]);
      setSurveys(surveysRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to fetch fieldwork submissions'));
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (surveyId: string) => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    setSurveyDetailsLoading(true);
    try {
      const res = await api.get(`/api/admin/surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setSelectedSurvey(res.data);
      setZoomLevel(100);
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err, 'Failed to fetch survey submission record'));
    } finally {
      setSurveyDetailsLoading(false);
    }
  };

  // Distinct filter values
  const uniqueCommunities = useMemo(() => {
    const comms = new Set(surveys.map((s) => s.community_name).filter(Boolean));
    return Array.from(comms).sort();
  }, [surveys]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(surveys.map((s) => s.type).filter(Boolean));
    return Array.from(types).sort();
  }, [surveys]);

  // Filtered surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((survey) => {
      if (communityFilter !== 'All' && survey.community_name !== communityFilter) return false;
      if (statusFilter !== 'All' && survey.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (typeFilter !== 'All' && survey.type?.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = survey.student_name?.toLowerCase().includes(q);
        const matchesId = survey.student_id?.toLowerCase().includes(q);
        const matchesType = survey.type?.toLowerCase().includes(q);
        const matchesComm = survey.community_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesType && !matchesComm) return false;
      }
      return true;
    });
  }, [surveys, communityFilter, statusFilter, typeFilter, searchTerm]);

  // Modal navigation (Previous / Next)
  const currentSurveyIndex = useMemo(() => {
    if (!selectedSurvey) return -1;
    return filteredSurveys.findIndex((s) => s.id === selectedSurvey.id);
  }, [selectedSurvey, filteredSurveys]);

  const hasPrev = currentSurveyIndex > 0;
  const hasNext = currentSurveyIndex >= 0 && currentSurveyIndex < filteredSurveys.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      handleRowClick(filteredSurveys[currentSurveyIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      handleRowClick(filteredSurveys[currentSurveyIndex + 1].id);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const getSurveyTitle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'household':
        return 'Household Assessment Form';
      case 'education':
        return 'Education Facilities Survey';
      case 'health':
        return 'Health Infrastructure Survey';
      case 'governance':
        return 'Leadership & Governance Survey';
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Survey Report`;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export handlers
  const handleExportFiltered = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.append('survey_type', typeFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (communityFilter !== 'All') {
        const commObj = surveys.find((s) => s.community_name === communityFilter);
        if (commObj) params.append('community_id', String(commObj.community_id));
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      await downloadExport(
        `/admin/export/surveys${queryString}`,
        `field_surveys_filtered_${new Date().toISOString().slice(0, 10)}.csv`,
        activeToken
      );
      showToast('Filtered surveys exported successfully (CSV)', 'success');
    } catch (err) {
      showToast('Export failed. Check backend connectivity.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    try {
      setExporting(true);
      await downloadExport(
        '/admin/export/surveys',
        `field_surveys_complete_${new Date().toISOString().slice(0, 10)}.csv`,
        activeToken
      );
      showToast('Complete dataset exported successfully (CSV)', 'success');
    } catch (err) {
      showToast('Export failed. Check backend connectivity.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 text-primary animate-fade-in pb-12">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-white text-xs font-semibold transition-all z-50 ${
          toast.type === 'success' ? 'bg-[#093C22]' : 'bg-red-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {pageTitle || 'Fieldwork Submissions & Surveys'}
            </h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Central repository of student fieldwork questionnaire data, submissions, and verified community surveys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-strong bg-surface text-xs font-semibold text-primary hover:bg-page transition-colors shadow-xs disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#093C22]' : 'text-secondary'}`} />
            {loading ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200 rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Repository Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submitted Records */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {stats?.total_surveys ?? surveys.length}
            </p>
            <p className="text-xs text-muted mt-1">
              Fieldwork surveys submitted by students
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Period Metrics */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Recent Activity</p>
            <div className="flex items-baseline gap-3 mt-1">
              <div>
                <span className="text-xl font-bold text-primary">{stats?.submitted_today ?? 0}</span>
                <span className="text-[10px] text-muted ml-1 font-medium">today</span>
              </div>
              <div className="text-border">|</div>
              <div>
                <span className="text-xl font-bold text-primary">{stats?.submitted_last_7_days ?? 0}</span>
                <span className="text-[10px] text-muted ml-1 font-medium">last 7d</span>
              </div>
              <div className="text-border">|</div>
              <div>
                <span className="text-xl font-bold text-primary">{stats?.submitted_last_30_days ?? 0}</span>
                <span className="text-[10px] text-muted ml-1 font-medium">30d</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-1">
              Temporal intake cadence
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Community Coverage */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Communities Surveyed</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {stats?.by_community?.length ?? uniqueCommunities.length}
            </p>
            <p className="text-xs text-muted mt-1">
              Locales with submitted data
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Survey Types Breakdown */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Modules Active</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {stats?.by_type?.length ?? uniqueTypes.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {['HOUSEHOLD', 'EDUCATION', 'HEALTH', 'GOVERNANCE'].map((typeKey) => {
              const count = stats?.by_type?.find((t) => t.survey_type.toUpperCase() === typeKey)?.count || 
                surveys.filter((s) => s.type.toUpperCase() === typeKey).length;
              return (
                <button
                  key={typeKey}
                  onClick={() => setTypeFilter(typeFilter === typeKey.toLowerCase() ? 'All' : typeKey.toLowerCase())}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors border ${
                    typeFilter === typeKey.toLowerCase()
                      ? 'bg-[#093C22] text-white border-[#093C22]'
                      : 'bg-page text-secondary border-border-strong hover:bg-surface hover:text-primary'
                  }`}
                  title={`Filter by ${typeKey}`}
                >
                  {typeKey.slice(0, 4)}: {count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-surface rounded-xl border border-border-strong p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, ID, community..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:border-[#093C22] focus:bg-surface transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-page border border-border-strong rounded-lg text-secondary focus:outline-none focus:border-[#093C22] focus:bg-surface font-medium"
            >
              <option value="All">All statuses</option>
              <option value="submitted">SUBMITTED</option>
              <option value="draft">DRAFT</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-page border border-border-strong rounded-lg text-secondary focus:outline-none focus:border-[#093C22] focus:bg-surface font-medium"
          >
            <option value="All">All survey types</option>
            <option value="household">Household</option>
            <option value="education">Education</option>
            <option value="health">Health</option>
            <option value="governance">Governance</option>
          </select>

          <select
            value={communityFilter}
            onChange={(e) => setCommunityFilter(e.target.value)}
            className="px-3 py-2 bg-page border border-border-strong rounded-lg text-secondary max-w-xs truncate focus:outline-none focus:border-[#093C22] focus:bg-surface font-medium"
          >
            <option value="All">All communities</option>
            {uniqueCommunities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(searchTerm || statusFilter !== 'All' || typeFilter !== 'All' || communityFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setTypeFilter('All');
                setCommunityFilter('All');
              }}
              className="text-xs text-secondary hover:text-primary underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFiltered}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-xs disabled:opacity-50"
            title="Export records matching active search and filters"
          >
            <Download className="w-3.5 h-3.5 text-secondary" />
            <span>Export Filtered CSV</span>
          </button>

          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#093C22] hover:bg-[#0c512e] text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-50"
            title="Export all fieldwork survey records in full"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export All Dataset CSV</span>
          </button>
        </div>
      </div>

      {/* Main Submissions Table */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
        <div className="px-5 py-3.5 bg-page/60 border-b border-border flex items-center justify-between text-secondary font-medium">
          <span className="font-semibold text-primary">Field Survey Repository Submissions</span>
          <span>Showing <strong className="text-primary">{filteredSurveys.length}</strong> of {surveys.length} records</span>
        </div>

        {loading && surveys.length === 0 ? (
          <div className="p-16 text-center text-muted">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#093C22] mb-2" />
            Loading survey records...
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="p-16 text-center text-muted">
            <p className="font-semibold text-primary text-sm">No submissions match the filter criteria</p>
            <p className="text-xs text-muted mt-1">Adjust search parameters or clear filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-secondary bg-page/40 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-32 whitespace-nowrap">Submission Ref</th>
                  <th className="py-3 px-4">Title & Instrument</th>
                  <th className="py-3 px-4 w-52">Submitted By</th>
                  <th className="py-3 px-4 w-48">Group & Community</th>
                  <th className="py-3 px-4 w-32 whitespace-nowrap">Submission Date</th>
                  <th className="py-3 px-4 w-28 text-center whitespace-nowrap">Record Status</th>
                  <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-secondary">
                {filteredSurveys.map((s, idx) => {
                  const refCode = `REF-SV-${String(idx + 1).padStart(3, '0')}`;
                  const title = getSurveyTitle(s.type);
                  const isSubmitted = s.status?.toUpperCase() === 'SUBMITTED';

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-page transition-colors cursor-pointer"
                      onClick={() => handleRowClick(s.id)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        {refCode}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-primary">{title}</p>
                        <p className="text-[11px] text-muted capitalize mt-0.5 font-mono">
                          {s.type.toUpperCase()} • ID: {s.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-primary">{s.student_name || 'Enrolled Student'}</p>
                        <p className="text-[11px] font-mono text-muted">{s.student_id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-primary">{s.community_name || 'Unassigned Area'}</p>
                        <p className="text-[11px] text-muted">Group {s.group_number || 1}</p>
                      </td>
                      <td className="py-3 px-4 text-secondary whitespace-nowrap font-mono text-[11px]">
                        {formatDate(s.submitted_at)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          isSubmitted
                            ? 'bg-emerald-50 text-[#093C22] border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {s.status?.toUpperCase() || 'SUBMITTED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowClick(s.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#093C22] bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A4 Institutional Document Preview Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-2xl w-full max-w-4xl shadow-2xl border border-border-strong flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            
            {/* Modal Header & Controls Toolbar */}
            <div className="px-6 py-3.5 border-b border-border bg-page/80 flex items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-primary">
                    Fieldwork Survey Record
                  </h3>
                </div>

                {/* Record Navigation Controls */}
                <div className="flex items-center gap-1 border border-border-strong rounded-lg bg-surface px-1.5 py-0.5 text-xs">
                  <button
                    onClick={handlePrev}
                    disabled={!hasPrev || surveyDetailsLoading}
                    className="p-1 hover:bg-page rounded text-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Previous record"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1 text-[11px] font-mono text-secondary font-medium">
                    {currentSurveyIndex + 1} of {filteredSurveys.length}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={!hasNext || surveyDetailsLoading}
                    className="p-1 hover:bg-page rounded text-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Next record"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center border border-border-strong rounded-lg bg-surface text-xs mr-2 overflow-hidden">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(80, prev - 10))}
                    title="Zoom Out"
                    className="p-1.5 hover:bg-page text-secondary border-r border-border"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-secondary font-medium">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
                    title="Zoom In"
                    className="p-1.5 hover:bg-page text-secondary border-l border-border"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#093C22] hover:bg-[#0c512e] text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>

                <button
                  onClick={() => setSelectedSurvey(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Styled as Institutional A4 Document) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-page flex justify-center">
              <div 
                ref={printRef}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="bg-surface border border-border-strong shadow-lg rounded-xl p-8 sm:p-12 w-full max-w-[800px] min-h-[900px] space-y-6 text-primary transition-transform duration-150"
              >
                
                {/* Formal Institutional Letterhead */}
                <div className="border-b-2 border-primary pb-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Building2 className="w-6 h-6 text-[#093C22]" />
                    <span className="text-xs font-bold tracking-widest text-[#093C22] uppercase">
                      University Field Operations Directorate
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-black tracking-wide text-primary uppercase">
                    COMMUNITY FIELD SURVEY SYSTEM (CFSS)
                  </h2>
                  <p className="text-xs font-bold tracking-wider text-secondary uppercase">
                    Fieldwork Questionnaire Submission Record
                  </p>
                  <p className="text-[10px] text-muted font-mono pt-1">
                    Record ID: {selectedSurvey.id} • Classification: FIELD SURVEY ARCHIVE
                  </p>
                </div>

                {/* Section A: Respondent & Fieldwork Assignment */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary bg-page/80 px-3 py-1.5 rounded-lg border-l-4 border-[#093C22]">
                    1. Respondent & Community Assignment
                  </h4>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-page/50 border border-border rounded-xl text-xs">
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Student Full Name</span>
                      <strong className="text-primary font-bold">{selectedSurvey.student_name || 'Enrolled Student'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Student Identification Number</span>
                      <strong className="text-primary font-mono">{selectedSurvey.student_id}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Assigned Community</span>
                      <strong className="text-primary font-bold">{selectedSurvey.community_name || 'Unassigned Area'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Fieldwork Group</span>
                      <strong className="text-primary">Group {selectedSurvey.group_number || 1}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Survey Instrument</span>
                      <strong className="text-primary capitalize">{selectedSurvey.type} Assessment</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Submission Timestamp</span>
                      <strong className="text-primary font-mono text-[11px]">{formatDate(selectedSurvey.submitted_at)}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block text-[11px] font-medium">Status</span>
                      <strong className="text-primary uppercase font-semibold">{selectedSurvey.status || 'SUBMITTED'}</strong>
                    </div>
                  </div>
                </div>

                {/* Section B: Recorded Survey Form Responses */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary bg-page/80 px-3 py-1.5 rounded-lg border-l-4 border-[#093C22]">
                    2. Questionnaire Data & Field Responses
                  </h4>

                  {selectedSurvey.responses && Object.keys(selectedSurvey.responses).length > 0 ? (
                    <div className="space-y-2 border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-page/80 text-secondary border-b border-border text-[11px] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                            <th className="py-2.5 px-3 font-bold w-1/2">Question / Parameter</th>
                            <th className="py-2.5 px-3 font-bold">Recorded Response</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries(selectedSurvey.responses).map(([key, val], idx) => (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-surface' : 'bg-page/40'}>
                              <td className="py-2.5 px-3 text-center text-muted font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-primary">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                              </td>
                              <td className="py-2.5 px-3 text-primary font-mono text-[11px]">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-page/50 border border-border rounded-xl text-center text-muted text-xs italic">
                      No structured responses attached to this fieldwork record.
                    </div>
                  )}
                </div>

                {/* Section C: Archival Metadata */}
                <div className="pt-6 border-t border-border text-xs text-secondary">
                  <div className="grid grid-cols-2 gap-4 bg-page/50 p-3 rounded-xl border border-border font-mono text-[11px]">
                    <div>
                      <span className="text-muted block text-[10px]">DATABASE RECORD KEY</span>
                      <span className="text-primary font-semibold">{selectedSurvey.id}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">RECORD STATUS</span>
                      <span className="text-primary font-semibold">{selectedSurvey.status?.toUpperCase() || 'SUBMITTED'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-page/80 border-t border-border flex items-center justify-between text-xs shrink-0 print:hidden">
              <span className="text-secondary">
                Official repository record • CFSS Field Operations Directorate
              </span>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="px-4 py-1.5 rounded-lg border border-border-strong bg-surface text-primary hover:bg-page font-semibold transition-colors shadow-xs"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
