import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocalCommunity, LocalFeature } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';

// Fix default leaflet icons
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface StudentMapProps {
  community: LocalCommunity;
  features: LocalFeature[];
  filterType: string;
}

// Helper to fit bounds to features
function FitBounds({ community, features }: { community: LocalCommunity, features: LocalFeature[] }) {
  const map = useMap();
  useEffect(() => {
    const latLngs: L.LatLngTuple[] = [];
    if (community.latitude && community.longitude) {
      latLngs.push([community.latitude, community.longitude]);
    }
    features.forEach(f => {
      latLngs.push([f.latitude, f.longitude]);
    });
    
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }, [community, features, map]);
  return null;
}

export default function StudentMap({ community, features, filterType }: StudentMapProps) {
  const defaultCenter: L.LatLngTuple = community.latitude && community.longitude 
    ? [community.latitude, community.longitude] 
    : [0, 0];

  const visibleFeatures = filterType === 'ALL' 
    ? features 
    : features.filter(f => f.feature_type === filterType);

  const boundaryGeoJson = community.spatial_metadata?.boundary as Record<string, unknown>;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={15} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Fit Bounds */}
        <FitBounds community={community} features={visibleFeatures} />

        {/* Community Boundary (if exists and is simple polygon format) */}
        {boundaryGeoJson && boundaryGeoJson.type === 'Polygon' && (
           <Polygon 
             positions={(boundaryGeoJson.coordinates as number[][][])[0].map((c: number[]) => [c[1], c[0]])} 
             pathOptions={{ color: '#093C22', fillColor: '#093C22', fillOpacity: 0.1 }}
           />
        )}

        {/* Community Center Marker */}
        {community.latitude && community.longitude && (
          <Marker position={[community.latitude, community.longitude]} opacity={0.8}>
            <Popup>
              <div className="font-bold text-gray-900">{community.name}</div>
              <div className="text-xs text-gray-500">Community Center</div>
            </Popup>
          </Marker>
        )}

        {/* Field Features */}
        {visibleFeatures.map(feature => (
          <Marker 
            key={feature.id} 
            position={[feature.latitude, feature.longitude]}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <strong className="text-gray-900 capitalize text-sm">{feature.feature_type.toLowerCase()}</strong>
                {feature.captured_at && (
                  <span className="text-xs text-gray-600">
                    Captured: {new Date(feature.captured_at).toLocaleDateString()}
                  </span>
                )}
                {feature.accuracy_meters != null && (
                  <span className="text-xs text-gray-600">
                    Accuracy: {Math.round(feature.accuracy_meters)}m
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
