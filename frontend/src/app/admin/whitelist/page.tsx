"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import { downloadExport } from '@/lib/export';
import {
  ClipboardList,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  UserCheck,
  Search,
  MoreVertical,
  Upload,
  Download,
  Eye,
  Trash2,
  Power,
  X
} from 'lucide-react';

interface Whitelist {
  id: number;
  name: string;
  status: string;
  created_at: string;
  uploaded_by: string | null;
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
  total_raw_entries?: number;
  active_raw_entries?: number;
}

interface UploadResponse {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
  whitelist_id?: number;
}

export default function WhitelistPage() {
  const { token } = useAdminAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [whitelists, setWhitelists] = useState<Whitelist[]>([]);
  const [summary, setSummary] = useState<WhitelistSummary | null>(null);
  const [loadingLists, setLoadingLists] = useState(true);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Overflow Menu State
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Inspection modal
  const [inspectingId, setInspectingId] = useState<number | null>(null);
  const [inspectData, setInspectData] = useState<{ entries: any[]; total: number } | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Close overflow menu on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.overflow-menu-container')) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchWhitelists = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) {
      setLoadingLists(false);
      return;
    }
    try {
      setLoadingLists(true);
      const [listRes, summaryRes] = await Promise.allSettled([
        api.get<Whitelist[]>('/api/admin/whitelist', {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        api.get<WhitelistSummary>('/api/admin/whitelist/summary', {
          headers: { Authorization: `Bearer ${activeToken}` }
        })
      ]);

      if (listRes.status === 'fulfilled') {
        setWhitelists(listRes.value.data);
      }

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      }
    } catch {
      showToast('Failed to load whitelists', 'error');
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchWhitelists();
  }, [token]);

  // Filtered Whitelists
  const filteredWhitelists = useMemo(() => {
    return whitelists.filter(w => {
      const matchesSearch = !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(w.id).includes(searchQuery);
      const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [whitelists, searchQuery, statusFilter]);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredWhitelists.map(w => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (targetStatus: 'ACTIVE' | 'ARCHIVED') => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      await api.patch('/api/admin/whitelist/bulk-status', {
        ids: selectedIds,
        status: targetStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Updated ${selectedIds.length} whitelists to ${targetStatus}`, 'success');
      setSelectedIds([]);
      await fetchWhitelists();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update whitelists in bulk', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await api.patch(`/api/admin/whitelist/${id}`, { status: nextStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Whitelist updated to ${nextStatus}`, 'success');
      setOpenMenuId(null);
      fetchWhitelists();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  const handleUpload = async () => {
    if (!file || !name) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    try {
      const res = await api.post<UploadResponse>('/api/admin/whitelist/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setResult(res.data);
      if (res.data.failed === 0) {
        showToast(`Successfully imported ${res.data.success} students`, 'success');
        setFile(null);
        setName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadForm(false);
      } else {
        showToast(`Imported ${res.data.success} students with ${res.data.failed} errors`, 'error');
      }
      fetchWhitelists();
    } catch (err: any) {
      let msg = err.response?.data?.detail || 'Failed to upload whitelist';
      if (typeof msg !== 'string') msg = 'Validation error occurred';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleInspect = async (id: number) => {
    setInspectingId(id);
    setLoadingInspect(true);
    setInspectSearch('');
    setOpenMenuId(null);
    try {
      const res = await api.get(`/api/admin/whitelist/${id}?limit=250`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInspectData(res.data);
    } catch {
      showToast('Failed to load roster entries', 'error');
      setInspectingId(null);
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleExport = async (id: number) => {
    setOpenMenuId(null);
    try {
      setExportingId(id);
      await downloadExport(`/admin/export/whitelist/${id}`, `whitelist_${id}.csv`, token!);
      showToast('Export complete', 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setOpenMenuId(null);
    if (!window.confirm("Are you sure you want to delete this whitelist roster?")) return;
    try {
      setDeletingId(id);
      await api.delete(`/api/admin/whitelist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Whitelist deleted', 'success');
      fetchWhitelists();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete whitelist', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Inspect entries filter
  const filteredInspectEntries = useMemo(() => {
    if (!inspectData?.entries) return [];
    if (!inspectSearch) return inspectData.entries;
    const q = inspectSearch.toLowerCase();
    return inspectData.entries.filter((m: any) =>
      String(m.student_id || '').toLowerCase().includes(q) ||
      String(m.full_name || '').toLowerCase().includes(q) ||
      String(m.program || '').toLowerCase().includes(q)
    );
  }, [inspectData, inspectSearch]);

  const isAllSelected = filteredWhitelists.length > 0 && selectedIds.length === filteredWhitelists.length;

  return (
    <div className="space-y-6 text-primary animate-fade-in pb-12">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-[#093C22]" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Whitelist Management</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Manage Whitelists: import student eligibility rosters and control active cohort registration capacity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#093C22] text-xs font-semibold text-white hover:bg-[#0c512e] transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>{showUploadForm ? 'Cancel Upload' : 'Upload Whitelist File'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Whitelist files */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Whitelist files</span>
            <div className="w-10 h-10 rounded-lg bg-page text-secondary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {summary?.total_files ?? whitelists.length}
          </div>
          <div className="text-xs text-secondary mt-1">
            <strong className="text-primary font-semibold">{summary?.active_files ?? whitelists.filter(w => w.status === 'ACTIVE').length}</strong> active roster files
          </div>
        </div>

        {/* Metric 2: Expected students */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Expected students</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {summary?.expected_students ?? summary?.expected_registrations ?? '—'}
          </div>
          <div className="text-xs text-secondary mt-1">
            <strong className="text-primary font-semibold">{summary?.active_expected_students ?? summary?.active_expected_registrations ?? 0}</strong> in active cohorts
          </div>
        </div>

        {/* Metric 3: Registered students */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Registered students</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#093C22] mt-2">
            {summary?.registered_students ?? 0}
          </div>
          <div className="text-xs text-secondary mt-1">
            <strong className="text-[#093C22] font-semibold">{summary?.active_registered_students ?? 0}</strong> registered from active cohorts
          </div>
        </div>

        {/* Metric 4: Awaiting registration */}
        <div className="bg-surface rounded-xl border border-border-strong p-5 shadow-xs hover:border-[#093C22]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Awaiting registration</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary mt-2">
            {summary?.awaiting_registration ?? 0}
          </div>
          <div className="text-xs text-secondary mt-1">
            <strong className="text-primary font-semibold">{summary?.active_awaiting_registration ?? 0}</strong> outstanding in active cohorts
          </div>
        </div>
      </div>

      {/* Upload Form Modal / Drawer */}
      {showUploadForm && (
        <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-primary">Upload New Whitelist File</h2>
            <button
              onClick={() => setShowUploadForm(false)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-secondary font-medium mb-1">Cohort or Roster Name</label>
              <input
                type="text"
                placeholder="e.g. 2025/2026 CS Batch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
              />
            </div>

            <div>
              <label className="block text-secondary font-medium mb-1">Spreadsheet File (.csv or .xlsx)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, .xlsx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                }}
                className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border-strong file:text-xs file:bg-surface file:text-primary file:font-semibold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5 text-xs">
            <button
              onClick={() => { setFile(null); setName(''); setShowUploadForm(false); }}
              className="px-3.5 py-2 rounded-lg border border-border-strong text-primary hover:bg-page transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !name || uploading}
              className="px-3.5 py-2 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] disabled:opacity-50 transition-colors font-semibold shadow-2xs"
            >
              {uploading ? 'Uploading...' : 'Process and Save Whitelist'}
            </button>
          </div>
        </div>
      )}

      {/* Upload Diagnostic Results */}
      {result && (
        <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-3 text-xs shadow-xs">
          <div className="flex justify-between items-center font-bold text-primary">
            <span>Upload Results: {result.success} accepted, {result.failed} rejected</span>
            <button onClick={() => setResult(null)} className="text-muted hover:text-primary">Dismiss</button>
          </div>

          {result.errors.length > 0 && (
            <div className="border border-red-200 bg-red-50 p-3 rounded-lg text-red-700 space-y-1">
              <div className="font-semibold">Errors:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {result.errors.slice(0, 5).map((e, idx) => (
                  <li key={idx}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Bar (Visible when files are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#093C22] text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="font-semibold bg-white/20 px-2.5 py-0.5 rounded-full text-[11px]">
              {selectedIds.length} {selectedIds.length === 1 ? 'file' : 'files'} selected
            </span>
            <span className="text-emerald-100/70 hidden sm:inline">Bulk actions available:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('ACTIVE')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {bulkActionLoading ? 'Updating...' : 'Activate Selected'}
            </button>
            <button
              onClick={() => handleBulkStatusChange('ARCHIVED')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {bulkActionLoading ? 'Updating...' : 'Deactivate Selected'}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-emerald-100/70 hover:text-white px-2 py-1 ml-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Toolbar */}
      <div className="bg-surface rounded-xl border border-border-strong p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by cohort name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-[#093C22]"
          >
            <option value="ALL">All files</option>
            <option value="ACTIVE">Active only</option>
            <option value="ARCHIVED">Archived only</option>
          </select>
        </div>

        <span className="text-secondary font-medium">
          Showing {filteredWhitelists.length} of {whitelists.length} rosters
        </span>
      </div>

      {/* Whitelist Records Table */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-visible shadow-xs">
        {loadingLists ? (
          <div className="p-12 text-center text-xs text-muted">Loading whitelist records...</div>
        ) : filteredWhitelists.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">No whitelist files found.</div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-secondary bg-page/60 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border-strong text-[#093C22] focus:ring-[#093C22]"
                      aria-label="Select all whitelist files"
                    />
                  </th>
                  <th className="py-3 px-4 w-16 whitespace-nowrap">ID</th>
                  <th className="py-3 px-4">Cohort / Roster Name</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-36">Upload Date</th>
                  <th className="py-3 px-4 text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-primary">
                {filteredWhitelists.map((w) => (
                  <tr key={w.id} className="hover:bg-page transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(w.id)}
                        onChange={() => handleToggleSelect(w.id)}
                        className="rounded border-border-strong text-[#093C22] focus:ring-[#093C22]"
                        aria-label={`Select whitelist #${w.id}`}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-secondary whitespace-nowrap">#{w.id}</td>
                    <td className="py-3 px-4 font-semibold text-primary">{w.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        w.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-page text-secondary border border-border'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary whitespace-nowrap">
                      {new Date(w.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Compact Three-Dot Overflow Menu */}
                      <div className="relative inline-block text-left overflow-menu-container">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)}
                          className="p-1.5 rounded-lg hover:bg-page text-muted hover:text-primary transition-colors"
                          aria-label={`Actions for whitelist #${w.id}`}
                          aria-expanded={openMenuId === w.id}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === w.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl border border-border-strong shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => handleInspect(w.id)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-secondary hover:text-primary hover:bg-page text-left transition-colors"
                            >
                              <Eye className="w-4 h-4 text-muted" />
                              <span>Inspect Records</span>
                            </button>

                            <button
                              onClick={() => handleExport(w.id)}
                              disabled={exportingId === w.id}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-secondary hover:text-primary hover:bg-page text-left disabled:opacity-50 transition-colors"
                            >
                              <Download className="w-4 h-4 text-muted" />
                              <span>{exportingId === w.id ? 'Exporting...' : 'Export CSV'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleStatus(w.id, w.status)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-secondary hover:text-primary hover:bg-page text-left border-t border-border transition-colors"
                            >
                              <Power className="w-4 h-4 text-muted" />
                              <span>{w.status === 'ACTIVE' ? 'Deactivate File' : 'Activate File'}</span>
                            </button>

                            {w.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleDelete(w.id)}
                                disabled={deletingId === w.id}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 text-left border-t border-border disabled:opacity-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>Delete File</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Inspection Modal */}
      {inspectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-border-strong animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border bg-page/50 flex justify-between items-center text-xs">
              <div>
                <h3 className="font-bold text-base text-primary">Whitelist #{inspectingId} Eligible Members</h3>
                <p className="text-secondary mt-0.5">{inspectData?.total ?? 0} total records registered in this roster</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleExport(inspectingId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-strong text-primary bg-surface hover:bg-page font-semibold transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setInspectingId(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-border bg-surface">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter members by name or ID..."
                  value={inspectSearch}
                  onChange={(e) => setInspectSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-page/30">
              {loadingInspect ? (
                <div className="py-12 text-center text-xs text-muted">Loading roster entries...</div>
              ) : filteredInspectEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted">No member records found.</div>
              ) : (
                <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-secondary bg-page/60 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 font-semibold">Student ID</th>
                        <th className="py-3 px-4 font-semibold">Name</th>
                        <th className="py-3 px-4 font-semibold">Program</th>
                        <th className="py-3 px-4 font-semibold">Faculty</th>
                        <th className="py-3 px-4 font-semibold">Gender</th>
                        <th className="py-3 px-4 font-semibold">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-primary">
                      {filteredInspectEntries.map((m: any, idx: number) => (
                        <tr key={m.id || idx} className="hover:bg-page transition-colors">
                          <td className="py-2.5 px-4 font-mono text-primary font-semibold">{m.student_id}</td>
                          <td className="py-2.5 px-4 text-primary font-medium">{m.full_name || '—'}</td>
                          <td className="py-2.5 px-4 text-secondary">{m.program || '—'}</td>
                          <td className="py-2.5 px-4 text-secondary">{m.faculty || '—'}</td>
                          <td className="py-2.5 px-4 text-secondary">{m.gender || '—'}</td>
                          <td className="py-2.5 px-4 text-secondary font-mono">{m.phone_number || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
