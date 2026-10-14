"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Map,
  Building2,
  MapPin,
  Layers,
  Search,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Navigation
} from 'lucide-react';

const CoordinatorReadOnlyMap = dynamic(
  () => import('@/components/CoordinatorReadOnlyMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-subtle border border-border-strong rounded-2xl flex flex-col items-center justify-center text-secondary">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Loading Community GIS Map...</span>
      </div>
    )
  }
);

interface CommunitySummary {
  id: number;
  name: string;
  district: string;
  region: string;
  group_number: number;
  has_boundary: boolean;
  roads_count: number;
  facilities_count: number;
}

interface GisData {
  community: {
    id: number;
    name: string;
    district: string;
    region: string;
    group_number: number;
    latitude?: number | null;
    longitude?: number | null;
    spatial_metadata?: any | null;
  };
  features: Array<{
    id: string;
    feature_type: string;
    category?: string | null;
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geometry?: any | null;
  }>;
}

export default function CoordinatorMapPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const paramCommunityId = searchParams.get('community_id');

  const [assignedCommunities, setAssignedCommunities] = useState<CommunitySummary[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [gisData, setGisData] = useState<GisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadAssignedCommunities();
  }, [token]);

  const loadAssignedCommunities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/coordinator/communities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list: CommunitySummary[] = res.data || [];
      setAssignedCommunities(list);

      if (list.length > 0) {
        const initialId = paramCommunityId
          ? parseInt(paramCommunityId, 10)
          : list[0].id;
        setSelectedCommunityId(initialId);
        loadGisData(initialId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load assigned communities for GIS view'));
    } finally {
      setLoading(false);
    }
  };

  const loadGisData = async (communityId: number) => {
    setMapLoading(true);
    try {
      const res = await api.get(`/api/coordinator/gis/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGisData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load GIS data for this community'));
    } finally {
      setMapLoading(false);
    }
  };

  const handleSelectCommunity = (commId: number) => {
    setSelectedCommunityId(commId);
    loadGisData(commId);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-secondary">Loading assigned community maps...</p>
      </div>
    );
  }

  if (assignedCommunities.length === 0) {
    return (
      <div className="p-12 text-center bg-surface border border-border-strong rounded-2xl max-w-lg mx-auto">
        <Map className="w-10 h-10 text-muted opacity-40 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-primary">No assigned community maps</h3>
        <p className="text-xs text-secondary mt-1">
          You currently have no active community assignments to inspect.
        </p>
      </div>
    );
  }

  const currentSummary = assignedCommunities.find(c => c.id === selectedCommunityId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Map className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Community GIS Maps Inspection
          </h1>
          <p className="text-sm text-secondary mt-1">
            Read-only geospatial inspection of community boundaries, access roads, and surveyed facility pins across your assigned supervision scope.
          </p>
        </div>

        {/* Community Selector Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-secondary">Community:</span>
          <select
            value={selectedCommunityId || ''}
            onChange={e => handleSelectCommunity(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 bg-surface border border-border-strong rounded-xl text-xs font-bold text-primary focus:ring-1 focus:ring-emerald-500 shadow-xs"
          >
            {assignedCommunities.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (Group {c.group_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spatial Metadata Summary Bar */}
      {currentSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-surface border border-border-strong rounded-xl shadow-xs">
            <div className="text-xs text-secondary">Locality</div>
            <div className="text-sm font-bold text-primary mt-0.5 truncate">{currentSummary.name}</div>
            <div className="text-[11px] text-muted">{currentSummary.district}, {currentSummary.region}</div>
          </div>

          <div className="p-3.5 bg-surface border border-border-strong rounded-xl shadow-xs">
            <div className="text-xs text-secondary">Boundary Status</div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentSummary.has_boundary
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-subtle text-muted border border-border-subtle'
                }`}
              >
                {currentSummary.has_boundary ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {currentSummary.has_boundary ? 'Boundary Traced' : 'No Boundary Yet'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-surface border border-border-strong rounded-xl shadow-xs">
            <div className="text-xs text-secondary">Surveyed Facilities</div>
            <div className="text-base font-bold text-primary mt-0.5">
              {gisData ? gisData.features.filter(f => f.feature_type !== 'ROAD').length : currentSummary.facilities_count} pins
            </div>
            <div className="text-[11px] text-muted">Clinics, schools, water points</div>
          </div>

          <div className="p-3.5 bg-surface border border-border-strong rounded-xl shadow-xs">
            <div className="text-xs text-secondary">Classified Access Routes</div>
            <div className="text-base font-bold text-primary mt-0.5">
              {gisData ? gisData.features.filter(f => f.feature_type === 'ROAD').length : currentSummary.roads_count} routes
            </div>
            <div className="text-[11px] text-muted">Primary, feeder, and footpaths</div>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      {mapLoading || !gisData ? (
        <div className="w-full h-[550px] bg-subtle border border-border-strong rounded-2xl flex flex-col items-center justify-center text-secondary">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs">Loading spatial geometries...</span>
        </div>
      ) : (
        <CoordinatorReadOnlyMap
          community={gisData.community}
          features={gisData.features}
        />
      )}
    </div>
  );
}

