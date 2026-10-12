"use client";

import { useEffect, useState, useMemo } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { useAdminAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import {
  Building2,
  Users,
  MapPin,
  Search,
  Plus,
  X,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const AdminCommunityMap = dynamic(() => import('@/components/AdminCommunityMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">Loading Map...</div>
});

interface Community {
  id: string;
  name: string;
  district: string;
  region: string;
  capacity: number;
  student_count: number;
  slots_remaining: number;
  group_number: number;
  group_label: string;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  spatial_metadata?: any | null;
}

export default function AdminCommunitiesPage() {
  const token = useAdminAuthStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', district: '', region: '', capacity: 10 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityStudents, setCommunityStudents] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isEditingMap, setIsEditingMap] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return communityStudents;
    const q = memberSearch.toLowerCase();
    return communityStudents.filter((st: any) =>
      String(st.name || '').toLowerCase().includes(q) ||
      String(st.student_id || '').toLowerCase().includes(q) ||
      String(st.program || '').toLowerCase().includes(q)
    );
  }, [communityStudents, memberSearch]);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<Community | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState<'REASSIGN_EXISTING' | 'CREATE_REPLACEMENT'>('REASSIGN_EXISTING');
  const [targetCommunityId, setTargetCommunityId] = useState<string>('');
  const [replacementComm, setReplacementComm] = useState({ name: '', district: '', region: '', capacity: 10 });
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    setHydrated(true);
  }, []);

  const fetchCommunities = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/admin/communities', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setCommunities(res.data);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, 'Failed to load communities'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && token) {
      fetchCommunities();
    }
  }, [hydrated, token]);

  const filteredCommunities = useMemo(() => {
    return communities.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [communities, searchTerm]);


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    setCreating(true);
    setCreateError('');
    try {
      await api.post('/api/admin/communities', newComm, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setShowCreateModal(false);
      setNewComm({ name: '', district: '', region: '', capacity: 10 });
      setActionSuccess(`Community "${newComm.name}" created successfully.`);
      await fetchCommunities();
    } catch (err: any) {
      console.error(err);
      setCreateError(getErrorMessage(err, 'Failed to create community'));
    } finally {
      setCreating(false);
    }
  };

  const handleViewCommunity = async (comm: Community) => {
    setSelectedCommunity(comm);
    setIsEditingMap(false);
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    try {
      const res = await api.get(`/api/admin/communities/${comm.id}/students`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setCommunityStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMap = async (data: { latitude: number; longitude: number; spatial_metadata?: any }) => {
    if (!selectedCommunity) return;
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    try {
      await api.put(`/api/admin/communities/${selectedCommunity.id}`, data, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setIsEditingMap(false);
      setActionSuccess(`Map coordinates updated for "${selectedCommunity.name}".`);
      await fetchCommunities();
      setSelectedCommunity(prev => prev ? { ...prev, ...data } : null);
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save spatial metadata'));
    }
  };

  const handleSimpleDelete = async (comm: Community) => {
    if (!confirm(`Are you sure you want to delete empty community "${comm.name}"?`)) return;
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    try {
      await api.delete(`/api/admin/communities/${comm.id}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setActionSuccess(`Community "${comm.name}" deleted successfully.`);
      if (selectedCommunity?.id === comm.id) setSelectedCommunity(null);
      await fetchCommunities();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to delete community'));
    }
  };

  const handleProtectedDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;

    if (!adminPassword) {
      setDeleteError('Administrator password is required to execute deletion.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const payload: any = {
        admin_password: adminPassword,
        strategy: deleteStrategy
      };

      if (deleteStrategy === 'REASSIGN_EXISTING') {
        if (!targetCommunityId) {
          setDeleteError('Please select a target community for student reassignment.');
          setDeleteLoading(false);
          return;
        }
        payload.target_community_id = parseInt(targetCommunityId);
      } else {
        if (!replacementComm.name || !replacementComm.district || !replacementComm.region) {
          setDeleteError('Please provide all replacement community details.');
          setDeleteLoading(false);
          return;
        }
        payload.replacement_community = replacementComm;
      }

      const res = await api.post(`/api/admin/communities/${deleteTarget.id}/delete-with-reassignment`, payload, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      setActionSuccess(res.data.message || `Community "${deleteTarget.name}" deleted and students reassigned.`);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setAdminPassword('');
      if (selectedCommunity?.id === deleteTarget.id) {
        setSelectedCommunity(null);
      }
      await fetchCommunities();
    } catch (err: any) {
      setDeleteError(getErrorMessage(err, 'Failed to delete community with reassignment'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-primary pb-12">

      {/* Header Bar matching Reference */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#093C22]" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Communities & Groups</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Manage fieldwork locations, group assignments, and student capacities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#093C22] text-xs font-semibold text-white hover:bg-[#0c512e] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Community</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="flex items-center justify-between rounded-xl">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchCommunities()}>Retry</Button>
        </Alert>
      )}

      {actionSuccess && (
        <Alert variant="success" className="flex items-center justify-between rounded-xl">
          <span>{actionSuccess}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess('')}>✕</Button>
        </Alert>
      )}

      {/* Search Input Bar */}
      <div className="bg-surface rounded-xl border border-border-strong p-4 flex flex-wrap items-center gap-3 text-xs shadow-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by community or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-page border border-border-strong rounded-lg text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22] focus:border-[#093C22] transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-hidden shadow-xs">
        {loading && communities.length === 0 ? (
          <div className="p-16 text-center text-muted">
            <div className="inline-block w-8 h-8 border-4 border-[#093C22] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading communities...</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="p-16 text-center text-muted">
            <p className="text-base font-semibold text-primary">No communities found</p>
            <p className="text-xs text-muted mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-page/60 text-secondary font-semibold uppercase tracking-wider text-[11px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Community Name</th>
                    <th className="py-3 px-4 font-semibold w-32 whitespace-nowrap">Group</th>
                    <th className="py-3 px-4 font-semibold">District & Region</th>
                    <th className="py-3 px-4 font-semibold text-center">Capacity</th>
                    <th className="py-3 px-4 font-semibold w-1/4">Allocation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-primary">
                  {filteredCommunities.map((comm) => {
                    const isFull = comm.student_count >= comm.capacity;
                    const progress = Math.min(100, Math.round((comm.student_count / (comm.capacity || 1)) * 100));

                    return (
                      <tr
                        key={comm.id}
                        className="hover:bg-page transition-colors cursor-pointer"
                        onClick={() => handleViewCommunity(comm)}
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-primary leading-tight">{comm.name}</p>
                          <p className="text-[11px] text-muted mt-0.5">{comm.student_count} students assigned</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#093C22] border border-emerald-200 whitespace-nowrap">
                            {comm.group_label || `Group ${comm.group_number}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-primary">{comm.district}</p>
                          <p className="text-[11px] text-muted">{comm.region}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-primary">
                          {comm.capacity}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-page rounded-full h-2 overflow-hidden border border-border">
                              <div
                                className={`h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-[#093C22]'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-secondary whitespace-nowrap">
                              {comm.slots_remaining} left
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleViewCommunity(comm)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-primary bg-surface hover:bg-page border border-border-strong rounded-lg transition-colors shadow-2xs"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => {
                                if (comm.student_count === 0) {
                                  handleSimpleDelete(comm);
                                } else {
                                  setDeleteTarget(comm);
                                  setDeleteStrategy('REASSIGN_EXISTING');
                                  setTargetCommunityId('');
                                  setAdminPassword('');
                                  setDeleteError('');
                                  setDeleteModalOpen(true);
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-surface hover:bg-red-50 border border-red-200 rounded-lg transition-colors shadow-2xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 bg-page/50 border-t border-border text-xs text-secondary font-medium">
              Showing {filteredCommunities.length} of {communities.length} communities
            </div>
          </div>
        )}
      </div>

      {/* CREATE COMMUNITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-border-strong animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border bg-page/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-primary">Add New Community</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {createError && (
                <Alert variant="destructive" className="rounded-xl">
                  <span>{createError}</span>
                </Alert>
              )}

              <div>
                <Label className="text-primary font-semibold mb-1 block">Community Name</Label>
                <Input
                  type="text"
                  required
                  value={newComm.name}
                  onChange={e => setNewComm({...newComm, name: e.target.value})}
                  placeholder="e.g. Asuboi Community"
                  className="text-xs bg-page border-border-strong rounded-lg text-primary placeholder:text-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-primary font-semibold mb-1 block">District</Label>
                  <Input
                    type="text"
                    required
                    value={newComm.district}
                    onChange={e => setNewComm({...newComm, district: e.target.value})}
                    placeholder="e.g. Ayensuano"
                    className="text-xs bg-page border-border-strong rounded-lg text-primary placeholder:text-muted"
                  />
                </div>
                <div>
                  <Label className="text-primary font-semibold mb-1 block">Region</Label>
                  <Input
                    type="text"
                    required
                    value={newComm.region}
                    onChange={e => setNewComm({...newComm, region: e.target.value})}
                    placeholder="e.g. Eastern"
                    className="text-xs bg-page border-border-strong rounded-lg text-primary placeholder:text-muted"
                  />
                </div>
              </div>

              <div>
                <Label className="text-primary font-semibold mb-1 block">Student Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={newComm.capacity}
                  onChange={e => setNewComm({...newComm, capacity: parseInt(e.target.value) || 0})}
                  className="text-xs bg-page border-border-strong rounded-lg text-primary"
                />
                <p className="text-[11px] text-muted mt-1">Maximum number of students permitted.</p>
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 text-xs rounded-lg border-border-strong text-primary hover:bg-page"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-[#093C22] hover:bg-[#0c512e] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COMMUNITY DETAILS DRAWER / MODAL */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/60 backdrop-blur-xs p-4 sm:p-0">
          <div className={`bg-surface h-full shadow-2xl flex flex-col transition-all border-l border-border-strong ${isEditingMap ? 'w-full max-w-4xl' : 'w-full max-w-xl'}`}>
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-border flex justify-between items-start bg-page/50 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#093C22]" />
                  <h2 className="text-lg font-bold text-primary">{selectedCommunity.name}</h2>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-emerald-50 text-[#093C22] font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {selectedCommunity.group_label || `Group ${selectedCommunity.group_number}`}
                  </span>
                  <span className="text-xs text-secondary">
                    {selectedCommunity.district}, {selectedCommunity.region}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCommunity(null)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEditingMap ? (
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <AdminCommunityMap
                  community={selectedCommunity}
                  onSave={handleSaveMap}
                  onCancel={() => setIsEditingMap(false)}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {/* Section 1: Placement & Capacity Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-secondary text-xs uppercase tracking-wider">
                      Placement & Capacity Status
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedCommunity.student_count >= selectedCommunity.capacity
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-[#093C22] border border-emerald-200'
                    }`}>
                      {selectedCommunity.student_count >= selectedCommunity.capacity ? 'At Capacity' : 'Slots Available'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3.5 bg-page rounded-xl border border-border">
                      <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Group Number</span>
                      <span className="text-sm font-bold text-primary mt-0.5 block">Group {selectedCommunity.group_number || 1}</span>
                    </div>
                    <div className="p-3.5 bg-page rounded-xl border border-border">
                      <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Enrolled</span>
                      <span className="text-sm font-bold text-primary mt-0.5 block">{selectedCommunity.student_count} Students</span>
                    </div>
                    <div className="p-3.5 bg-page rounded-xl border border-border">
                      <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Max Capacity</span>
                      <span className="text-sm font-bold text-primary mt-0.5 block">{selectedCommunity.capacity} Slots</span>
                    </div>
                    <div className="p-3.5 bg-page rounded-xl border border-border">
                      <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Available</span>
                      <span className="text-sm font-bold text-[#093C22] mt-0.5 block">{selectedCommunity.slots_remaining} Left</span>
                    </div>
                  </div>

                  {/* Visual Capacity Bar */}
                  <div className="p-3.5 bg-page rounded-xl border border-border space-y-1.5">
                    <div className="flex justify-between text-[11px] text-secondary font-medium">
                      <span>Occupancy Utilization</span>
                      <span className="font-semibold text-primary">
                        {Math.min(100, Math.round((selectedCommunity.student_count / (selectedCommunity.capacity || 1)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedCommunity.student_count >= selectedCommunity.capacity ? 'bg-red-500' : 'bg-[#093C22]'
                        }`}
                        style={{ width: `${Math.min(100, (selectedCommunity.student_count / (selectedCommunity.capacity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Geographical & Spatial Information */}
                <div className="space-y-3">
                  <span className="font-semibold text-secondary text-xs uppercase tracking-wider block">
                    Geographic & Field Boundary
                  </span>
                  <div className="p-4 bg-page rounded-xl border border-border flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <MapPin className="w-4 h-4 text-[#093C22]" />
                        <span>{selectedCommunity.district}, {selectedCommunity.region} Region</span>
                      </div>
                      <div className="text-[11px] text-muted">
                        {selectedCommunity.latitude && selectedCommunity.longitude
                          ? `Coordinates: ${selectedCommunity.latitude.toFixed(5)}, ${selectedCommunity.longitude.toFixed(5)}`
                          : 'Spatial boundary coordinates not set'}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditingMap(true)} className="shrink-0 text-xs rounded-lg border-border-strong">
                      Edit Map
                    </Button>
                  </div>
                </div>

                {/* Section 3: Assigned Student Members Roster */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-secondary text-xs uppercase tracking-wider">
                      Assigned Students ({communityStudents.length})
                    </span>
                    <span className="text-[11px] text-muted">Enrolled Members</span>
                  </div>

                  {communityStudents.length > 3 && (
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search assigned members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-page border border-border-strong rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                      />
                    </div>
                  )}

                  {communityStudents.length === 0 ? (
                    <div className="p-8 text-center text-muted italic bg-page rounded-xl border border-border">
                      No students are currently allocated to this community group.
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-6 text-center text-muted text-xs bg-page rounded-xl border border-border">
                      No members match search query "{memberSearch}".
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      {filteredMembers.map((st) => (
                        <div key={st.id} className="p-3 bg-surface hover:bg-page flex justify-between items-center transition-colors">
                          <div className="min-w-0 pr-3">
                            <p className="font-semibold text-primary truncate">{st.name}</p>
                            <p className="text-[11px] text-muted font-mono">{st.student_id}</p>
                          </div>
                          <span className="text-[11px] text-secondary shrink-0 font-medium">{st.program || 'Student'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            <div className="p-4 border-t border-border bg-page/50 flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => {
                  if (selectedCommunity.student_count === 0) {
                    handleSimpleDelete(selectedCommunity);
                  } else {
                    setDeleteTarget(selectedCommunity);
                    setDeleteStrategy('REASSIGN_EXISTING');
                    setTargetCommunityId('');
                    setAdminPassword('');
                    setDeleteError('');
                    setDeleteModalOpen(true);
                  }
                }}
              >
                Delete Community
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg text-xs border-border-strong" onClick={() => setSelectedCommunity(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PROTECTED DELETION & REASSIGNMENT MODAL */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-border-strong animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border bg-red-50/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-700">Protected Community Deletion</h3>
              <button onClick={() => setDeleteModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-primary hover:bg-page transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProtectedDeleteSubmit} className="p-6 space-y-4 text-xs">
              {deleteError && (
                <Alert variant="destructive" className="rounded-xl">
                  <span>{deleteError}</span>
                </Alert>
              )}

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                Community <strong>"{deleteTarget.name}"</strong> has <strong>{deleteTarget.student_count}</strong> assigned students. You must reassign them to prevent orphaned records.
              </div>

              <div>
                <Label className="font-semibold text-primary block mb-1.5">Student Reassignment Strategy</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    deleteStrategy === 'REASSIGN_EXISTING'
                      ? 'border-[#093C22] bg-emerald-50 text-[#093C22] font-bold'
                      : 'border-border text-secondary hover:bg-page'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={deleteStrategy === 'REASSIGN_EXISTING'}
                      onChange={() => setDeleteStrategy('REASSIGN_EXISTING')}
                      className="sr-only"
                    />
                    <span>Reassign to Existing</span>
                  </label>

                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    deleteStrategy === 'CREATE_REPLACEMENT'
                      ? 'border-[#093C22] bg-emerald-50 text-[#093C22] font-bold'
                      : 'border-border text-secondary hover:bg-page'
                  }`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={deleteStrategy === 'CREATE_REPLACEMENT'}
                      onChange={() => setDeleteStrategy('CREATE_REPLACEMENT')}
                      className="sr-only"
                    />
                    <span>Create Replacement</span>
                  </label>
                </div>
              </div>

              {deleteStrategy === 'REASSIGN_EXISTING' ? (
                <div>
                  <Label className="font-semibold text-primary block mb-1">Target Community</Label>
                  <select
                    value={targetCommunityId}
                    onChange={(e) => setTargetCommunityId(e.target.value)}
                    required
                    className="w-full bg-page border border-border-strong text-xs rounded-lg px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#093C22]"
                  >
                    <option value="">Select destination community...</option>
                    {communities.filter(c => c.id !== deleteTarget.id).map(c => (
                      <option key={c.id} value={c.id} disabled={c.slots_remaining < deleteTarget.student_count}>
                        {c.name} ({c.group_label}) — {c.slots_remaining} slots free {c.slots_remaining < deleteTarget.student_count ? '(Insufficient capacity)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-page rounded-xl border border-border">
                  <div>
                    <Label className="font-semibold text-primary block mb-1">Replacement Name</Label>
                    <Input
                      type="text"
                      required
                      value={replacementComm.name}
                      onChange={e => setReplacementComm({...replacementComm, name: e.target.value})}
                      placeholder="e.g. New Tamale Community"
                      className="text-xs bg-surface border-border-strong rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="text"
                      required
                      value={replacementComm.district}
                      onChange={e => setReplacementComm({...replacementComm, district: e.target.value})}
                      placeholder="District"
                      className="text-xs bg-surface border-border-strong rounded-lg"
                    />
                    <Input
                      type="text"
                      required
                      value={replacementComm.region}
                      onChange={e => setReplacementComm({...replacementComm, region: e.target.value})}
                      placeholder="Region"
                      className="text-xs bg-surface border-border-strong rounded-lg"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={deleteTarget.student_count}
                      required
                      value={replacementComm.capacity}
                      onChange={e => setReplacementComm({...replacementComm, capacity: parseInt(e.target.value) || 0})}
                      placeholder={`Capacity (min ${deleteTarget.student_count})`}
                      className="text-xs bg-surface border-border-strong rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="font-semibold text-primary block mb-1">
                  Administrator Password Re-authentication
                </Label>
                <Input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter active admin password to confirm"
                  className="text-xs bg-page border-border-strong rounded-lg text-primary"
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 text-xs rounded-lg border-border-strong text-primary hover:bg-page"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  {deleteLoading ? 'Executing Reassignment...' : 'Confirm & Delete'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
