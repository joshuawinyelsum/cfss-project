"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  MapPin,
  Building2,
  Navigation,
  ExternalLink
} from 'lucide-react';

// Marker icon fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Category color pins for facility markers
function createCustomPin(color: string, label: string) {
  return L.divIcon({
    className: 'custom-facility-pin',
    html: `
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
        ${label.slice(0, 1).toUpperCase()}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function getCategoryColor(category?: string | null): { color: string; label: string } {
  const cat = (category || '').toLowerCase();
  if (cat.includes('health') || cat.includes('clinic') || cat.includes('hospital')) return { color: '#ef4444', label: 'H' };
  if (cat.includes('school') || cat.includes('education')) return { color: '#3b82f6', label: 'E' };
  if (cat.includes('water') || cat.includes('borehole') || cat.includes('well')) return { color: '#06b6d4', label: 'W' };
  if (cat.includes('sanitation') || cat.includes('waste') || cat.includes('toilet')) return { color: '#f59e0b', label: 'S' };
  if (cat.includes('gov') || cat.includes('chief') || cat.includes('office')) return { color: '#8b5cf6', label: 'G' };
  return { color: '#10b981', label: 'F' };
}

// Controller to smoothly fit map bounds to the active community polygon or coordinates
function MapBoundsController({
  boundaryCoords,
  fallbackCenter
}: {
  boundaryCoords: [number, number][] | null;
  fallbackCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (boundaryCoords && boundaryCoords.length > 2) {
      try {
        const bounds = L.latLngBounds(boundaryCoords.map(c => [c[0], c[1]]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
      } catch {
        map.setView(fallbackCenter, 14);
      }
    } else {
      map.setView(fallbackCenter, 14);
    }
  }, [boundaryCoords, fallbackCenter, map]);

  return null;
}

interface CoordinatorReadOnlyMapProps {
  community: {
    id: number;
    name: string;
    district: string;
    region: string;
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
    attributes?: any | null;
  }>;
}

export default function CoordinatorReadOnlyMap({ community, features }: CoordinatorReadOnlyMapProps) {
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');

  // Parse boundary polygon if present
  let polygonCoords: [number, number][] | null = null;
  if (community.spatial_metadata) {
    const geom = community.spatial_metadata.geometry || community.spatial_metadata;
    if (geom && geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
      // GeoJSON is [lon, lat], Leaflet is [lat, lon]
      polygonCoords = geom.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
    }
  }

  // Fallback center: community latitude/longitude or polygon centroid or central Ghana
  const centerLat = community.latitude || (polygonCoords ? polygonCoords[0][0] : 7.9465);
  const centerLng = community.longitude || (polygonCoords ? polygonCoords[0][1] : -1.0232);
  const center: [number, number] = [centerLat, centerLng];

  // Partition features into points (facilities) and lines (roads)
  const facilityPoints = features.filter(f => f.feature_type !== 'ROAD' && f.latitude != null && f.longitude != null);
  const roadLines = features.filter(f => f.feature_type === 'ROAD' && f.geometry?.coordinates);

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden border border-border-strong shadow-md">
      {/* Map Layer Switcher Floating Pill */}
      <div className="absolute top-4 right-4 z-400 bg-surface/90 backdrop-blur-md border border-border-strong rounded-xl p-1 flex items-center shadow-lg">
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mapType === 'satellite' ? 'bg-emerald-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
          }`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={() => setMapType('streets')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mapType === 'streets' ? 'bg-emerald-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
          }`}
        >
          Street Map
        </button>
      </div>

      {/* Legend Card */}
      <div className="absolute bottom-4 left-4 z-400 bg-surface/90 backdrop-blur-md border border-border-strong rounded-xl p-3 shadow-lg text-xs space-y-1.5 max-w-xs">
        <div className="font-bold text-primary flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{community.name} GIS Overview</span>
        </div>
        <div className="text-[11px] text-secondary">
          {polygonCoords ? 'Boundary polygon rendered in emerald' : 'Boundary polygon not yet mapped'}
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border-subtle text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Health
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Education
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Water
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Sanitation
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Governance
          </span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Base Tile Layer */}
        {mapType === 'satellite' ? (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        <MapBoundsController boundaryCoords={polygonCoords} fallbackCenter={center} />

        {/* Community Boundary Polygon */}
        {polygonCoords && (
          <Polygon
            positions={polygonCoords}
            pathOptions={{
              color: '#059669',
              weight: 3,
              fillColor: '#10b981',
              fillOpacity: 0.15,
              dashArray: '4, 4'
            }}
          >
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-emerald-800">{community.name} Boundary</div>
                <div className="text-gray-600 mt-0.5">{community.district}, {community.region}</div>
                {community.spatial_metadata?.properties?.area_sqm && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    Area: {(community.spatial_metadata.properties.area_sqm / 10000).toFixed(2)} ha
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Road Polylines */}
        {roadLines.map(road => {
          const coords = road.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          return (
            <Polyline
              key={road.id}
              positions={coords}
              pathOptions={{
                color: '#f97316',
                weight: 4,
                opacity: 0.8
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-orange-800">{road.name || 'Mapped Road'}</div>
                  <div className="text-gray-600 text-[11px] mt-0.5">Category: {road.category || 'Access Route'}</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Surveyed Facility Markers */}
        {facilityPoints.map(f => {
          const { color, label } = getCategoryColor(f.category);
          const icon = createCustomPin(color, label);
          return (
            <Marker
              key={f.id}
              position={[f.latitude!, f.longitude!]}
              icon={icon}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1">
                  <div className="font-bold text-gray-900">{f.name || 'Surveyed Facility'}</div>
                  <div className="text-gray-600 text-[11px]">
                    Category: <strong className="text-gray-800">{f.category || f.feature_type}</strong>
                  </div>
                  <div className="text-gray-500 font-mono text-[10px]">
                    {f.latitude!.toFixed(6)}, {f.longitude!.toFixed(6)}
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

