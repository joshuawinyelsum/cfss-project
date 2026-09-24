import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';
import { FileEdit, CheckCircle, Clock } from 'lucide-react';

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
  surveys?: LocalSurvey[];
}

function createFeatureIcon(type: string, hasSurvey: boolean) {
  let color = '#093C22'; // CFSS Green
  if (type === 'HOUSEHOLD') color = '#2563EB'; // Blue
  else if (type === 'EDUCATION') color = '#D97706'; // Amber
  else if (type === 'HEALTH') color = '#DC2626'; // Red
  else if (type === 'GOVERNANCE') color = '#7C3AED'; // Purple

  const bgColor = hasSurvey ? color : '#9CA3AF';
  const borderColor = '#FFFFFF';

  const html = `
    <div style="
      background-color: ${bgColor}; 
      width: 16px; 
      height: 16px; 
      border-radius: 50%; 
      border: 2px solid ${borderColor}; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `;

  return L.divIcon({
    className: 'custom-feature-icon',
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  });
}

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

export default function StudentMap({ community, features, filterType, surveys = [] }: StudentMapProps) {
  const defaultCenter: L.LatLngTuple = community.latitude && community.longitude 
    ? [community.latitude, community.longitude] 
    : [0, 0];

  const visibleFeatures = filterType === 'ALL' 
    ? features 
    : features.filter(f => f.feature_type === filterType);

  const boundaryGeoJson = community.spatial_metadata?.boundary as Record<string, unknown>;

  const getAssociatedSurvey = (featureId: string) => {
    return surveys.find(s => s.field_feature_id === featureId);
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={15} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Fit Bounds */}
        <FitBounds community={community} features={visibleFeatures} />

        {/* Community Boundary */}
        {boundaryGeoJson && boundaryGeoJson.type === 'Polygon' && (
           <Polygon 
             positions={(boundaryGeoJson.coordinates as number[][][])[0].map((c: number[]) => [c[1], c[0]])} 
             pathOptions={{ color: '#093C22', fillColor: '#093C22', fillOpacity: 0.1, weight: 2 }}
           />
        )}

        {/* Community Center Marker */}
        {community.latitude && community.longitude && (
          <Marker position={[community.latitude, community.longitude]} opacity={0.7} zIndexOffset={-100}>
            <Popup>
              <div className="font-bold text-gray-900">{community.name}</div>
              <div className="text-xs text-gray-500">Community Assignment Center</div>
              
            </Popup>
          </Marker>
        )}

        {/* Field Features */}
        {visibleFeatures.map(feature => {
          const associatedSurvey = getAssociatedSurvey(feature.id);
          const icon = createFeatureIcon(feature.feature_type, !!associatedSurvey);

          return (
            <Marker 
              key={feature.id} 
              position={[feature.latitude, feature.longitude]}
              icon={icon}
            >
              <Popup className="cfss-popup">
                <div className="flex flex-col gap-2 min-w-[180px]">
                  <div className="flex items-center justify-between border-b pb-2">
                    <strong className="text-gray-900 capitalize text-sm font-bold">
                      {feature.feature_type.toLowerCase()} Feature
                    </strong>
                    {associatedSurvey && associatedSurvey.status === 'SUBMITTED' && (
                       <CheckCircle size={14} className="text-cfss-green" />
                    )}
                  </div>
                  
                  {associatedSurvey ? (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Survey ID:</span>
                        <span className="font-mono text-gray-800">{associatedSurvey.entity_id || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-semibold ${associatedSurvey.status === 'SUBMITTED' ? 'text-cfss-green' : 'text-amber-600'}`}>
                          {associatedSurvey.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-1 rounded border border-amber-100">
                      <Clock size={12} />
                      <span>Pending survey attachment</span>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 mt-1 border-t pt-1 space-y-0.5">
                    <div>Loc: {feature.latitude.toFixed(6)}, {feature.longitude.toFixed(6)}</div>
                    {feature.accuracy_meters != null && (
                      <div>Accuracy: {Math.round(feature.accuracy_meters)}m</div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
