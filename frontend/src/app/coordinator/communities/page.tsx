"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Building2,
  Users,
  MapPin,
  Search,
  SlidersHorizontal,
  ChevronRight,
  X,
  FileCheck2,
  AlertTriangle,
  Map,
  Compass,
  Phone,
  Mail,
  GraduationCap,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface AssignedCommunity {
  id: number;
  name: string;
  district: string;
  region: string;
  group_number: number;
  capacity: number;
  student_count: number;
  has_boundary: boolean;
  latitude?: number | null;
  longitude?: number | null;
  roads_count: number;
  facilities_count: number;
  surveys_submitted: number;
  surveys_breakdown: Record<string, number>;
  open_issues_count: number;
}

interface StudentRosterItem {
  id: number;
  student_id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  faculty?: string | null;
  program?: string | null;
  is_active: boolean;
  submissions_count: number;
}

interface CommunityDetailData {
  community: AssignedCommunity;
  roster: StudentRosterItem[];
  features?: any[];
}

export default function CoordinatorCommunitiesPage() {
  const { token } = useAuthStore();
  const [communities, setCommunities] = useState<AssignedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Roster inspection drawer state
  const [selectedCommunityDetail, setSelectedCommunityDetail] = useState<CommunityDetailData | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadCommunities();
  }, [token]);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/communities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommunities(res.data || []);
    } catch (err) {
      setToast(getErrorMessage(err, 'Failed to load assigned communities'));
    } finally {
      setLoading(false);
    }
  };

  const handleInspectRoster = async (communityId: number) => {
    setRosterLoading(true);
    try {
      const res = await api.get(`/api/coordinator/communities/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCommunityDetail(res.data);
    } catch (err) {
      setToast(getErrorMessage(err, 'Failed to load community roster'));
    } finally {
      setRosterLoading(false);
    }
  };

  // Distinct groups for filtering
  const groupsList = useMemo(() => {
    const s = new Set<number>();
    communities.forEach(c => {
      if (c.group_number != null) s.add(c.group_number);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [communities]);

  // Filtered communities
  const filtered = useMemo(() => {
    return communities.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.region.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup =
        selectedGroup === 'ALL' || c.group_number === parseInt(selectedGroup, 10);

      return matchesSearch && matchesGroup;
    });
  }, [communities, searchQuery, selectedGroup]);

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
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            My Groups & Communities
          </h1>
          <p className="text-sm text-secondary mt-1">
            Supervise assigned fieldwork localities, student rosters, survey saturation, and spatial boundaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/coordinator/map"
            className="px-3.5 py-2 bg-surface hover:bg-hover border border-border-strong text-primary text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Open Spatial Map</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by community name, district, or region..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-border-strong rounded-lg text-sm text-primary placeholder:text-muted focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-medium">Cohort Group:</span>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-input-bg border border-border-strong rounded-lg text-xs font-semibold text-primary focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Groups ({groupsList.length})</option>
            {groupsList.map(g => (
              <option key={g} value={g.toString()}>
                Group {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Communities Grid / List */}
      {loading ? (
        <div className="py-20 text-center text-secondary">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading assigned communities...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border-strong rounded-2xl">
          <Building2 className="w-10 h-10 text-muted opacity-40 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-primary">No assigned communities found</h3>
          <p className="text-xs text-secondary mt-1">
            {searchQuery ? 'Try adjusting your search filters.' : 'Your administrator has not yet assigned any communities to your account.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(comm => (
            <div
              key={comm.id}
              className="bg-surface border border-border-strong hover:border-emerald-500/40 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Group {comm.group_number}
                    </span>
                    <h3 className="text-lg font-bold text-primary mt-1.5 leading-snug">{comm.name}</h3>
                    <div className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-muted" />
                      <span>{comm.district}, {comm.region}</span>
                    </div>
                  </div>

                  {/* Boundary status badge */}
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      comm.has_boundary
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-subtle text-muted'
                    }`}
                  >
                    {comm.has_boundary ? 'Boundary Mapped' : 'No Boundary'}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border-subtle my-3">
                  <div className="text-center">
                    <div className="text-xs text-secondary">Students</div>
                    <div className="text-base font-bold text-primary mt-0.5">{comm.student_count}</div>
                  </div>
                  <div className="text-center border-x border-border-subtle">
                    <div className="text-xs text-secondary">Surveys</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {comm.surveys_submitted}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-secondary">Issues</div>
                    <div className={`text-base font-bold mt-0.5 ${comm.open_issues_count > 0 ? 'text-amber-600' : 'text-primary'}`}>
                      {comm.open_issues_count}
                    </div>
                  </div>
                </div>

                {/* Survey Type Breakdown Pills */}
                {comm.surveys_breakdown && Object.keys(comm.surveys_breakdown).length > 0 && (
                  <div className="mb-4">
                    <div className="text-[11px] font-semibold text-secondary mb-1.5">Submitted Breakdown:</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(comm.surveys_breakdown).map(([type, cnt]) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-subtle text-secondary border border-border-subtle capitalize"
                        >
                          {type}: <strong className="text-primary">{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                <button
                  onClick={() => handleInspectRoster(comm.id)}
                  className="flex-1 py-2 px-3 rounded-lg bg-subtle hover:bg-hover text-xs font-semibold text-primary border border-border-strong transition-colors flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Student Roster ({comm.student_count})</span>
                </button>

                <Link
                  href={`/coordinator/map?community_id=${comm.id}`}
                  className="p-2 rounded-lg bg-subtle hover:bg-hover text-secondary hover:text-primary border border-border-strong transition-colors"
                  title="View Community GIS Map"
                >
                  <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          STUDENT ROSTER INSPECTION DRAWER / MODAL
      ========================================================================= */}
      {selectedCommunityDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-strong flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  {selectedCommunityDetail.community.name} — Student Roster
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Group {selectedCommunityDetail.community.group_number} • {selectedCommunityDetail.roster.length} fieldworkers registered
                </p>
              </div>
              <button
                onClick={() => setSelectedCommunityDetail(null)}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedCommunityDetail.roster.length === 0 ? (
                <div className="py-12 text-center text-secondary">
                  <Users className="w-8 h-8 text-muted opacity-40 mx-auto mb-2" />
                  <p className="text-xs">No students currently assigned to this community.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle border border-border-strong rounded-xl overflow-hidden">
                  {selectedCommunityDetail.roster.map(student => (
                    <div key={student.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-hover/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm">{student.name}</div>
                          <div className="text-xs text-secondary font-mono mt-0.5">{student.student_id}</div>
                          <div className="text-xs text-muted flex items-center gap-2 mt-1">
                            {student.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {student.email}
                              </span>
                            )}
                            {student.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {student.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {student.submissions_count} surveys
                          </div>
                          <div className="text-[11px] text-secondary">submitted</div>
                        </div>

                        <Link
                          href={`/coordinator/fieldworkers?student_id=${student.id}`}
                          className="px-2.5 py-1.5 rounded-lg border border-border-strong bg-subtle hover:bg-hover text-xs font-medium text-primary inline-flex items-center gap-1"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-strong flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCommunityDetail(null)}
                className="px-4 py-2 bg-subtle hover:bg-hover text-sm font-semibold text-primary rounded-lg transition-colors border border-border-strong"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

