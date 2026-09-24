import React, { useEffect, useState, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  LayersControl,
  useMapEvents
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';
import { CheckCircle, Clock, MapPin, Navigation } from 'lucide-react';

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

const myLocationIcon = L.divIcon({
  className: 'my-location-icon',
  html: `<div style="
    background-color: #3b82f6; 
    width: 16px; 
    height: 16px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const selectedLocationIcon = L.divIcon({
  className: 'selected-location-icon',
  html: `<div style="
    background-color: #ef4444; 
    width: 16px; 
    height: 16px; 
    border-radius: 50%; 
    border: 2px solid white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

interface StudentMapProps {
  community: LocalCommunity;
  features: LocalFeature[];
  filterType: string;
  surveys?: LocalSurvey[];
}

function createFeatureIcon(type: string, hasSurvey: boolean) {
  let color = '#093C22';
  if (type === 'HOUSEHOLD') color = '#2563EB';
  else if (type === 'EDUCATION') color = '#D97706';
  else if (type === 'HEALTH') color = '#DC2626';
  else if (type === 'GOVERNANCE') color = '#7C3AED';

  const bgColor = hasSurvey ? color : '#9CA3AF';
  const html = `
    <div style="
      background-color: ${bgColor}; 
      width: 16px; 
      height: 16px; 
      border-radius: 50%; 
      border: 2px solid #FFFFFF; 
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

function MapInteractions({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function StudentMap({ community, features, filterType, surveys = [] }: StudentMapProps) {
  const [currentLocation, setCurrentLocation] = useState<L.LatLng | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  
  const hasInitiallyLocated = useRef(false);

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

  const locateUser = (isInitial = false) => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      if (isInitial) setIsLocating(false);
      return;
    }
    
    if (!isInitial) setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
        setCurrentLocation(latlng);
        setLocationError(null);
        setIsLocating(false);
        if (mapRef) {
          mapRef.flyTo(latlng, 17, { animate: !isInitial });
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError("Location permission denied or unavailable. Showing community area.");
        // If initial locate fails, we just stay at defaultCenter (community)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!hasInitiallyLocated.current && mapRef) {
      hasInitiallyLocated.current = true;
      locateUser(true);
    }
  }, [mapRef]);

  return (
    <div className="w-full h-full relative z-0 flex flex-col">
      {/* Initial Loading Overlay */}
      {isLocating && !currentLocation && (
        <div className="absolute inset-0 bg-white/70 z-[2000] flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm font-medium text-gray-700">Obtaining current location...</div>
        </div>
      )}

      {/* Location Error Overlay */}
      {locationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded shadow text-sm flex items-center">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="ml-2 font-bold text-amber-900 hover:text-amber-950 text-lg">&times;</button>
        </div>
      )}

      {/* Floating Controls */}
      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => locateUser(false)}
          disabled={isLocating}
          className="bg-white p-3 rounded-full shadow-lg border border-gray-200 text-gray-700 hover:text-blue-600 hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50"
          title="My Location"
        >
          <Navigation size={20} className={isLocating && currentLocation ? 'animate-pulse' : ''} />
        </button>
      </div>

      <MapContainer 
        center={defaultCenter} 
        zoom={15} 
        className="flex-1 w-full z-0"
        zoomControl={true}
        ref={setMapRef}
      >
        <MapInteractions onMapClick={(latlng) => setSelectedLocation(latlng)} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        {/* Community Boundary */}
        {boundaryGeoJson && boundaryGeoJson.type === 'Polygon' && (
           <Polygon 
             positions={(boundaryGeoJson.coordinates as number[][][])[0].map((c: number[]) => [c[1], c[0]])} 
             pathOptions={{ color: '#093C22', fillColor: '#093C22', fillOpacity: 0.1, weight: 2 }}
           />
        )}

        {/* Community Center Marker */}
        {community.latitude && community.longitude && (
          <Marker position={[community.latitude, community.longitude]} opacity={0.6}>
            <Popup>
              <div className="font-bold text-gray-900">{community.name}</div>
              <div className="text-xs text-gray-500">Community Assignment Center</div>
            </Popup>
          </Marker>
        )}

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker position={currentLocation} icon={myLocationIcon}>
            <Popup>
              <div className="font-semibold text-sm text-blue-700">My Location</div>
              <div className="text-xs text-gray-500 font-mono mt-1">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Selected Location Marker */}
        {selectedLocation && (
          <Marker position={selectedLocation} icon={selectedLocationIcon}>
            <Popup>
              <div className="font-semibold text-sm text-red-600 flex items-center gap-1">
                <MapPin size={14} /> Selected Location
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">
                {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
              </div>
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
      
      {/* Selected Location Bottom Panel */}
      {selectedLocation && (
        <div className="bg-white border-t p-3 text-sm flex justify-between items-center shadow-lg z-[1000] shrink-0">
          <div>
            <div className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              Selected Location
            </div>
            <div className="text-gray-500 font-mono text-xs mt-1">
              Lat: {selectedLocation.lat.toFixed(6)} | Lng: {selectedLocation.lng.toFixed(6)}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="bg-cfss-green text-white px-4 py-2 rounded font-semibold text-xs hover:bg-green-700 transition-colors"
              onClick={() => alert(`Use Location: ${selectedLocation.lat}, ${selectedLocation.lng}`)}
            >
              Use Location
            </button>
            <button 
              onClick={() => setSelectedLocation(null)}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
