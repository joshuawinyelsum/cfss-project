"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  LayersControl,
  useMapEvents,
  FeatureGroup,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { LocalCommunity, LocalFeature, LocalSurvey } from '@/lib/db';
import { CheckCircle, Clock, MapPin, Navigation, Save, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

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

// Setup specific colors based on feature type
const getColorForFeature = (type: string) => {
  switch (type.toUpperCase()) {
    case 'HOUSEHOLD': return '#093C22';
    case 'EDUCATION': return '#2563eb';
    case 'HEALTH': return '#dc2626';
    case 'GOVERNANCE': return '#9333ea';
    case 'WATER': return '#0ea5e9';
    default: return '#000000';
  }
};

const createFeatureIcon = (type: string, isSubmitted: boolean) => {
  const color = getColorForFeature(type);
  const opacity = isSubmitted ? '1' : '0.5';
  
  return L.divIcon({
    className: 'custom-feature-icon',
    html: `<div style="
      background-color: ${color};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      opacity: ${opacity};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const myLocationIcon = L.divIcon({
  className: 'my-location-icon',
  html: `<div style="
    background-color: #3b82f6;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 2px #3b82f655, 0 2px 4px rgba(0,0,0,0.4);
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
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapInteractions({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

interface GeomanSetupProps {
  featureGroupRef: React.RefObject<L.FeatureGroup | null>;
  onShapeChange: (geojson: any) => void;
  initialGeoJSON: any;
  editModeEnabled: boolean;
}

function GeomanSetup({ featureGroupRef, onShapeChange, initialGeoJSON, editModeEnabled }: GeomanSetupProps) {
  const map = useMap();
  const initDone = useRef(false);

  useEffect(() => {
    if (editModeEnabled) {
      map.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircle: false,
        drawText: false,
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
        drawPolygon: true,
      });
    } else {
      map.pm.removeControls();
    }

    const updateShape = () => {
      if (!featureGroupRef.current) return;
      const layers = featureGroupRef.current.getLayers();
      if (layers.length === 0) {
        onShapeChange(null);
        return;
      }
      if (layers.length > 1) {
        const lastLayer = layers[layers.length - 1];
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(lastLayer);
        onShapeChange((lastLayer as any).toGeoJSON());
      } else {
        onShapeChange((layers[0] as any).toGeoJSON());
      }
    };

    map.on('pm:create', (e) => {
      const layer = e.layer;
      featureGroupRef.current?.addLayer(layer);
      layer.on('pm:edit', updateShape);
      updateShape();
    });

    map.on('pm:remove', () => updateShape());
    
    if (initialGeoJSON && !initDone.current && featureGroupRef.current) {
      initDone.current = true;
      const layer = L.geoJSON(initialGeoJSON, {
        onEachFeature: (_, l) => l.on('pm:edit', updateShape)
      });
      const layers = layer.getLayers();
      if (layers.length > 0) {
        layers.forEach(l => featureGroupRef.current?.addLayer(l as L.Layer));
        try {
          map.fitBounds(featureGroupRef.current.getBounds(), { padding: [20, 20] });
        } catch(e) {}
      }
    }

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
    };
  }, [map, featureGroupRef, onShapeChange, initialGeoJSON, editModeEnabled]);

  return null;
}

interface StudentMapProps {
  community: LocalCommunity;
  features: LocalFeature[];
  filterType: string;
  surveys: LocalSurvey[];
  onSaveBoundary?: (geojson: any) => Promise<void>;
  editModeEnabled?: boolean;
}

export default function StudentMap({ community, features, filterType, surveys, onSaveBoundary, editModeEnabled = false }: StudentMapProps) {
  const [currentLocation, setCurrentLocation] = useState<L.LatLng | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(community.spatial_metadata || null);
  const [saving, setSaving] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const visibleFeatures = features.filter(f => 
    filterType === 'ALL' || f.feature_type === filterType
  );

  const getAssociatedSurvey = (featureId: string) => {
    return surveys.find(s => s.status !== 'DELETED' && s.field_feature_id === featureId);
  };

  const locateUser = useCallback((zoom = true) => {
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = new L.LatLng(latitude, longitude);
        setCurrentLocation(latlng);
        setIsLocating(false);
        if (zoom && mapRef) {
          mapRef.flyTo(latlng, 17, { duration: 1 });
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(`Location error: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [mapRef]);

  const handleExport = async (format: 'png' | 'jpeg' | 'pdf') => {
    if (!mapContainerRef.current) return;
    try {
      const node = mapContainerRef.current;
      const dataUrl = format === 'jpeg' 
        ? await htmlToImage.toJpeg(node, { quality: 0.95 })
        : await htmlToImage.toPng(node);
        
      if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'landscape' });
        const props = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${community?.id || 'community'}_map.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${community?.id || 'community'}_map.${format}`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      alert('Export failed. Make sure all map tiles are loaded.');
    }
  };

  const areaStats = useMemo(() => {
    if (!boundaryGeoJSON) return null;
    try {
      const areaSqMeters = turf.area(boundaryGeoJSON);
      
      // turf.length calculates the length of a GeoJSON Feature
      // For a Polygon, it represents the perimeter in kilometers by default.
      const perimeterKm = turf.length(boundaryGeoJSON, {units: 'kilometers'});

      return {
        sqMeters: areaSqMeters.toFixed(2),
        hectares: (areaSqMeters / 10000).toFixed(2),
        sqKm: (areaSqMeters / 1000000).toFixed(4),
        perimeterKm: perimeterKm.toFixed(2)
      };
    } catch (e) {
      return null;
    }
  }, [boundaryGeoJSON]);

  const defaultCenter: [number, number] = (community.latitude && community.longitude) 
    ? [community.latitude, community.longitude] 
    : [7.9465, -1.0232];

  return (
    <div className="flex flex-col h-full relative" ref={mapContainerRef}>
      {/* Map Control Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow p-2 flex gap-2">
        <button onClick={() => handleExport('png')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded flex items-center gap-1"><Download size={14} /> PNG</button>
        <button onClick={() => handleExport('jpeg')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded flex items-center gap-1"><Download size={14} /> JPEG</button>
        <button onClick={() => handleExport('pdf')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded flex items-center gap-1"><Download size={14} /> PDF</button>
        {editModeEnabled && onSaveBoundary && (
          <button 
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSaveBoundary(boundaryGeoJSON);
              } finally {
                setSaving(false);
              }
            }} 
            className="px-3 py-1.5 bg-cfss-green text-white hover:bg-green-800 text-xs font-semibold rounded flex items-center gap-1"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Boundary'}
          </button>
        )}
      </div>

      {isLocating && (
        <div className="absolute inset-0 bg-white/50 z-[2000] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm font-medium text-gray-700">Obtaining current location...</div>
        </div>
      )}

      {locationError && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[1000] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded shadow text-sm flex items-center">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="ml-2 font-bold text-amber-900">&times;</button>
        </div>
      )}

      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={() => locateUser(false)}
          disabled={isLocating}
          className="bg-white p-3 rounded-full shadow-lg border border-gray-200 text-gray-700 hover:text-blue-600 transition-colors"
          title="My Location"
        >
          <Navigation size={20} />
        </button>
      </div>

      <MapContainer 
        center={defaultCenter} 
        zoom={15} 
        className="flex-1 w-full z-0"
        ref={setMapRef}
        preferCanvas={true}
      >
        <MapInteractions onMapClick={(latlng) => setSelectedLocation(latlng)} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <FeatureGroup ref={featureGroupRef}>
          <GeomanSetup 
            featureGroupRef={featureGroupRef} 
            onShapeChange={setBoundaryGeoJSON} 
            initialGeoJSON={community.spatial_metadata}
            editModeEnabled={editModeEnabled}
          />
        </FeatureGroup>

        {community.latitude && community.longitude && !boundaryGeoJSON && (
          <Marker position={[community.latitude, community.longitude]} opacity={0.6}>
            <Popup>
              <div className="font-bold">{community.name}</div>
              <div className="text-xs">Community Assignment Center</div>
            </Popup>
          </Marker>
        )}

        {currentLocation && (
          <Marker position={currentLocation} icon={myLocationIcon}>
            <Popup>My Location</Popup>
          </Marker>
        )}

        {selectedLocation && (
          <Marker position={selectedLocation} icon={selectedLocationIcon}>
            <Popup>Selected Location: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</Popup>
          </Marker>
        )}

        {visibleFeatures.map(feature => {
          const associatedSurvey = getAssociatedSurvey(feature.id);
          const icon = createFeatureIcon(feature.feature_type, !!associatedSurvey);
          return (
            <Marker key={feature.id} position={[feature.latitude, feature.longitude]} icon={icon}>
              <Popup>
                <div className="text-sm font-bold capitalize">{feature.feature_type.toLowerCase()} Feature</div>
                {associatedSurvey ? (
                  <div className="text-xs mt-1">Survey: {associatedSurvey.entity_id}</div>
                ) : (
                  <div className="text-xs mt-1 text-amber-600">Pending survey</div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-lg shadow text-xs pointer-events-none">
        <div className="font-bold mb-2 text-gray-900">Legend - {community.name}</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#093C22]"></div> <span className="text-gray-900">Household</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2563eb]"></div> <span className="text-gray-900">Education</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#dc2626]"></div> <span className="text-gray-900">Health</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-[#3388ff] bg-[#3388ff]/20"></div> <span className="text-gray-900">Community Boundary</span></div>
        </div>
        {areaStats && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="font-semibold text-gray-700">Area: {areaStats.hectares} ha ({areaStats.sqKm} km²)</div>
              <div className="font-semibold text-gray-700">Perimeter: {areaStats.perimeterKm} km</div>
            <div className="text-[9px] text-gray-400 mt-0.5 leading-tight max-w-[150px]">
              * Estimate based on drawn boundary. Not a legal cadastral survey.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
