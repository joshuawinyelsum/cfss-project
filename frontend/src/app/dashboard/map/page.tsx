"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';
import { db, LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import dynamic from 'next/dynamic';
import {
  MapPin,
  WifiOff,
  Loader2,
  Edit3,
  Search,
  Navigation,
  AlertCircle,
  X
} from 'lucide-react';
import * as turf from '@turf/turf';

interface GeocodingResult {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
}

const StudentMap = dynamic(() => import('@/components/StudentMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface">
      <Loader2 className="w-8 h-8 text-[#093C22] animate-spin mb-4" />
      <p className="text-sm font-medium text-muted">Initializing GIS Mapping Engine...</p>
    </div>
  ),
});

export default function MapPage() {
  const { user, token } = useAuthStore();
  const [community, setCommunity] = useState<LocalCommunity | null>(null);
  const [features, setFeatures] = useState<LocalFeature[]>([]);
  const [surveys, setSurveys] = useState<LocalSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isOffline, setIsOffline] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Missing community / location setup modal
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [setupLat, setSetupLat] = useState('');
  const [setupLng, setSetupLng] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [setupError, setSetupError] = useState('');
  const [setupSaving, setSetupSaving] = useState(false);
  const nominatimCache = useRef<Map<string, GeocodingResult[]>>(new Map());

  // Live GIS Metrics
  const [gisMetrics, setGisMetrics] = useState<{
    areaHa: string;
    areaKm2: string;
    perimeterKm: string;
    centroid: [number, number] | null;
  } | null>(null);

  const loadMapData = useCallback(async () => {
    if (!token || !user?.community_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setIsOffline(!navigator.onLine);

    try {
      if (navigator.onLine) {
        try {
          const res = await api.get('/api/student/spatial/data', {
            headers: { Authorization: `Bearer ${token}` }
          });

          const serverCommunity = res.data.community;
          const serverFeatures = res.data.features;

          const localComm: LocalCommunity = {
            id: parseInt(serverCommunity.id),
            name: serverCommunity.name,
            district: serverCommunity.district || null,
            region: serverCommunity.region || null,
            group_number: serverCommunity.group_number || null,
            latitude: serverCommunity.latitude,
            longitude: serverCommunity.longitude,
            spatial_metadata: serverCommunity.spatial_metadata,
            updated_at: new Date().toISOString()
          };
          await db.communities.put(localComm);

          for (const sf of serverFeatures) {
            const existing = await db.features.get(sf.id);
            if (!existing || existing.sync_status === 'synced') {
              await db.features.put({
                ...sf,
                student_id: sf.captured_by_id,
                sync_status: 'synced',
                created_at: sf.created_at || new Date().toISOString(),
                updated_at: sf.updated_at || new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.warn("API map fetch failed, using local cache", e);
          setIsOffline(true);
        }
      }

      let localComm = await db.communities.get(user.community_id!);

      // If community is not yet cached locally, create a local baseline so fieldwork isn't blocked
      if (!localComm) {
        localComm = {
          id: user.community_id,
          name: ((user as unknown as Record<string, unknown>).community_name as string) || `Community (Group ${user.group_number || 1})`,
          latitude: null,
          longitude: null,
          spatial_metadata: null,
          updated_at: new Date().toISOString()
        };
        await db.communities.put(localComm);
      }

      const localFeats = await db.features.where('community_id').equals(user.community_id!).toArray();
      const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();

      setCommunity(localComm);
      setFeatures(localFeats.filter(f => f.sync_status !== 'pending' || (f as unknown as { status: string }).status !== 'DELETED'));
      setSurveys(localSurveys.filter(s => s.status !== 'DELETED'));

      if (localComm.latitude != null && localComm.longitude != null) {
        setSetupLat(localComm.latitude.toString());
        setSetupLng(localComm.longitude.toString());
      }
    } catch (e) {
      setError(getErrorMessage(e, "An error occurred loading map data"));
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) {
        await loadMapData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMapData]);

  const featureTypes = useMemo(() => {
    const types = new Set(features.map(f => f.feature_type));
    return ['ALL', ...Array.from(types).sort()];
  }, [features]);

  // Handle saving drawn community boundary
  const handleSaveBoundary = async (geojson: GeoJSON.Feature | GeoJSON.GeoJsonObject | null) => {
    if (!community || !token) return;
    try {
      let lat = community.latitude;
      let lng = community.longitude;

      if (geojson) {
        const featureGeoJson = geojson as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
        if (featureGeoJson.type !== 'Feature' || !featureGeoJson.geometry || !['Polygon', 'MultiPolygon'].includes(featureGeoJson.geometry.type)) {
          alert('Boundary must be a valid GeoJSON Polygon or MultiPolygon.');
          return;
        }
        try {
          const centroid = turf.centroid(featureGeoJson);
          lng = parseFloat(centroid.geometry.coordinates[0].toFixed(6));
          lat = parseFloat(centroid.geometry.coordinates[1].toFixed(6));
        } catch (e) {
          console.warn("Failed to calculate centroid", e);
        }

        if (!featureGeoJson.properties) featureGeoJson.properties = {};
        if (!featureGeoJson.properties.provenance) {
          featureGeoJson.properties.provenance = 'MANUALLY_MAPPED';
        }
      }

      const payload = {
        spatial_metadata: (geojson as unknown as Record<string, unknown>) || null,
        latitude: lat,
        longitude: lng
      };

      const updatedCommunity: LocalCommunity = {
        ...community,
        ...payload
      };
      setCommunity(updatedCommunity);
      await db.communities.put(updatedCommunity);

      // Queue sync operation for reliable persistence
      await syncEngine.queueOperation('UPDATE', 'COMMUNITY', community.id.toString(), payload, token);

      // If online, also update backend directly
      if (navigator.onLine) {
        try {
          await api.put('/api/student/spatial/community', payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.warn("Direct spatial update failed; operation queued in sync", err);
        }
      }

      setEditMode(false);
    } catch (e) {
      alert("Failed to save boundary locally: " + getErrorMessage(e, "Error"));
    }
  };

  // Handle saving manually drawn road/path lines
  const handleSaveRoad = async (roadGeoJSON: GeoJSON.Feature) => {
    if (!community || !token) return;
    try {
      const existingId = (roadGeoJSON.id as string) || (roadGeoJSON.properties?.id as string) || null;
      const existingFeature = existingId ? features.find(f => f.id === existingId) : null;
      const roadId = existingId || crypto.randomUUID();
      const coords = (roadGeoJSON.geometry as GeoJSON.LineString | undefined)?.coordinates || [];
      const midPoint = coords.length > 0 ? coords[Math.floor(coords.length / 2)] : [0, 0];

      const roadFeature: LocalFeature = {
        id: roadId,
        student_id: (existingFeature?.student_id ?? user?.id) as number,
        community_id: community.id,
        feature_type: 'ROAD',
        latitude: parseFloat(midPoint[1].toFixed(6)),
        longitude: parseFloat(midPoint[0].toFixed(6)),
        accuracy_meters: existingFeature?.accuracy_meters ?? 5,
        metadata_json: {
          ...(existingFeature?.metadata_json || {}),
          label: (roadGeoJSON.properties?.label as string) || (existingFeature?.metadata_json?.label as string) || 'Field Access Road / Path',
          category: roadGeoJSON.properties?.category || (existingFeature?.metadata_json?.category as string) || 'LOCAL_ROAD',
          notes: roadGeoJSON.properties?.notes !== undefined ? roadGeoJSON.properties.notes : (existingFeature?.metadata_json?.notes || ''),
          length_km: roadGeoJSON.properties?.length_km,
          geometry: roadGeoJSON.geometry,
          provenance: 'MANUALLY_MAPPED'
        },
        sync_status: 'pending',
        created_at: existingFeature?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.features.put(roadFeature);
      setFeatures(prev => {
        const exists = prev.some(f => f.id === roadId);
        if (exists) {
          return prev.map(f => f.id === roadId ? roadFeature : f);
        }
        return [...prev, roadFeature];
      });

      const opType = existingFeature ? 'UPDATE' : 'CREATE';
      await syncEngine.queueOperation(opType, 'FEATURE', roadId, roadFeature as unknown as Record<string, unknown>, token);
    } catch (e) {
      alert("Failed to save road feature: " + getErrorMessage(e, "Error"));
    }
  };

  // Handle deleting mapped features (e.g. roads/paths)
  const handleDeleteRoad = async (featureId: string) => {
    try {
      await db.features.delete(featureId);
      setFeatures(prev => prev.filter(f => f.id !== featureId));
      if (token) {
        await syncEngine.queueOperation('DELETE', 'FEATURE', featureId, {}, token);
      }
    } catch (e) {
      alert("Failed to delete feature: " + getErrorMessage(e, "Error"));
    }
  };

  // Handle setting community location (missing-community workflow)
  const handleSetCommunityLocation = async (lat: number, lng: number, provenance: 'GPS_ASSISTED' | 'MANUALLY_MAPPED' | 'EXTERNALLY_SOURCED') => {
    if (!community || !token) return;
    setSetupSaving(true);
    setSetupError('');

    try {
      const payload = {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        spatial_metadata: community.spatial_metadata ? {
          ...community.spatial_metadata,
          properties: {
            ...(((community.spatial_metadata as unknown as GeoJSON.Feature | null)?.properties) || {}),
            provenance
          }
        } : {
          type: "Feature",
          properties: { provenance },
          geometry: null
        }
      };

      const updatedComm: LocalCommunity = {
        ...community,
        ...payload
      };

      setCommunity(updatedComm);
      await db.communities.put(updatedComm);
      await syncEngine.queueOperation('UPDATE', 'COMMUNITY', community.id.toString(), payload, token);

      if (navigator.onLine) {
        try {
          await api.put('/api/student/spatial/community', payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.warn("Direct community location save failed; queued in sync engine", err);
        }
      }

      setShowLocationSetup(false);
    } catch (err: unknown) {
      setSetupError(getErrorMessage(err, "Failed to set community location"));
    } finally {
      setSetupSaving(false);
    }
  };

  // GPS Acquisition for Community Center
  const handleGpsSetLocation = () => {
    if (!('geolocation' in navigator)) {
      setSetupError("Geolocation is not supported by your browser");
      return;
    }
    setSetupSaving(true);
    setSetupError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSetupLat(latitude.toFixed(6));
        setSetupLng(longitude.toFixed(6));
        handleSetCommunityLocation(latitude, longitude, 'GPS_ASSISTED');
      },
      (err) => {
        setSetupSaving(false);
        setSetupError(`GPS error: ${err.message}. Please enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Search OpenStreetMap Nominatim via Backend Proxy (shared rate limiting, caching & OSM compliance)
  const handleSearchLocation = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check in-memory cache first to avoid redundant network queries
    const cacheKey = trimmed.toLowerCase();
    if (nominatimCache.current.has(cacheKey)) {
      const cached = nominatimCache.current.get(cacheKey)!;
      setSearchResults(cached);
      if (cached.length === 0) {
        setSetupError(`No map matches found for "${trimmed}". You can capture coordinates via GPS or enter them manually.`);
      }
      return;
    }

    setSearching(true);
    setSetupError('');
    setSearchResults([]);

    try {
      if (!navigator.onLine) {
        setSetupError("You are offline. Please capture coordinates via GPS or enter them manually.");
        return;
      }

      const res = await api.get('/api/student/spatial/geocode', {
        params: { q: trimmed, country: 'gh', limit: 5 },
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data?.results || [];
      nominatimCache.current.set(cacheKey, data);
      setSearchResults(data);
      if (data.length === 0) {
        setSetupError(`No map matches found for "${trimmed}". You can capture coordinates via GPS or enter them manually.`);
      }
    } catch (e: unknown) {
      if ((e as { response?: { status?: number } })?.response?.status === 429) {
        setSetupError("Geocoding rate limit reached across the application. Please retry shortly.");
      } else {
        setSetupError(getErrorMessage(e, "Geocoding service unavailable. Please capture via GPS or enter coordinates manually."));
      }
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-[#093C22] animate-spin mb-4" />
        <p className="text-sm font-medium text-muted">Loading community GIS data...</p>
      </div>
    );
  }

  if (error && !community) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-surface">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mb-4 border border-red-200">
          <MapPin size={32} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-primary mb-2">Map Data Unavailable</h3>
        <p className="text-xs text-secondary max-w-md">{error}</p>
        <button
          onClick={loadMapData}
          className="mt-4 px-4 py-2 bg-[#093C22] text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-[#0c512e] transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const hasLocation = community?.latitude != null && community?.longitude != null;

  return (
    <div className="flex flex-col h-full bg-page relative">
      {/* Header Bar */}
      <div className="bg-surface border-b border-border-strong px-4 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-10 relative shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-primary text-sm">Community Field GIS</h1>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-[#093C22]/10 text-[#093C22] border border-[#093C22]/20">
              {community?.name || 'Assigned Community'}
            </span>
            {isOffline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                <WifiOff size={10} />
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-secondary mt-0.5">
            {hasLocation ? (
              <span className="font-mono text-[11px]">
                Center: {community?.latitude?.toFixed(5)}°, {community?.longitude?.toFixed(5)}°
                {gisMetrics?.areaHa && ` • Area: ${gisMetrics.areaHa} ha • Perimeter: ${gisMetrics.perimeterKm} km`}
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Coordinates not yet established for this community.</span>
            )}
          </p>
        </div>

        {/* Actions & Layer Controls */}
        <div className="flex items-center gap-2">
          {!hasLocation ? (
            <button
              onClick={() => setShowLocationSetup(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Navigation size={13} />
              <span>Set Center Location</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLocationSetup(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-surface hover:bg-page text-secondary border border-border-strong font-medium transition-colors cursor-pointer shadow-2xs"
              title="Adjust Community Center Coordinate"
            >
              <span>Relocate</span>
            </button>
          )}

          <button
            onClick={() => setEditMode(!editMode)}
            className={`text-xs px-3 py-1.5 rounded-lg shadow-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              editMode
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300'
                : 'bg-surface text-primary hover:bg-page border border-border-strong'
            }`}
          >
            {editMode ? <><MapPin size={13} /> Done Drawing</> : <><Edit3 size={13} /> Draw Boundary</>}
          </button>

          {features.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs border border-border-strong rounded-lg shadow-xs bg-surface text-primary focus:border-[#093C22] focus:ring-1 focus:ring-[#093C22] py-1.5 pl-2.5 pr-6 cursor-pointer"
            >
              {featureTypes.map(ft => (
                <option key={ft} value={ft}>
                  {ft === 'ALL' ? 'All Features' : ft.charAt(0) + ft.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Map Content Area */}
      <div className="flex-1 relative z-0">
        {community && (
          <StudentMap
            community={community}
            features={features}
            filterType={filterType}
            surveys={surveys}
            onSaveBoundary={handleSaveBoundary}
            onSaveRoad={handleSaveRoad}
            onDeleteFeature={handleDeleteRoad}
            editModeEnabled={editMode}
            onSetLocationClick={() => setShowLocationSetup(true)}
            onMetricsChange={setGisMetrics}
          />
        )}
      </div>

      {/* MISSING COMMUNITY & LOCATION SETUP DRAWER / MODAL */}
      {showLocationSetup && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-border-strong p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-primary">Community Location Establishment</h3>
                <p className="text-xs text-secondary mt-0.5">{community?.name}</p>
              </div>
              <button
                onClick={() => setShowLocationSetup(false)}
                className="p-1 text-muted hover:text-primary rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {setupError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Option 1: Live GPS Acquisition */}
              <div className="p-4 bg-page rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-primary flex items-center gap-1.5">
                    <Navigation size={14} className="text-[#093C22]" />
                    <span>Option A: Capture Center via Device GPS</span>
                  </div>
                  <button
                    onClick={handleGpsSetLocation}
                    disabled={setupSaving}
                    className="px-3 py-1.5 bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {setupSaving ? 'Acquiring...' : 'Capture GPS Fix'}
                  </button>
                </div>
                <p className="text-secondary text-[11px]">
                  Recommended when you are currently stationed in the community. Automatically pins the community center.
                </p>
              </div>

              {/* Option 2: Search Town / District */}
              <div className="p-4 bg-page rounded-xl border border-border space-y-3">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Search size={14} className="text-blue-600" />
                  <span>Option B: Search Town or Settlement Name</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter town, village, or district..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                    className="flex-1 px-3 py-1.5 bg-surface border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                  />
                  <button
                    onClick={handleSearchLocation}
                    disabled={searching}
                    className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="text-[10px] text-muted leading-tight">
                  Settlement search powered by <a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">OpenStreetMap Nominatim</a> (&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">OpenStreetMap</a> contributors).
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-semibold text-secondary uppercase">Matches found:</div>
                    {searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const lat = parseFloat(res.lat);
                          const lon = parseFloat(res.lon);
                          setSetupLat(lat.toFixed(6));
                          setSetupLng(lon.toFixed(6));
                          handleSetCommunityLocation(lat, lon, 'EXTERNALLY_SOURCED');
                        }}
                        className="p-2 bg-surface hover:bg-page border border-border rounded-lg cursor-pointer transition-colors text-primary flex items-center justify-between"
                      >
                        <span className="truncate pr-2">{res.display_name}</span>
                        <span className="text-[10px] font-mono text-[#093C22] shrink-0 font-semibold">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 3: Manual Coordinate Entry */}
              <div className="p-4 bg-page rounded-xl border border-border space-y-3">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Edit3 size={14} className="text-amber-600" />
                  <span>Option C: Enter Coordinates Directly</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-secondary font-medium block mb-1">Latitude (°)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 5.6037"
                      value={setupLat}
                      onChange={(e) => setSetupLat(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary font-medium block mb-1">Longitude (°)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. -0.1870"
                      value={setupLng}
                      onChange={(e) => setSetupLng(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const lat = parseFloat(setupLat);
                      const lng = parseFloat(setupLng);
                      if (isNaN(lat) || lat < -90 || lat > 90) {
                        setSetupError("Valid latitude between -90 and 90 is required");
                        return;
                      }
                      if (isNaN(lng) || lng < -180 || lng > 180) {
                        setSetupError("Valid longitude between -180 and 180 is required");
                        return;
                      }
                      handleSetCommunityLocation(lat, lng, 'MANUALLY_MAPPED');
                    }}
                    disabled={setupSaving}
                    className="px-3.5 py-1.5 bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Save Coordinates
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-end">
              <button
                onClick={() => setShowLocationSetup(false)}
                className="px-4 py-2 border border-border-strong text-secondary hover:bg-page font-medium rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
