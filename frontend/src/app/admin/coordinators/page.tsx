"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  X,
  Edit2,
  Link2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  Eye
} from 'lucide-react';

interface Assignment {
  id: number;
  community_id: number;
  community_name: string;
  group_number: number | null;
  assigned_at: string;
  is_active: boolean;
  notes?: string | null;
}

interface Coordinator {
  id: number;
  staff_id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  faculty?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string;
  assignments: Assignment[];
  assigned_communities_count: number;
  assigned_groups: number[];
  assigned_students_count: number;
  open_issues_count: number;
}

interface CommunityOption {
  id: number;
  name: string;
  district: string;
  region: string;
  group_number: number;
}

export default function AdminCoordinatorsPage() {
  const { token } = useAdminAuthStore();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<Coordinator | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    staff_id: '',
    name: '',
    email: '',
    phone_number: '',
    faculty: '',
    password: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    faculty: '',
    password: ''
  });

  // Assign state
  const [assignMode, setAssignMode] = useState<'group' | 'community'>('group');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<number[]>([]);
  const [selectedGroupNumbers, setSelectedGroupNumbers] = useState<number[]>([]);
  const [assignNotes, setAssignNotes] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [coordsRes, commsRes] = await Promise.all([
        api.get('/api/admin/coordinators', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/api/admin/communities', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCoordinators(coordsRes.data || []);
      setCommunities(commsRes.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load coordinators data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distinct groups available across all communities
  const availableGroups = useMemo(() => {
    const s = new Set<number>();
    communities.forEach(c => {
      if (c.group_number != null) s.add(c.group_number);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [communities]);

  // Filtered coordinators
  const filteredCoordinators = useMemo(() => {
    return coordinators.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.faculty && c.faculty.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? c.is_active
          : !c.is_active;

      return matchSearch && matchStatus;
    });
  }, [coordinators, searchQuery, statusFilter]);

  // Overall metric counters
  const totalCoordinators = coordinators.length;
  const activeCoordinators = coordinators.filter(c => c.is_active).length;
  const totalAssignedCommunities = useMemo(() => {
    const s = new Set<number>();
    coordinators.forEach(c => c.assignments.forEach(a => s.add(a.community_id)));
    return s.size;
  }, [coordinators]);
  const totalOpenIssues = coordinators.reduce((sum, c) => sum + (c.open_issues_count || 0), 0);

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.staff_id.trim() || !createForm.name.trim() || !createForm.password.trim()) {
      showToast('Staff ID, Name, and Password are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/api/admin/coordinators', createForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Coordinator account created successfully');
      setShowCreateModal(false);
      setCreateForm({ staff_id: '', name: '', email: '', phone_number: '', faculty: '', password: '' });
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create coordinator'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOpen = (coord: Coordinator) => {
    setSelectedCoord(coord);
    setEditForm({
      name: coord.name,
      email: coord.email || '',
      phone_number: coord.phone_number || '',
      faculty: coord.faculty || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoord) return;
    setActionLoading(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone_number: editForm.phone_number.trim() || null,
        faculty: editForm.faculty.trim() || null
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await api.put(`/api/admin/coordinators/${selectedCoord.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Coordinator updated successfully');
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update coordinator'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (coord: Coordinator) => {
    try {
      await api.patch(
        `/api/admin/coordinators/${coord.id}/status`,
        { is_active: !coord.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Coordinator ${coord.is_active ? 'deactivated' : 'activated'}`);
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to change status'), 'error');
    }
  };

  const handleAssignOpen = (coord: Coordinator) => {
    setSelectedCoord(coord);
    setSelectedCommunityIds(coord.assignments.map(a => a.community_id));
    setSelectedGroupNumbers(coord.assigned_groups || []);
    setAssignNotes('');
    setAssignMode('group');
    setShowAssignModal(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedCoord) return;
    setActionLoading(true);
    try {
      if (assignMode === 'group') {
        if (selectedGroupNumbers.length === 0) {
          showToast('Please select at least one group or switch to community mode', 'error');
          setActionLoading(false);
          return;
        }
        await api.post(
          `/api/admin/coordinators/${selectedCoord.id}/assign-groups`,
          { group_numbers: selectedGroupNumbers, notes: assignNotes || undefined },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.post(
          `/api/admin/coordinators/${selectedCoord.id}/assign`,
          { community_ids: selectedCommunityIds, notes: assignNotes || undefined },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      showToast('Assignments updated successfully');
      setShowAssignModal(false);
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to assign communities/groups'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSingleAssignment = async (coordId: number, commId: number) => {
    try {
      await api.delete(`/api/admin/coordinators/${coordId}/assignments/${commId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Assignment removed');
      await loadData();
      if (selectedCoord && selectedCoord.id === coordId) {
        setSelectedCoord(prev => prev ? {
          ...prev,
          assignments: prev.assignments.filter(a => a.community_id !== commId),
          assigned_communities_count: prev.assigned_communities_count - 1
        } : null);
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to remove assignment'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Coordinator Management
          </h1>
          <p className="text-sm text-secondary mt-1">
            Supervise field faculty coordinators, allocate groups and community scopes, and monitor investigation workflows.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Coordinator</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Total Coordinators</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{totalCoordinators}</div>
          <div className="text-xs text-secondary mt-1">{activeCoordinators} active accounts</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Active Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCoordinators}</div>
          <div className="text-xs text-secondary mt-1">Supervising field cohorts</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Communities Covered</span>
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{totalAssignedCommunities}</div>
          <div className="text-xs text-secondary mt-1">Across assigned groups</div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Open Investigations</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{totalOpenIssues}</div>
          <div className="text-xs text-secondary mt-1">Flagged fieldwork issues</div>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, staff ID, faculty, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-medium">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface border border-border-strong text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinator Table */}
      <div className="bg-surface border border-border-strong rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-secondary">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading coordinators...</p>
          </div>
        ) : filteredCoordinators.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <Users className="w-10 h-10 mx-auto mb-2 text-muted opacity-40" />
            <h3 className="text-base font-semibold text-primary">No coordinators found</h3>
            <p className="text-xs text-secondary mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create a coordinator account to begin supervisor assignments.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-secondary border-b border-border-strong text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Staff ID & Faculty</th>
                  <th className="py-3 px-4">Assigned Groups & Scope</th>
                  <th className="py-3 px-4">Supervised Students</th>
                  <th className="py-3 px-4">Open Issues</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCoordinators.map(coord => (
                  <tr key={coord.id} className="hover:bg-hover/50 transition-colors">
                    {/* Coordinator Name & Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {coord.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-primary truncate">{coord.name}</div>
                          {coord.email && (
                            <div className="text-xs text-secondary flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{coord.email}</span>
                            </div>
                          )}
                          {coord.phone_number && (
                            <div className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{coord.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Staff ID & Faculty */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-primary bg-subtle px-2 py-0.5 rounded border border-border-subtle inline-block">
                        {coord.staff_id}
                      </div>
                      <div className="text-xs text-secondary mt-1 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 shrink-0 text-muted" />
                        <span>{coord.faculty || 'Unspecified Faculty'}</span>
                      </div>
                    </td>

                    {/* Assigned Groups & Communities */}
                    <td className="py-3 px-4">
                      {coord.assignments && coord.assignments.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {coord.assigned_groups && coord.assigned_groups.length > 0 ? (
                              coord.assigned_groups.map(g => (
                                <span
                                  key={g}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                >
                                  Group {g}
                                </span>
                              ))
                            ) : null}
                          </div>
                          <div className="text-xs text-secondary flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0 text-muted" />
                            <span>{coord.assigned_communities_count} {coord.assigned_communities_count === 1 ? 'community' : 'communities'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">No active assignments</span>
                      )}
                    </td>

                    {/* Supervised Students */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{coord.assigned_students_count || 0}</div>
                      <div className="text-xs text-secondary">Fieldworkers</div>
                    </td>

                    {/* Open Issues */}
                    <td className="py-3 px-4">
                      {coord.open_issues_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          {coord.open_issues_count} open
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> None
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(coord)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          coord.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${coord.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {coord.is_active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleAssignOpen(coord)}
                          className="px-2.5 py-1.5 rounded-lg border border-border-strong bg-surface hover:bg-hover text-xs font-medium text-primary flex items-center gap-1 transition-colors"
                          title="Assign Groups or Communities"
                        >
                          <Link2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Assign</span>
                        </button>

                        <button
                          onClick={() => handleEditOpen(coord)}
                          className="p-1.5 rounded-lg border border-border-strong bg-surface hover:bg-hover text-secondary hover:text-primary transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCoord(coord);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-border-strong bg-surface hover:bg-hover text-secondary hover:text-primary transition-colors"
                          title="View Details & Assignments"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          CREATE COORDINATOR MODAL
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-primary">Create Faculty Coordinator</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Staff / ID Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COORD/2026/01"
                    value={createForm.staff_id}
                    onChange={e => setCreateForm({ ...createForm, staff_id: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kwame Mensah"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="kmensah@university.edu.gh"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+233 24 000 0000"
                    value={createForm.phone_number}
                    onChange={e => setCreateForm({ ...createForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Faculty / Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Public Health"
                    value={createForm.faculty}
                    onChange={e => setCreateForm({ ...createForm, faculty: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border-strong flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border-strong bg-surface hover:bg-hover text-sm font-medium text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ASSIGN GROUPS / COMMUNITIES MODAL
      ========================================================================= */}
      {showAssignModal && selectedCoord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Assign Supervision Scope
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Coordinator: <strong className="text-primary">{selectedCoord.name}</strong> ({selectedCoord.staff_id})
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Assignment Mode Tabs */}
              <div className="flex border-b border-border-strong">
                <button
                  onClick={() => setAssignMode('group')}
                  className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
                    assignMode === 'group'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Assign by Cohort Group
                </button>
                <button
                  onClick={() => setAssignMode('community')}
                  className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
                    assignMode === 'community'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Specific Communities
                </button>
              </div>

              {assignMode === 'group' ? (
                <div>
                  <p className="text-xs text-secondary mb-3">
                    Selecting a group automatically covers all communities assigned to that cohort group.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {availableGroups.map(grp => {
                      const isSelected = selectedGroupNumbers.includes(grp);
                      const matchingComms = communities.filter(c => c.group_number === grp);
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupNumbers(selectedGroupNumbers.filter(g => g !== grp));
                            } else {
                              setSelectedGroupNumbers([...selectedGroupNumbers, grp]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 text-primary font-semibold ring-1 ring-emerald-500'
                              : 'bg-subtle border-border-strong hover:bg-hover text-secondary'
                          }`}
                        >
                          <div className="text-sm font-bold text-primary">Group {grp}</div>
                          <div className="text-xs text-secondary mt-0.5">
                            {matchingComms.length} {matchingComms.length === 1 ? 'community' : 'communities'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-secondary mb-3">
                    Manually check or uncheck individual communities for this coordinator.
                  </p>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {communities.map(comm => {
                      const isChecked = selectedCommunityIds.includes(comm.id);
                      return (
                        <label
                          key={comm.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-primary'
                              : 'bg-subtle border-border-subtle hover:bg-hover text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedCommunityIds(selectedCommunityIds.filter(id => id !== comm.id));
                                } else {
                                  setSelectedCommunityIds([...selectedCommunityIds, comm.id]);
                                }
                              }}
                              className="rounded border-border-strong text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-semibold text-primary">{comm.name}</span>
                              <span className="text-xs text-secondary ml-2">({comm.district}, {comm.region})</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-medium bg-surface px-2 py-0.5 rounded border border-border-subtle">
                            Group {comm.group_number}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignment Notes */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Assignment Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead supervisor for Eastern district cohort"
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Currently Active Assignments Summary */}
              {selectedCoord.assignments && selectedCoord.assignments.length > 0 && (
                <div className="pt-3 border-t border-border-subtle">
                  <div className="text-xs font-semibold text-secondary mb-2">Current Active Assignments:</div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {selectedCoord.assignments.map(a => (
                      <span
                        key={a.community_id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-subtle border border-border-subtle text-primary"
                      >
                        <span>{a.community_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleAssignment(selectedCoord.id, a.community_id)}
                          title="Remove assignment"
                          className="text-secondary hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border-strong flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-border-strong bg-surface hover:bg-hover text-sm font-medium text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Apply Assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT DETAILS MODAL
      ========================================================================= */}
      {showEditModal && selectedCoord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Edit Coordinator Details</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone_number}
                  onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Faculty / School</label>
                <input
                  type="text"
                  value={editForm.faculty}
                  onChange={e => setEditForm({ ...editForm, faculty: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-border-strong flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-border-strong bg-surface hover:bg-hover text-sm font-medium text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          COORDINATOR DETAIL & ROSTER INSPECTION MODAL
      ========================================================================= */}
      {showDetailModal && selectedCoord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">{selectedCoord.name}</h3>
                <p className="text-xs text-secondary">
                  Staff ID: {selectedCoord.staff_id} • Faculty: {selectedCoord.faculty || 'Unspecified'}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Covered Communities</div>
                  <div className="text-xl font-bold text-primary mt-1">{selectedCoord.assigned_communities_count}</div>
                </div>
                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Assigned Students</div>
                  <div className="text-xl font-bold text-primary mt-1">{selectedCoord.assigned_students_count}</div>
                </div>
                <div className="p-3 bg-subtle rounded-xl border border-border-subtle">
                  <div className="text-xs text-secondary">Investigation Issues</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {selectedCoord.open_issues_count} open
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                  Assigned Communities
                </h4>
                {selectedCoord.assignments && selectedCoord.assignments.length > 0 ? (
                  <div className="divide-y divide-border-subtle border border-border-strong rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {selectedCoord.assignments.map(a => (
                      <div key={a.id} className="p-3 flex items-center justify-between hover:bg-hover text-sm">
                        <div>
                          <div className="font-semibold text-primary">{a.community_name}</div>
                          <div className="text-xs text-secondary">
                            Group {a.group_number} • Assigned on {new Date(a.assigned_at).toLocaleDateString()}
                          </div>
                          {a.notes && <div className="text-xs text-muted italic mt-0.5">Note: {a.notes}</div>}
                        </div>
                        <button
                          onClick={() => handleRemoveSingleAssignment(selectedCoord.id, a.community_id)}
                          className="px-2 py-1 rounded text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-secondary border border-border-subtle rounded-xl">
                    No community assignments. Use the &quot;Assign&quot; tool to allocate groups.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border-strong flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-subtle hover:bg-hover text-sm font-semibold text-primary rounded-lg transition-colors border border-border-strong"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

