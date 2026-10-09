"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { api, getErrorMessage } from '@/lib/api';
import { db, LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import dynamic from 'next/dynamic';
import { MapPin, WifiOff, Loader2, Edit3, Save } from 'lucide-react';
import * as turf from '@turf/turf';

const StudentMap = dynamic(() => import('@/components/StudentMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-sm font-medium text-muted">Loading map engine...</p>
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

  useEffect(() => {
    if (!token || !user?.community_id) return;
    
    let mounted = true;

    const loadMapData = async () => {
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
            
            if (mounted) {
              const localComm: LocalCommunity = {
                id: parseInt(serverCommunity.id),
                name: serverCommunity.name,
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
            }
          } catch (e) {
            console.warn("API map fetch failed, falling back to cache", e);
            if (mounted) setIsOffline(true);
          }
        }
        
        if (mounted) {
          const localComm = await db.communities.get(user.community_id!);
          const localFeats = await db.features.where('community_id').equals(user.community_id!).toArray();
          const localSurveys = await db.surveys.where('student_id').equals(user.id as number).toArray();
          
          if (!localComm) {
            if (!navigator.onLine) {
              setError("Map data unavailable offline. Connect to the internet once to download this community's map data.");
            } else {
              setError("No mapped data yet. No field features collected yet. Go to Collect to start your fieldwork.");
            }
          } else {
            setCommunity(localComm);
            setFeatures(localFeats.filter(f => f.sync_status !== 'pending' || (f as unknown as { status: string }).status !== 'DELETED'));
            setSurveys(localSurveys.filter(s => s.status !== 'DELETED'));
          }
        }
      } catch (e) {
        if (mounted) setError(getErrorMessage(e, "An error occurred loading map data"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    loadMapData();
    
    return () => { mounted = false; };
  }, [token, user]);

  const featureTypes = useMemo(() => {
    const types = new Set(features.map(f => f.feature_type));
    return ['ALL', ...Array.from(types).sort()];
  }, [features]);

  const handleSaveBoundary = async (geojson: any) => {
    if (!community || !token) return;
    try {
      let lat = community.latitude;
      let lng = community.longitude;
      
      if (geojson) {
        if (geojson.type !== 'Feature' || !geojson.geometry || !['Polygon', 'MultiPolygon'].includes(geojson.geometry.type)) {
          alert('Boundary must be a valid Polygon.');
          return;
        }
        try {
          const centroid = turf.centroid(geojson);
          lng = centroid.geometry.coordinates[0];
          lat = centroid.geometry.coordinates[1];
        } catch (e) {
          console.warn("Failed to calculate centroid", e);
        }
      }

      const payload = {
        spatial_metadata: geojson,
        latitude: lat,
        longitude: lng
      };
      
      const updatedCommunity = {
          ...community,
          ...payload
      };
      setCommunity(updatedCommunity);
      await db.communities.put(updatedCommunity);

      await syncEngine.queueOperation('UPDATE', 'COMMUNITY', community.id.toString(), payload, token);
      
      setEditMode(false);
    } catch (e) {
      alert("Failed to save boundary locally: " + getErrorMessage(e, "Error"));
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted">Loading spatial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <MapPin size={32} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Map Data Unavailable</h3>
        <p className="text-sm text-gray-500 max-w-md">{error}</p>
      </div>
    );
  }

  if (!community) {
    return null;
  }

  const hasLocation = community.latitude != null && community.longitude != null;

  return (
    <div className="flex flex-col h-full bg-page relative">
      <div className="bg-surface border-b border-border-strong px-4 py-3 shrink-0 flex items-center justify-between z-10 relative shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900">Community Map</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {community.name}
            {isOffline && (
              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-2">
                <WifiOff size={10} />
                Offline
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setEditMode(!editMode)}
             className={`text-xs px-3 py-1.5 rounded-md shadow-sm font-medium flex items-center gap-1 transition-colors ${editMode ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
          >
            {editMode ? <><MapPin size={14} /> Exit Editing</> : <><Edit3 size={14} /> Edit Boundary</>}
          </button>

          {features.length > 0 && (
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs border-gray-300 rounded-md shadow-sm focus:border-[#093C22] focus:ring-[#093C22] py-1.5 pl-2 pr-6"
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

      <div className="flex-1 relative z-0">
        {!hasLocation && features.length === 0 && !editMode ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <MapPin size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No mapped data yet</h3>
            <p className="text-sm text-gray-500 max-w-md">No field features collected yet. Go to Collect to start your fieldwork, or click Edit Boundary to draw the community extent.</p>
          </div>
        ) : (
          <StudentMap 
            community={community} 
            features={features} 
            filterType={filterType} 
            surveys={surveys} 
            onSaveBoundary={handleSaveBoundary}
            editModeEnabled={editMode}
          />
        )}
      </div>
    </div>
  );
}
