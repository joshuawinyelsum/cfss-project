"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
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
import {
  Navigation,
  Save,
  Download,
  Printer,
  Maximize2,
  Compass,
  X,
  AlertTriangle,
  Route,
  MapPin,
  Layers,
  Trash2,
  Edit3,
  Plus,
  Check,
  Undo2,
  Redo2,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

// Fix for default Leaflet icon in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

export const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Configure marker prototype icon
if (typeof window !== 'undefined' && L && L.Marker) {
  L.Marker.prototype.options.icon = defaultIcon;
}

// Safeguard Leaflet DomUtil methods against undefined elements during unmount / teardown
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalRemoveClass = L.DomUtil.removeClass;
  L.DomUtil.removeClass = function(el: HTMLElement | null | undefined, name: string) {
    if (!el || !el.classList) return;
    return originalRemoveClass.call(this, el, name);
  };
  const originalAddClass = L.DomUtil.addClass;
  L.DomUtil.addClass = function(el: HTMLElement | null | undefined, name: string) {
    if (!el || !el.classList) return;
    return originalAddClass.call(this, el, name);
  };
  const originalHasClass = L.DomUtil.hasClass;
  L.DomUtil.hasClass = function(el: HTMLElement | null | undefined, name: string) {
    if (!el || !el.classList) return false;
    return originalHasClass.call(this, el, name);
  };
}

export type MapStyle = 'streets' | 'satellite' | 'hybrid' | 'terrain' | 'b_w';

// Road categories and styling
export const ROAD_CATEGORIES = [
  { id: 'MAJOR_ROAD', label: 'Major Road', description: 'Highway / Inter-settlement link', color: '#ea580c', weight: 4.5, dashArray: undefined },
  { id: 'LOCAL_ROAD', label: 'Local Road', description: 'Main settlement street', color: '#2563eb', weight: 3.5, dashArray: undefined },
  { id: 'ACCESS_ROAD', label: 'Access Road', description: 'Compound / facility access', color: '#059669', weight: 3, dashArray: '6, 4' },
  { id: 'FOOTPATH', label: 'Footpath / Trail', description: 'Pedestrian walking route', color: '#d97706', weight: 2.5, dashArray: '3, 4' },
  { id: 'OTHER', label: 'Other Route', description: 'Locally identified path', color: '#7c3aed', weight: 3, dashArray: '5, 5' }
] as const;

export const getRoadVisuals = (category: string, isBW?: boolean) => {
  const found = ROAD_CATEGORIES.find(c => c.id === category?.toUpperCase()) || ROAD_CATEGORIES[1];
  if (isBW) {
    if (found.id === 'MAJOR_ROAD') return { ...found, color: '#000000', weight: 4.5, dashArray: undefined };
    if (found.id === 'LOCAL_ROAD') return { ...found, color: '#27272a', weight: 3.5, dashArray: undefined };
    if (found.id === 'ACCESS_ROAD') return { ...found, color: '#52525b', weight: 3, dashArray: '6, 4' };
    if (found.id === 'FOOTPATH') return { ...found, color: '#71717a', weight: 2.5, dashArray: '3, 4' };
    return { ...found, color: '#52525b', weight: 2.5, dashArray: '5, 5' };
  }
  return found;
};

// Accessible Feature Symbology with embedded SVG icons
export const getFeatureVisuals = (type: string) => {
  const norm = (type || '').toUpperCase();
  if (norm.includes('HEALTH') || norm.includes('HOSPITAL') || norm.includes('CLINIC') || norm.includes('DISPENSARY')) {
    return {
      color: '#dc2626',
      label: 'Health / Clinic / Hospital',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>`
    };
  }
  if (norm.includes('EDUCATION') || norm.includes('SCHOOL') || norm.includes('COLLEGE') || norm.includes('ACADEMY')) {
    return {
      color: '#1d4ed8',
      label: 'Education Facility',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
    };
  }
  if (norm.includes('GOVERNANCE') || norm.includes('PALACE') || norm.includes('CHIEF') || norm.includes('CIVIC') || norm.includes('ADMIN')) {
    return {
      color: '#7e22ce',
      label: 'Governance / Palace',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`
    };
  }
  if (norm.includes('HOUSEHOLD') || norm.includes('RESIDENCE') || norm.includes('HOME')) {
    return {
      color: '#093C22',
      label: 'Household',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
    };
  }
  if (norm.includes('CHURCH') || norm.includes('MOSQUE') || norm.includes('RELIGIOUS') || norm.includes('WORSHIP')) {
    return {
      color: '#d97706',
      label: 'Place of Worship',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H7M18 10H6"/></svg>`
    };
  }
  if (norm.includes('WATER') || norm.includes('BOREHOLE') || norm.includes('WELL')) {
    return {
      color: '#0284c7',
      label: 'Water Point',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`
    };
  }
  if (norm.includes('ROAD') || norm.includes('PATH') || norm.includes('TRACK')) {
    return {
      color: '#ea580c',
      label: 'Road / Path',
      iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`
    };
  }
  return {
    color: '#475569',
    label: 'Field Landmark',
    iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
  };
};

const createFeatureIcon = (type: string, isSubmitted: boolean, isBW?: boolean) => {
  const { color, iconSvg } = getFeatureVisuals(type);
  const opacity = isSubmitted ? '1' : '0.85';
  const border = isBW ? '2px solid #ffffff' : (isSubmitted ? '2px solid #ffffff' : '2px dashed #fef08a');
  const bgColor = isBW ? '#000000' : color;
  const shadow = isBW ? '0 0 0 1.5px #000000, 0 3px 8px rgba(0,0,0,0.5)' : '0 3px 8px rgba(0,0,0,0.4)';

  return L.divIcon({
    className: 'custom-feature-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 26px;
        height: 26px;
        border-radius: 8px;
        border: ${border};
        box-shadow: ${shadow};
        opacity: ${opacity};
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-13px, -13px);
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

const myLocationIcon = L.divIcon({
  className: 'my-location-icon',
  html: `<div style="
    background-color: #3b82f6;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4), 0 3px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const selectedLocationIcon = L.divIcon({
  className: 'selected-location-icon',
  html: `<div style="
    background-color: #ef4444;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapScaleControl() {
  const map = useMap();
  useEffect(() => {
    let scale: L.Control.Scale | null = null;
    try {
      scale = L.control.scale({ imperial: false, metric: true, position: 'bottomleft' });
      scale.addTo(map);
    } catch {
      // ignore
    }
    return () => {
      try {
        if (scale && map) {
          scale.remove();
        }
      } catch {
        // Safe cleanup during React 19 unmount
      }
    };
  }, [map]);
  return null;
}

function MapInstanceBridge({ onMapReady }: { onMapReady: (map: L.Map | null) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    return () => {
      onMapReady(null);
    };
  }, [map, onMapReady]);
  return null;
}

function MapInteractions({
  onMapClick,
  onMouseMove
}: {
  onMapClick: (latlng: L.LatLng) => void;
  onMouseMove?: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
    mousemove(e) {
      if (onMouseMove) {
        onMouseMove(e.latlng);
      }
    }
  });
  return null;
}

export interface SelectedFeatureInfo {
  id: string; // 'boundary' or feature.id
  type: 'BOUNDARY' | 'ROAD' | 'FEATURE';
  title: string;
  category?: string;
  geojson?: GeoJSON.Feature | GeoJSON.GeoJsonObject | null;
  lengthKm?: string;
  lengthMeters?: number;
  vertexCount?: number;
  notes?: string;
  surveyId?: string;
  accuracy?: string;
  coordinates?: string;
}

interface StudentMapProps {
  community: LocalCommunity;
  features: LocalFeature[];
  filterType: string;
  surveys: LocalSurvey[];
  onSaveBoundary?: (geojson: GeoJSON.Feature | GeoJSON.GeoJsonObject | null) => Promise<void>;
  onSaveRoad?: (roadGeoJSON: GeoJSON.Feature) => Promise<void>;
  onDeleteFeature?: (featureId: string) => Promise<void>;
  editModeEnabled?: boolean;
  onSetLocationClick?: () => void;
  onMetricsChange?: (metrics: { areaHa: string; areaKm2: string; perimeterKm: string; centroid: [number, number] | null }) => void;
}

export default function StudentMap({
  community,
  features,
  filterType,
  surveys,
  onSaveBoundary,
  onSaveRoad,
  onDeleteFeature,
  editModeEnabled = false,
  onSetLocationClick,
  onMetricsChange
}: StudentMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [currentLocation, setCurrentLocation] = useState<L.LatLng | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Active Tool Mode
  type ToolMode = 'INSPECT' | 'BOUNDARY' | 'ROADS' | 'FILTER';
  const [activeMode, setActiveMode] = useState<ToolMode>(editModeEnabled ? 'BOUNDARY' : 'INSPECT');

  // Community Boundary State
  const initialBoundary = useMemo(() => {
    return (community.spatial_metadata as unknown as GeoJSON.Feature | GeoJSON.GeoJsonObject) || null;
  }, [community.spatial_metadata]);

  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<GeoJSON.Feature | GeoJSON.GeoJsonObject | null>(initialBoundary);
  const savedBoundaryBackup = useRef<GeoJSON.Feature | GeoJSON.GeoJsonObject | null>(initialBoundary);
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [isEditingBoundary, setIsEditingBoundary] = useState(false);
  const [boundaryValidationError, setBoundaryValidationError] = useState<string | null>(null);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [hasUnsavedBoundary, setHasUnsavedBoundary] = useState(false);

  // Road Drawing State
  const [selectedRoadCategory, setSelectedRoadCategory] = useState<string>('LOCAL_ROAD');
  const [isDrawingRoad, setIsDrawingRoad] = useState(false);
  const [pendingRoadGeoJSON, setPendingRoadGeoJSON] = useState<GeoJSON.Feature | null>(null);
  const [roadModalOpen, setRoadModalOpen] = useState(false);
  const [roadName, setRoadName] = useState('');
  const [roadNotes, setRoadNotes] = useState('');
  const [savingRoad, setSavingRoad] = useState(false);

  // Natural Drawing Vertices & Live Preview Engine
  const [drawingVertices, setDrawingVertices] = useState<[number, number][]>([]);
  const [redoVertices, setRedoVertices] = useState<[number, number][]>([]);
  const [hoverLatLng, setHoverLatLng] = useState<[number, number] | null>(null);

  // Selected Feature & Detailed Measurement State
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeatureInfo | null>(null);

  // Road Editing State (Interactive Draggable Vertices)
  const [isEditingRoad, setIsEditingRoad] = useState(false);
  const [editingRoadId, setEditingRoadId] = useState<string | null>(null);
  const [editingRoadVertices, setEditingRoadVertices] = useState<[number, number][]>([]);
  const savedRoadBackup = useRef<[number, number][] | null>(null);

  // True Community Export Preview State
  const [exportPreviewDataUrl, setExportPreviewDataUrl] = useState<string | null>(null);
  const [exportInteriorStats, setExportInteriorStats] = useState<{
    featuresCount: number;
    roadsCount: number;
    features: LocalFeature[];
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  // UI state
  const [showLegend, setShowLegend] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const boundaryLayersInit = useRef(false);

  const handleMapReady = useCallback((map: L.Map | null) => {
    mapInstanceRef.current = map;
    setMapReady(Boolean(map));
  }, []);

  // Update backup when community boundary prop changes
  useEffect(() => {
    savedBoundaryBackup.current = initialBoundary;
    setBoundaryGeoJSON(initialBoundary);
  }, [initialBoundary]);

  // Sync editModeEnabled from parent prop if provided
  useEffect(() => {
    if (editModeEnabled) {
      setActiveMode('BOUNDARY');
    }
  }, [editModeEnabled]);

  const visibleFeatures = useMemo(() => {
    return features.filter(f =>
      filterType === 'ALL' || f.feature_type === filterType
    );
  }, [features, filterType]);

  const roadFeatures = useMemo(() => {
    return features.filter(f => f.feature_type === 'ROAD');
  }, [features]);

  const getAssociatedSurvey = (featureId: string) => {
    return surveys.find(s => s.status !== 'DELETED' && s.field_feature_id === featureId);
  };

  // Locate User GPS
  const locateUser = useCallback((zoom = true) => {
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = new L.LatLng(latitude, longitude);
        setCurrentLocation(latlng);
        setIsLocating(false);
        if (zoom && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(latlng, 16, { duration: 1 });
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(`Location acquisition failed: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }, []);

  // Fit Bounds
  const handleFitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (featureGroupRef.current && featureGroupRef.current.getLayers().length > 0) {
      map.fitBounds(featureGroupRef.current.getBounds(), { padding: [40, 40] });
    } else if (community.latitude && community.longitude) {
      map.setView([community.latitude, community.longitude], 15);
    }
  }, [community.latitude, community.longitude]);

  // Geometry Validation using Turf
  const validatePolygon = useCallback((geojson: GeoJSON.Feature | GeoJSON.GeoJsonObject | null): { isValid: boolean; error?: string } => {
    if (!geojson) return { isValid: true };
    try {
      const kinks = turf.kinks(geojson as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | GeoJSON.Polygon | GeoJSON.MultiPolygon);
      if (kinks.features && kinks.features.length > 0) {
        return {
          isValid: false,
          error: `Boundary has self-intersections at ${kinks.features.length} point(s). Please drag vertices to form a simple polygon without crossing edges.`
        };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid polygon geometry format.' };
    }
  }, []);

  // Update GeoJSON from FeatureGroup layers
  const extractGeoJSONFromLayers = useCallback(() => {
    if (!featureGroupRef.current) return null;
    const layers = featureGroupRef.current.getLayers();
    const polygonLayers = layers.filter((l): l is L.Polygon => l instanceof L.Polygon);

    if (polygonLayers.length === 0) {
      return null;
    }

    if (polygonLayers.length === 1) {
      return polygonLayers[0].toGeoJSON();
    } else {
      const multiCoords = polygonLayers.map((l) => {
        const g = l.toGeoJSON();
        return g.geometry.coordinates;
      });

      return {
        type: "Feature" as const,
        properties: {
          area_type: "MULTI_POLYGON_COMMUNITY",
          provenance: "MANUALLY_MAPPED"
        },
        geometry: {
          type: "MultiPolygon" as const,
          coordinates: multiCoords
        }
      };
    }
  }, []);

  // Render Boundary into FeatureGroup with click selection and style synchronization
  const renderBoundaryToGroup = useCallback((geojson: GeoJSON.Feature | GeoJSON.GeoJsonObject | null) => {
    if (!featureGroupRef.current) return;
    featureGroupRef.current.clearLayers();
    if (!geojson) return;
    const isBW = mapStyle === 'b_w';
    const isSelected = selectedFeature?.id === 'boundary';
    try {
      const layer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: {
          color: isBW ? '#000000' : (isSelected ? '#047857' : '#093C22'),
          weight: isSelected ? 4 : 3,
          opacity: 0.95,
          fillColor: isBW ? '#000000' : '#093C22',
          fillOpacity: isSelected ? 0.25 : (isBW ? 0.08 : 0.15),
          dashArray: isBW ? '6, 4' : undefined
        }
      });
      layer.eachLayer((l) => {
        l.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedFeature({
            id: 'boundary',
            type: 'BOUNDARY',
            title: `${community.name} Boundary`,
            category: 'COMMUNITY_BOUNDARY',
            geojson: geojson
          });
        });
        featureGroupRef.current?.addLayer(l);
      });
    } catch (err) {
      console.warn("Failed to render boundary layer", err);
    }
  }, [community.name, mapStyle, selectedFeature?.id]);

  useEffect(() => {
    if (mapReady && !isEditingBoundary) {
      renderBoundaryToGroup(boundaryGeoJSON);
    }
  }, [mapReady, boundaryGeoJSON, isEditingBoundary, renderBoundaryToGroup]);

  // Geoman Programmatic Event Bindings for Vertex Editing Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove any default Geoman HTML toolbars if present
    try {
      if ((map as unknown as { pm?: { removeControls: () => void } }).pm) {
        (map as unknown as { pm: { removeControls: () => void } }).pm.removeControls();
      }
    } catch {
      // ignore
    }

    const handleEdit = () => {
      const updatedGeo = extractGeoJSONFromLayers();
      const validation = validatePolygon(updatedGeo);
      setBoundaryValidationError(validation.error || null);
      setBoundaryGeoJSON(updatedGeo);
      setHasUnsavedBoundary(true);
    };

    map.on('pm:edit', handleEdit);

    return () => {
      map.off('pm:edit', handleEdit);
      try {
        if ((map as unknown as { pm?: { disableDraw: () => void; disableGlobalEditMode: () => void } }).pm) {
          (map as unknown as { pm: { disableDraw: () => void; disableGlobalEditMode: () => void } }).pm.disableDraw();
          (map as unknown as { pm: { disableDraw: () => void; disableGlobalEditMode: () => void } }).pm.disableGlobalEditMode();
        }
      } catch {
        // ignore
      }
    };
  }, [extractGeoJSONFromLayers, validatePolygon]);

  // Real-time Area and Perimeter Calculations via Turf
  const areaStats = useMemo(() => {
    if (!boundaryGeoJSON) return null;
    const validation = validatePolygon(boundaryGeoJSON);
    if (!validation.isValid) return null;

    try {
      const areaSqMeters = turf.area(boundaryGeoJSON as turf.AllGeoJSON);
      const perimeterKm = turf.length(boundaryGeoJSON as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>, { units: 'kilometers' });
      const centroid = turf.centroid(boundaryGeoJSON as turf.AllGeoJSON);

      return {
        sqMeters: Math.round(areaSqMeters).toLocaleString(),
        hectares: (areaSqMeters / 10000).toFixed(2),
        sqKm: (areaSqMeters / 1000000).toFixed(3),
        perimeterKm: perimeterKm.toFixed(2),
        perimeterMeters: Math.round(perimeterKm * 1000).toLocaleString(),
        centroidLat: centroid.geometry.coordinates[1].toFixed(5),
        centroidLng: centroid.geometry.coordinates[0].toFixed(5)
      };
    } catch {
      return null;
    }
  }, [boundaryGeoJSON, validatePolygon]);

  // Notify parent of updated metrics after render — must NOT be inside useMemo
  useEffect(() => {
    if (!onMetricsChange) return;
    if (!areaStats) return;
    onMetricsChange({
      areaHa: areaStats.hectares,
      areaKm2: areaStats.sqKm,
      perimeterKm: areaStats.perimeterKm,
      centroid: [parseFloat(areaStats.centroidLat), parseFloat(areaStats.centroidLng)]
    });
  }, [areaStats, onMetricsChange]);

  // Geodesic Vertex Count for Selected Boundary
  const boundaryVertexCount = useMemo(() => {
    if (!boundaryGeoJSON) return 0;
    try {
      const coords = turf.coordAll(boundaryGeoJSON as any);
      return coords.length;
    } catch {
      return 0;
    }
  }, [boundaryGeoJSON]);

  // Live Geodesic Calculations for In-flight Drawing and Road Editing
  const liveDrawingMetrics = useMemo(() => {
    if (isDrawingBoundary && drawingVertices.length >= 3) {
      try {
        const ringCoords: [number, number][] = drawingVertices.map(v => [v[1], v[0]]);
        ringCoords.push([drawingVertices[0][1], drawingVertices[0][0]]);
        const poly = turf.polygon([ringCoords]);
        const areaM2 = turf.area(poly);
        const perimKm = turf.length(poly, { units: 'kilometers' });
        return {
          type: 'BOUNDARY' as const,
          ha: (areaM2 / 10000).toFixed(2),
          sqKm: (areaM2 / 1000000).toFixed(3),
          sqMeters: Math.round(areaM2).toLocaleString(),
          perimeterKm: perimKm.toFixed(2),
          perimeterMeters: Math.round(perimKm * 1000).toLocaleString(),
          vertexCount: drawingVertices.length
        };
      } catch {
        return null;
      }
    }
    if (isDrawingRoad && drawingVertices.length >= 2) {
      try {
        const lineCoords: [number, number][] = drawingVertices.map(v => [v[1], v[0]]);
        const line = turf.lineString(lineCoords);
        const lenKm = turf.length(line, { units: 'kilometers' });
        return {
          type: 'ROAD' as const,
          lenKm: lenKm.toFixed(2),
          lenMeters: Math.round(lenKm * 1000),
          vertexCount: drawingVertices.length
        };
      } catch {
        return null;
      }
    }
    if (isEditingRoad && editingRoadVertices.length >= 2) {
      try {
        const lineCoords: [number, number][] = editingRoadVertices.map(v => [v[1], v[0]]);
        const line = turf.lineString(lineCoords);
        const lenKm = turf.length(line, { units: 'kilometers' });
        return {
          type: 'ROAD' as const,
          lenKm: lenKm.toFixed(2),
          lenMeters: Math.round(lenKm * 1000),
          vertexCount: editingRoadVertices.length
        };
      } catch {
        return null;
      }
    }
    return null;
  }, [isDrawingBoundary, isDrawingRoad, isEditingRoad, drawingVertices, editingRoadVertices]);

  // Natural Drawing Actions: Undo, Redo, Cancel
  const handleUndo = useCallback(() => {
    if (drawingVertices.length === 0) return;
    const last = drawingVertices[drawingVertices.length - 1];
    setDrawingVertices(prev => prev.slice(0, -1));
    setRedoVertices(prev => [...prev, last]);
    setBoundaryValidationError(null);
  }, [drawingVertices]);

  const handleRedo = useCallback(() => {
    if (redoVertices.length === 0) return;
    const next = redoVertices[redoVertices.length - 1];
    setRedoVertices(prev => prev.slice(0, -1));
    setDrawingVertices(prev => [...prev, next]);
    setBoundaryValidationError(null);
  }, [redoVertices]);

  const handleCancelDrawing = useCallback(() => {
    setDrawingVertices([]);
    setRedoVertices([]);
    setHoverLatLng(null);
    setIsDrawingBoundary(false);
    setIsDrawingRoad(false);
    setBoundaryValidationError(null);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.doubleClickZoom.enable();
      } catch {
        // ignore
      }
    }
  }, []);

  // Start Drawing Boundary (Natural polygon, no proximity auto-closing, no silent snapping)
  const startDrawBoundary = useCallback(() => {
    setIsDrawingBoundary(true);
    setIsDrawingRoad(false);
    setDrawingVertices([]);
    setRedoVertices([]);
    setHoverLatLng(null);
    setBoundaryValidationError(null);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.doubleClickZoom.disable();
      } catch {
        // ignore
      }
    }
  }, []);

  // Finish Boundary Drawing (Explicit finish, >=3 vertices, turf self-intersection check, MultiPolygon support)
  const finishDrawBoundary = useCallback(() => {
    if (drawingVertices.length < 3) {
      setBoundaryValidationError("A boundary requires at least 3 distinct vertices to form a closed polygon.");
      return;
    }
    // GeoJSON Polygon coordinates are [lng, lat]
    const ringCoords: [number, number][] = drawingVertices.map(v => [v[1], v[0]]);
    // Close the ring with vertex 0
    ringCoords.push([drawingVertices[0][1], drawingVertices[0][0]]);

    const candidatePolygon = turf.polygon([ringCoords], {
      area_type: "COMMUNITY_BOUNDARY",
      provenance: "MANUALLY_MAPPED"
    });

    const kinks = turf.kinks(candidatePolygon);
    if (kinks.features && kinks.features.length > 0) {
      setBoundaryValidationError(`Boundary has self-intersections at ${kinks.features.length} point(s). Please undo or adjust vertices so edges do not cross.`);
      // CRITICAL: DO NOT DESTROY UNCOMMITTED VERTICES! User can press Undo to adjust.
      return;
    }

    let finalGeoJSON: GeoJSON.Feature;
    if (!boundaryGeoJSON) {
      finalGeoJSON = candidatePolygon;
    } else {
      const existingGeom = (boundaryGeoJSON as any).geometry;
      if (existingGeom && existingGeom.type === 'Polygon') {
        finalGeoJSON = turf.multiPolygon([existingGeom.coordinates, [ringCoords]], {
          area_type: "MULTI_POLYGON_COMMUNITY",
          provenance: "MANUALLY_MAPPED"
        });
      } else if (existingGeom && existingGeom.type === 'MultiPolygon') {
        finalGeoJSON = turf.multiPolygon([...existingGeom.coordinates, [ringCoords]], {
          area_type: "MULTI_POLYGON_COMMUNITY",
          provenance: "MANUALLY_MAPPED"
        });
      } else {
        finalGeoJSON = candidatePolygon;
      }
    }

    setBoundaryGeoJSON(finalGeoJSON);
    setHasUnsavedBoundary(true);
    setBoundaryValidationError(null);
    setDrawingVertices([]);
    setRedoVertices([]);
    setHoverLatLng(null);
    setIsDrawingBoundary(false);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.doubleClickZoom.enable();
      } catch {
        // ignore
      }
    }

    renderBoundaryToGroup(finalGeoJSON);
    setSelectedFeature({
      id: 'boundary',
      type: 'BOUNDARY',
      title: `${community.name} Boundary`,
      category: 'COMMUNITY_BOUNDARY',
      geojson: finalGeoJSON
    });
  }, [drawingVertices, boundaryGeoJSON, community.name, renderBoundaryToGroup]);

  // Enable Boundary Vertex Edit Mode (with Snapshot Backup)
  const startEditBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    savedBoundaryBackup.current = boundaryGeoJSON ? JSON.parse(JSON.stringify(boundaryGeoJSON)) : null;
    try {
      (map as unknown as { pm: { enableGlobalEditMode: (opts?: Record<string, unknown>) => void } }).pm.enableGlobalEditMode({
        snappable: true,
        snapDistance: 15
      });
      setIsEditingBoundary(true);
    } catch (e) {
      console.warn("Could not start vertex editing", e);
    }
  }, [boundaryGeoJSON]);

  // Stop Boundary Vertex Edit Mode (Commit vertex edits)
  const stopEditBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { disableGlobalEditMode: () => void } }).pm.disableGlobalEditMode();
      setIsEditingBoundary(false);
      const updated = extractGeoJSONFromLayers();
      const validation = validatePolygon(updated);
      setBoundaryValidationError(validation.error || null);
      setBoundaryGeoJSON(updated);
      setHasUnsavedBoundary(true);
      renderBoundaryToGroup(updated);
      setSelectedFeature(prev => prev && prev.id === 'boundary' ? { ...prev, geojson: updated } : prev);
    } catch (e) {
      console.warn("Could not stop vertex editing", e);
    }
  }, [extractGeoJSONFromLayers, validatePolygon, renderBoundaryToGroup]);

  // Cancel Boundary Edits (Restore Original Backup Snapshot)
  const cancelEditBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { disableGlobalEditMode: () => void } }).pm.disableGlobalEditMode();
      setIsEditingBoundary(false);
      renderBoundaryToGroup(savedBoundaryBackup.current);
      setBoundaryGeoJSON(savedBoundaryBackup.current);
      setHasUnsavedBoundary(false);
      setBoundaryValidationError(null);
      setSelectedFeature(prev => prev && prev.id === 'boundary' ? { ...prev, geojson: savedBoundaryBackup.current } : prev);
    } catch {
      // ignore
    }
  }, [renderBoundaryToGroup]);

  // Clear / Delete Boundary
  const handleClearBoundary = useCallback(async () => {
    if (!confirm('Are you sure you want to delete the community boundary? This will reset the territorial coverage for this community.')) {
      return;
    }
    featureGroupRef.current?.clearLayers();
    setBoundaryGeoJSON(null);
    setHasUnsavedBoundary(true);
    setBoundaryValidationError(null);
    if (selectedFeature?.id === 'boundary') {
      setSelectedFeature(null);
    }
    if (onSaveBoundary) {
      await onSaveBoundary(null);
    }
  }, [onSaveBoundary, selectedFeature?.id]);

  // Road Selection Handler
  const handleSelectRoad = useCallback((rf: LocalFeature) => {
    const meta = rf.metadata_json as Record<string, unknown> | null;
    const featureData = rf.metadata_json as unknown as GeoJSON.Feature<GeoJSON.LineString> | null;
    const coords = featureData?.geometry?.coordinates || [];
    const category = String(meta?.category || 'LOCAL_ROAD');
    const visuals = getRoadVisuals(category, mapStyle === 'b_w');
    const roadTitle = String(meta?.label || visuals.label);

    setSelectedFeature({
      id: rf.id,
      type: 'ROAD',
      title: roadTitle,
      category: visuals.label,
      lengthKm: meta?.length_km ? String(meta.length_km) : undefined,
      lengthMeters: meta?.length_meters ? Number(meta.length_meters) : undefined,
      vertexCount: Array.isArray(coords) ? coords.length : undefined,
      notes: meta?.notes ? String(meta.notes) : undefined,
      geojson: featureData
    });
  }, [mapStyle]);

  // Start Interactive Road Vertex Editing
  const startEditRoad = useCallback((roadId: string) => {
    const target = roadFeatures.find(r => r.id === roadId);
    if (!target) return;
    const feat = target.metadata_json as unknown as GeoJSON.Feature<GeoJSON.LineString>;
    const coords = feat?.geometry?.coordinates;
    if (!coords || !Array.isArray(coords)) return;
    const latLngs: [number, number][] = coords.map(c => [c[1], c[0]]);
    setEditingRoadId(roadId);
    setEditingRoadVertices(latLngs);
    savedRoadBackup.current = JSON.parse(JSON.stringify(latLngs));
    setIsEditingRoad(true);
  }, [roadFeatures]);

  // Cancel Road Vertex Editing
  const cancelEditRoad = useCallback(() => {
    setIsEditingRoad(false);
    setEditingRoadId(null);
    setEditingRoadVertices([]);
    savedRoadBackup.current = null;
  }, []);

  // Save Road Vertex Editing
  const saveEditRoad = useCallback(async () => {
    if (!editingRoadId || editingRoadVertices.length < 2 || !onSaveRoad) return;
    const orig = roadFeatures.find(r => r.id === editingRoadId);
    if (!orig) return;
    const lineCoords: [number, number][] = editingRoadVertices.map(v => [v[1], v[0]]);
    const lineGeo = turf.lineString(lineCoords);
    const lengthKm = turf.length(lineGeo, { units: 'kilometers' });
    const origMeta = (orig.metadata_json as Record<string, unknown>) || {};
    const updatedRoad: GeoJSON.Feature = {
      type: 'Feature',
      id: editingRoadId,
      geometry: {
        type: 'LineString',
        coordinates: lineCoords
      },
      properties: {
        ...origMeta,
        length_km: `${lengthKm.toFixed(2)} km`,
        length_meters: Math.round(lengthKm * 1000)
      }
    };
    await onSaveRoad(updatedRoad);
    setIsEditingRoad(false);
    setEditingRoadId(null);
    setEditingRoadVertices([]);
    savedRoadBackup.current = null;
    setSelectedFeature(prev => prev && prev.id === editingRoadId ? {
      ...prev,
      lengthKm: `${lengthKm.toFixed(2)} km`,
      lengthMeters: Math.round(lengthKm * 1000),
      vertexCount: editingRoadVertices.length,
      geojson: updatedRoad
    } : prev);
  }, [editingRoadId, editingRoadVertices, onSaveRoad, roadFeatures]);

  // Delete Individual Road Feature with Confirmation
  const handleDeleteRoad = useCallback(async (roadId: string) => {
    if (!confirm('Are you sure you want to delete this mapped road feature?')) return;
    if (onDeleteFeature) {
      await onDeleteFeature(roadId);
    }
    if (selectedFeature?.id === roadId) {
      setSelectedFeature(null);
    }
    if (editingRoadId === roadId) {
      setIsEditingRoad(false);
      setEditingRoadId(null);
      setEditingRoadVertices([]);
      savedRoadBackup.current = null;
    }
  }, [onDeleteFeature, selectedFeature?.id, editingRoadId]);

  // Clear All Drawn Features (Safeguarding Survey Points and Facilities)
  const handleClearAllDrawings = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all drawn boundaries and routes? Survey locations and facility markers will NOT be deleted.')) {
      return;
    }
    // 1. Delete boundary
    if (boundaryGeoJSON || (featureGroupRef.current && featureGroupRef.current.getLayers().length > 0)) {
      featureGroupRef.current?.clearLayers();
      setBoundaryGeoJSON(null);
      setHasUnsavedBoundary(true);
      if (onSaveBoundary) {
        await onSaveBoundary(null);
      }
    }
    // 2. Delete all roads
    if (onDeleteFeature) {
      for (const rf of roadFeatures) {
        try {
          await onDeleteFeature(rf.id);
        } catch (err) {
          console.warn('Failed to delete road:', err);
        }
      }
    }
    // 3. Reset states
    setSelectedFeature(null);
    setIsEditingRoad(false);
    setEditingRoadId(null);
    setEditingRoadVertices([]);
    savedRoadBackup.current = null;
    setIsEditingBoundary(false);
    setDrawingVertices([]);
  }, [boundaryGeoJSON, onSaveBoundary, onDeleteFeature, roadFeatures]);

  // Commit Boundary Save
  const handleSaveBoundaryClick = async () => {
    if (boundaryValidationError) {
      alert("Cannot save boundary: " + boundaryValidationError);
      return;
    }
    if (!onSaveBoundary) return;
    setSavingBoundary(true);
    try {
      await onSaveBoundary(boundaryGeoJSON);
      savedBoundaryBackup.current = boundaryGeoJSON;
      setHasUnsavedBoundary(false);
    } finally {
      setSavingBoundary(false);
    }
  };

  // Start Drawing Road / Pathway (Natural line, live preview, >=2 vertices)
  const startDrawRoad = useCallback(() => {
    setIsDrawingRoad(true);
    setIsDrawingBoundary(false);
    setDrawingVertices([]);
    setRedoVertices([]);
    setHoverLatLng(null);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.doubleClickZoom.disable();
      } catch {
        // ignore
      }
    }
  }, []);

  // Finish Road Drawing
  const finishDrawRoad = useCallback(() => {
    if (drawingVertices.length < 2) {
      alert("A road or pathway requires at least 2 vertices.");
      return;
    }
    const lineCoords: [number, number][] = drawingVertices.map(v => [v[1], v[0]]);
    const lineGeo = turf.lineString(lineCoords, {
      category: selectedRoadCategory,
      provenance: "MANUALLY_MAPPED"
    });
    setPendingRoadGeoJSON(lineGeo);
    setRoadModalOpen(true);
    setDrawingVertices([]);
    setRedoVertices([]);
    setHoverLatLng(null);
    setIsDrawingRoad(false);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.doubleClickZoom.enable();
      } catch {
        // ignore
      }
    }
  }, [drawingVertices, selectedRoadCategory]);

  // Keyboard Shortcuts (Ctrl+Z: Undo, Ctrl+Y: Redo, Esc: Cancel, Enter: Finish)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        if (isDrawingBoundary || isDrawingRoad) {
          handleUndo();
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        if (isDrawingBoundary || isDrawingRoad) {
          handleRedo();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isDrawingBoundary || isDrawingRoad) {
          handleCancelDrawing();
        } else if (isEditingBoundary) {
          cancelEditBoundary();
        }
      } else if (e.key === 'Enter') {
        if (isDrawingBoundary && drawingVertices.length >= 3) {
          e.preventDefault();
          finishDrawBoundary();
        } else if (isDrawingRoad && drawingVertices.length >= 2) {
          e.preventDefault();
          finishDrawRoad();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDrawingBoundary,
    isDrawingRoad,
    isEditingBoundary,
    drawingVertices.length,
    handleUndo,
    handleRedo,
    handleCancelDrawing,
    finishDrawBoundary,
    finishDrawRoad,
    cancelEditBoundary
  ]);

  // Save Road from Modal
  const handleSaveRoadSubmit = async () => {
    if (!pendingRoadGeoJSON || !onSaveRoad) return;
    setSavingRoad(true);
    try {
      const lengthKm = turf.length(pendingRoadGeoJSON as GeoJSON.Feature<GeoJSON.LineString>, { units: 'kilometers' });
      const roadData: GeoJSON.Feature = {
        ...pendingRoadGeoJSON,
        properties: {
          ...pendingRoadGeoJSON.properties,
          category: selectedRoadCategory,
          label: roadName.trim() || getRoadVisuals(selectedRoadCategory).label,
          notes: roadNotes.trim(),
          length_km: `${lengthKm.toFixed(2)} km`,
          length_meters: Math.round(lengthKm * 1000),
          provenance: 'MANUALLY_MAPPED'
        }
      };

      await onSaveRoad(roadData);
      setRoadModalOpen(false);
      setPendingRoadGeoJSON(null);
      setRoadName('');
      setRoadNotes('');
    } finally {
      setSavingRoad(false);
    }
  };

  // Clean Community Map Export: boundary and interior contents only, fitted with margin, clipped to polygon geometry
  const prepareBoundaryExport = useCallback(async (format: 'preview' | 'png' | 'pdf') => {
    const map = mapInstanceRef.current;
    const targetNode = map ? map.getContainer() : mapContainerRef.current;
    if (!targetNode || !map) return;
    setIsExporting(true);

    try {
      // 1. Calculate interior stats using Turf
      let interiorFeatures = visibleFeatures.filter(f => f.feature_type !== 'ROAD');
      let interiorRoads = roadFeatures;

      if (boundaryGeoJSON) {
        try {
          interiorFeatures = features.filter(f => {
            if (f.feature_type === 'ROAD') return false;
            try {
              const pt = turf.point([f.longitude, f.latitude]);
              return turf.booleanPointInPolygon(pt, boundaryGeoJSON as any);
            } catch {
              return true;
            }
          });
          interiorRoads = roadFeatures.filter(rf => {
            try {
              const geom = (rf.metadata_json as any)?.geometry;
              if (!geom) return false;
              const line = turf.lineString(geom.coordinates);
              return turf.booleanIntersects(line, boundaryGeoJSON as any);
            } catch {
              return true;
            }
          });
        } catch (e) {
          console.warn('Turf interior calculation fallback:', e);
        }
      }

      setExportInteriorStats({
        featuresCount: interiorFeatures.length,
        roadsCount: interiorRoads.length,
        features: interiorFeatures
      });

      // 2. Fit map bounds to community boundary if exists
      if (featureGroupRef.current && featureGroupRef.current.getLayers().length > 0) {
        const bounds = featureGroupRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], animate: false });
          await new Promise(r => setTimeout(r, 450));
        }
      }

      // 3. Render map container without floating docks or zoom controls
      const rawDataUrl = await htmlToImage.toPng(targetNode, {
        cacheBust: false,
        backgroundColor: '#ffffff',
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('leaflet-control-zoom')) return false;
            if (node.classList.contains('export-exclude')) return false;
          }
          return true;
        }
      });

      let finalDataUrl = rawDataUrl;

      // 4. Polygon canvas clipping if boundary exists
      if (boundaryGeoJSON) {
        try {
          const img = new Image();
          img.src = rawDataUrl;
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            const scaleX = img.width / targetNode.clientWidth;
            const scaleY = img.height / targetNode.clientHeight;

            const geom = (boundaryGeoJSON as any).geometry;
            const ringsList: [number, number][][][] = [];
            if (geom.type === 'Polygon') {
              ringsList.push(geom.coordinates);
            } else if (geom.type === 'MultiPolygon') {
              geom.coordinates.forEach((coords: [number, number][][]) => {
                ringsList.push(coords);
              });
            }

            ctx.save();
            ctx.beginPath();
            ringsList.forEach(rings => {
              rings.forEach(ring => {
                ring.forEach((c: [number, number], idx: number) => {
                  const pt = map.latLngToContainerPoint([c[1], c[0]]);
                  const px = pt.x * scaleX;
                  const py = pt.y * scaleY;
                  if (idx === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                });
                ctx.closePath();
              });
            });
            ctx.clip();
            ctx.drawImage(img, 0, 0);
            ctx.restore();

            // Boundary outline stroke
            ctx.save();
            ctx.strokeStyle = mapStyle === 'b_w' ? '#000000' : '#093C22';
            ctx.lineWidth = 3 * scaleX;
            ctx.beginPath();
            ringsList.forEach(rings => {
              rings.forEach(ring => {
                ring.forEach((c: [number, number], idx: number) => {
                  const pt = map.latLngToContainerPoint([c[1], c[0]]);
                  const px = pt.x * scaleX;
                  const py = pt.y * scaleY;
                  if (idx === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                });
                ctx.closePath();
              });
            });
            ctx.stroke();
            ctx.restore();

            finalDataUrl = canvas.toDataURL('image/png');
          }
        } catch (clipErr) {
          console.warn('Canvas clipping fallback to raw capture:', clipErr);
        }
      }

      setExportPreviewDataUrl(finalDataUrl);

      const safeName = (community?.name || 'community').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
        const props = pdf.getImageProperties(finalDataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;

        pdf.setFontSize(14);
        pdf.setTextColor(9, 60, 34);
        pdf.text(`CFSS Community Fieldwork Map — ${community?.name || 'Community'}`, 14, 12);

        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Generated on ${new Date().toLocaleDateString()} | Area: ${areaStats?.hectares || 'N/A'} ha | Perimeter: ${areaStats?.perimeterKm || 'N/A'} km`, 14, 18);

        pdf.addImage(finalDataUrl, 'PNG', 10, 22, pdfWidth - 20, Math.min(pdfHeight, 175));
        pdf.save(`${safeName}_boundary_report.pdf`);
      } else if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${safeName}_boundary_map.png`;
        link.href = finalDataUrl;
        link.click();
      }
    } catch (err) {
      console.warn('Map export error:', err);
      alert('Map export completed with vector annotations. Ensure tiles have completed loading.');
    } finally {
      setIsExporting(false);
    }
  }, [visibleFeatures, roadFeatures, boundaryGeoJSON, features, mapStyle, community?.name, areaStats]);

  const handleExport = useCallback((format: 'png' | 'pdf') => {
    return prepareBoundaryExport(format);
  }, [prepareBoundaryExport]);

  const defaultCenter: [number, number] = (community.latitude && community.longitude)
    ? [community.latitude, community.longitude]
    : [7.9465, -1.0232];

  // Feature Counts for Summary
  const featureBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    features.forEach(f => {
      counts[f.feature_type] = (counts[f.feature_type] || 0) + 1;
    });
    return counts;
  }, [features]);

  return (
    <div className="flex flex-col h-full relative font-sans" ref={mapContainerRef}>

      {/* TOP LEFT: Map Style Switcher (Google / Apple Maps inspired, offset from Leaflet zoom controls) */}
      <div className="export-exclude absolute top-3 left-16 z-[1000] flex items-center bg-surface/95 backdrop-blur-md p-1 rounded-xl border border-border-strong shadow-md text-xs">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mapStyle === 'streets'
                ? 'bg-[#093C22] text-white shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-[#093C22] text-white shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('hybrid')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mapStyle === 'hybrid'
                ? 'bg-[#093C22] text-white shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            Hybrid
          </button>
          <button
            onClick={() => setMapStyle('terrain')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mapStyle === 'terrain'
                ? 'bg-[#093C22] text-white shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            Terrain
          </button>
          <button
            onClick={() => setMapStyle('b_w')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mapStyle === 'b_w'
                ? 'bg-[#093C22] text-white shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            B&W
          </button>
        </div>
      </div>

      {/* TOP CENTER / RIGHT: Unified Action Dock */}
      <div className="export-exclude absolute top-14 sm:top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        {/* Main Dock Header */}
        <div className="flex items-center gap-1.5 bg-surface/95 backdrop-blur-md p-1.5 rounded-xl border border-border-strong shadow-md text-xs">
          <button
            onClick={() => setActiveMode('INSPECT')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'INSPECT'
                ? 'bg-page text-primary border border-border shadow-2xs'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            <Info size={14} />
            <span className="hidden sm:inline">Inspect</span>
          </button>

          <button
            onClick={() => setActiveMode('BOUNDARY')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'BOUNDARY'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            <MapPin size={14} />
            <span>Boundary</span>
            {hasUnsavedBoundary && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />}
          </button>

          <button
            onClick={() => setActiveMode('ROADS')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'ROADS'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'text-secondary hover:text-primary hover:bg-page'
            }`}
          >
            <Route size={14} />
            <span>Roads & Paths</span>
          </button>

          {/* Quick PDF & Report Actions */}
          <div className="h-4 w-px bg-border mx-1" />

          <button
            onClick={async () => {
              setShowReportModal(true);
              await prepareBoundaryExport('preview');
            }}
            data-testid="report-map-btn"
            className="px-2.5 py-1 text-secondary hover:text-primary hover:bg-page rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            title="Official Report Map"
          >
            <Printer size={15} />
            <span>Report Map</span>
          </button>

          <button
            onClick={() => handleExport('png')}
            data-testid="export-png-btn"
            className="p-1.5 text-secondary hover:text-primary hover:bg-page rounded-lg transition-colors cursor-pointer"
            title="Download Clean Map (PNG)"
          >
            <Download size={15} />
          </button>
        </div>

        {/* SUB-TOOLBAR: Community Boundary Workflow */}
        {activeMode === 'BOUNDARY' && (
          <div className="bg-surface/95 backdrop-blur-md p-2.5 rounded-xl border border-border-strong shadow-lg max-w-sm sm:max-w-md w-full space-y-2 animate-in fade-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between font-bold text-primary">
              <span className="flex items-center gap-1.5 text-[#093C22]">
                <MapPin size={14} />
                <span>Community Territorial Boundary</span>
              </span>
              {areaStats && (
                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  {areaStats.hectares} ha ({areaStats.perimeterKm} km)
                </span>
              )}
            </div>

            {/* Validation Error Alert */}
            {boundaryValidationError && (
              <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-[11px] flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600" />
                <span>{boundaryValidationError}</span>
              </div>
            )}

            {/* In-progress Drawing Banner */}
            {isDrawingBoundary && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>Tracing Boundary Polygon</span>
                  <span className="font-mono bg-emerald-200/50 dark:bg-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    {drawingVertices.length} {drawingVertices.length === 1 ? 'vertex' : 'vertices'} placed
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Click on map to place boundary vertices (minimum 3). Click Undo or press Ctrl+Z to step back.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={drawingVertices.length === 0}
                      className="px-2 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Undo last vertex (Ctrl+Z)"
                    >
                      <Undo2 size={12} />
                      <span>Undo</span>
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoVertices.length === 0}
                      className="px-2 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Redo vertex (Ctrl+Y)"
                    >
                      <Redo2 size={12} />
                      <span>Redo</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCancelDrawing}
                      className="px-2.5 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer text-[11px]"
                      title="Discard current drawing (Esc)"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={finishDrawBoundary}
                      disabled={drawingVertices.length < 3}
                      className="px-3 py-1 bg-[#093C22] text-white rounded-lg font-semibold shadow-2xs cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Finish boundary polygon (Enter)"
                    >
                      <Check size={12} />
                      <span>Finish Boundary</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Editing Mode Banner */}
            {isEditingBoundary && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Vertex Edit Mode Active</span>
                  <span className="text-[10px] font-normal">Drag markers or click midpoints</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={cancelEditBoundary}
                    className="px-2.5 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Undo2 size={12} />
                    <span>Cancel Edits</span>
                  </button>
                  <button
                    onClick={stopEditBoundary}
                    className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} />
                    <span>Done Editing</span>
                  </button>
                </div>
              </div>
            )}

            {/* Regular Boundary Actions (When not drawing or editing) */}
            {!isDrawingBoundary && !isEditingBoundary && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {!boundaryGeoJSON ? (
                  <button
                    onClick={startDrawBoundary}
                    className="px-3 py-1.5 bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>Draw Boundary</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={startDrawBoundary}
                      className="px-2.5 py-1.5 bg-surface text-primary hover:bg-page border border-border-strong font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Add another zone for disconnected settlements"
                    >
                      <Plus size={13} />
                      <span>Add Zone</span>
                    </button>

                    <button
                      onClick={startEditBoundary}
                      className="px-2.5 py-1.5 bg-surface text-primary hover:bg-page border border-border-strong font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit3 size={13} />
                      <span>Edit Vertices</span>
                    </button>

                    <button
                      onClick={handleClearBoundary}
                      className="p-1.5 text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Boundary"
                    >
                      <Trash2 size={14} />
                    </button>

                    {hasUnsavedBoundary && onSaveBoundary && (
                      <button
                        disabled={savingBoundary || Boolean(boundaryValidationError)}
                        onClick={handleSaveBoundaryClick}
                        className="ml-auto px-3 py-1.5 bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <Save size={13} />
                        <span>{savingBoundary ? 'Saving...' : 'Save Boundary'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUB-TOOLBAR: Roads & Pathways Workflow */}
        {activeMode === 'ROADS' && (
          <div className="bg-surface/95 backdrop-blur-md p-2.5 rounded-xl border border-border-strong shadow-lg max-w-sm sm:max-w-md w-full space-y-2.5 animate-in fade-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between font-bold text-primary">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <Route size={14} />
                <span>Roads & Pathways Mapping</span>
              </span>
              <span className="text-[11px] text-muted font-normal">
                {roadFeatures.length} route{roadFeatures.length === 1 ? '' : 's'} mapped
              </span>
            </div>

            {/* Drawing Road Active Banner */}
            {isDrawingRoad ? (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>Tracing {getRoadVisuals(selectedRoadCategory).label}</span>
                  <span className="font-mono bg-amber-200/50 dark:bg-amber-800/40 px-2 py-0.5 rounded text-[10px]">
                    {drawingVertices.length} {drawingVertices.length === 1 ? 'vertex' : 'vertices'}
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Click along aerial imagery to place line vertices (minimum 2). Press Enter to finish.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={drawingVertices.length === 0}
                      className="px-2 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Undo last vertex (Ctrl+Z)"
                    >
                      <Undo2 size={12} />
                      <span>Undo</span>
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoVertices.length === 0}
                      className="px-2 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Redo vertex (Ctrl+Y)"
                    >
                      <Redo2 size={12} />
                      <span>Redo</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCancelDrawing}
                      className="px-2.5 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer text-[11px]"
                      title="Cancel route (Esc)"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={finishDrawRoad}
                      disabled={drawingVertices.length < 2}
                      className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold shadow-2xs cursor-pointer disabled:opacity-40 flex items-center gap-1 text-[11px]"
                      title="Finish route line (Enter)"
                    >
                      <Check size={12} />
                      <span>Finish Route</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-secondary mb-1">Route Classification</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ROAD_CATEGORIES.map(rc => (
                      <button
                        key={rc.id}
                        onClick={() => setSelectedRoadCategory(rc.id)}
                        className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedRoadCategory === rc.id
                            ? 'bg-page border-[#093C22] text-primary font-bold shadow-2xs'
                            : 'border-border text-secondary hover:bg-page'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rc.color }} />
                        <span className="truncate text-[11px]">{rc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={startDrawRoad}
                    className="px-3 py-1.5 bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>Draw Route Line</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OFFLINE TILE FALLBACK TOAST */}
      {tileError && (
        <div className="export-exclude absolute top-16 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-[900] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span>Offline Map Mode: Satellite and street tiles are cached or unavailable, but community boundaries and survey features remain fully operational.</span>
          </div>
          <button onClick={() => setTileError(false)} className="text-amber-900 font-bold ml-2 cursor-pointer">&times;</button>
        </div>
      )}

      {/* GPS LOCATING SPINNER */}
      {isLocating && (
        <div className="export-exclude absolute inset-0 bg-page/60 backdrop-blur-xs z-[2000] flex flex-col items-center justify-center text-xs font-semibold text-primary">
          <div className="w-7 h-7 border-2 border-[#093C22] border-t-transparent rounded-full animate-spin mb-2"></div>
          <div>Acquiring GPS fix...</div>
        </div>
      )}

      {/* LOCATION ERROR TOAST */}
      {locationError && (
        <div className="export-exclude absolute top-16 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="font-bold text-red-900 cursor-pointer">&times;</button>
        </div>
      )}

      {/* BOTTOM RIGHT FLOATING CONTROLS */}
      <div className="export-exclude absolute bottom-6 right-4 z-[990] flex flex-col items-end gap-2">
        <button
          onClick={handleFitBounds}
          className="bg-surface p-2.5 rounded-full shadow-lg border border-border-strong text-primary hover:bg-page transition-colors cursor-pointer"
          title="Fit to Community Bounds"
        >
          <Maximize2 size={16} />
        </button>

        <button
          onClick={() => locateUser(true)}
          disabled={isLocating}
          className="bg-surface p-2.5 rounded-full shadow-lg border border-border-strong text-primary hover:text-blue-600 hover:bg-page transition-colors cursor-pointer"
          title="Center My Location"
        >
          <Navigation size={16} />
        </button>
      </div>

      {/* BOTTOM LEFT: Live GIS Measurements, Selected Feature Details, & Collapsible Legend */}
      <div className="export-exclude absolute bottom-6 left-4 z-[990] flex flex-col gap-2 max-w-xs sm:max-w-sm w-full pointer-events-auto" data-testid="gis-measurements-panel">
        <div className="bg-surface/95 backdrop-blur-md p-3.5 rounded-2xl border border-border-strong shadow-xl text-xs space-y-3">
          <div className="flex items-center justify-between font-bold text-primary">
            <div className="flex items-center gap-1.5" data-testid="compass-north">
              <Compass size={15} className="text-[#093C22]" />
              <span className="font-semibold text-sm">GIS Register &mdash; {community.name}</span>
            </div>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-muted hover:text-primary p-1 rounded-lg hover:bg-page transition-colors cursor-pointer"
              title={showLegend ? "Collapse legend" : "Expand legend"}
            >
              {showLegend ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {/* DYNAMIC MEASUREMENTS CARD */}
          {liveDrawingMetrics ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-200">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {liveDrawingMetrics.type === 'BOUNDARY' ? 'Tracing Boundary...' : (isEditingRoad ? 'Editing Route Vertices...' : 'Tracing Route...')}
                </span>
                <span className="font-mono text-[10px] bg-emerald-200/60 dark:bg-emerald-800/60 px-2 py-0.5 rounded">
                  {liveDrawingMetrics.vertexCount} vertices
                </span>
              </div>
              {liveDrawingMetrics.type === 'BOUNDARY' ? (
                <div className="font-mono text-[11px] text-emerald-900 dark:text-emerald-100 space-y-0.5">
                  <div>Live Area: <strong>{liveDrawingMetrics.ha} ha</strong> ({liveDrawingMetrics.sqKm} km² / {liveDrawingMetrics.sqMeters} m²)</div>
                  <div>Live Perimeter: <strong>{liveDrawingMetrics.perimeterKm} km</strong> ({liveDrawingMetrics.perimeterMeters} m)</div>
                </div>
              ) : (
                <div className="font-mono text-[11px] text-emerald-900 dark:text-emerald-100 space-y-0.5">
                  <div>Live Route Length: <strong>{liveDrawingMetrics.lenKm} km</strong> ({liveDrawingMetrics.lenMeters} m)</div>
                </div>
              )}
            </div>
          ) : selectedFeature ? (
            <div className="p-3 bg-page rounded-xl border border-border space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    {selectedFeature.category || selectedFeature.type}
                  </span>
                  <h4 className="font-bold text-xs text-primary mt-1">{selectedFeature.title}</h4>
                </div>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="p-1 text-muted hover:text-primary rounded-lg cursor-pointer"
                  title="Deselect feature"
                >
                  <X size={13} />
                </button>
              </div>

              {selectedFeature.type === 'BOUNDARY' && areaStats && (
                <div className="space-y-1 font-mono text-[11px] text-secondary">
                  <div className="flex justify-between">
                    <span>Enclosed Area:</span>
                    <strong className="text-primary">{areaStats.hectares} ha ({areaStats.sqKm} km²)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Perimeter:</span>
                    <strong className="text-primary">{areaStats.perimeterKm} km ({areaStats.perimeterMeters} m)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Vertex Count:</span>
                    <strong className="text-primary">{boundaryVertexCount} vertices</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Centroid:</span>
                    <strong className="text-primary">{areaStats.centroidLat}°, {areaStats.centroidLng}°</strong>
                  </div>
                </div>
              )}

              {selectedFeature.type === 'ROAD' && (
                <div className="space-y-1 font-mono text-[11px] text-secondary">
                  <div className="flex justify-between">
                    <span>Route Length:</span>
                    <strong className="text-primary">{selectedFeature.lengthKm || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Vertices:</span>
                    <strong className="text-primary">{selectedFeature.vertexCount || 'N/A'} vertices</strong>
                  </div>
                  {selectedFeature.notes && (
                    <p className="text-[10px] text-muted font-sans italic pt-0.5">
                      &quot;{selectedFeature.notes}&quot;
                    </p>
                  )}
                </div>
              )}

              {selectedFeature.type === 'FEATURE' && (
                <div className="space-y-1 font-mono text-[11px] text-secondary">
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <strong className="text-primary">{selectedFeature.coordinates}</strong>
                  </div>
                  {selectedFeature.accuracy && (
                    <div className="flex justify-between">
                      <span>GNSS Precision:</span>
                      <strong className="text-primary">{selectedFeature.accuracy}</strong>
                    </div>
                  )}
                  {selectedFeature.surveyId && (
                    <div className="flex justify-between">
                      <span>Survey Record:</span>
                      <strong className="text-primary">{selectedFeature.surveyId}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Selected Feature */}
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border">
                {selectedFeature.type === 'BOUNDARY' && (
                  <>
                    <button
                      onClick={startEditBoundary}
                      className="px-2 py-1 bg-surface text-primary border border-border rounded-lg hover:bg-page font-medium cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Edit3 size={11} />
                      <span>Edit Vertices</span>
                    </button>
                    <button
                      onClick={handleClearBoundary}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-medium cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 size={11} />
                      <span>Delete Boundary</span>
                    </button>
                  </>
                )}

                {selectedFeature.type === 'ROAD' && (
                  <>
                    {!isEditingRoad ? (
                      <>
                        <button
                          onClick={() => startEditRoad(selectedFeature.id)}
                          className="px-2 py-1 bg-surface text-primary border border-border rounded-lg hover:bg-page font-medium cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 size={11} />
                          <span>Edit Vertices</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRoad(selectedFeature.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-medium cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 size={11} />
                          <span>Delete Route</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={cancelEditRoad}
                          className="px-2 py-1 bg-page text-secondary border border-border rounded-lg hover:bg-surface font-medium cursor-pointer text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditRoad}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-semibold shadow-2xs cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Check size={11} />
                          <span>Save Edits</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-page rounded-xl border border-border space-y-1.5">
              <div className="flex items-center justify-between text-muted text-[10px] font-semibold uppercase tracking-wider">
                <span>Territory Summary</span>
                <span>Active Coverage</span>
              </div>
              <div className="font-mono text-[11px] space-y-0.5 text-secondary">
                <div className="flex justify-between">
                  <span>Enclosed Area:</span>
                  <strong className="text-primary">{areaStats ? `${areaStats.hectares} ha (${areaStats.sqKm} km²)` : 'No Boundary Set'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Routes Mapped:</span>
                  <strong className="text-primary">{roadFeatures.length} route{roadFeatures.length === 1 ? '' : 's'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Survey Assets:</span>
                  <strong className="text-primary">{features.filter(f => f.feature_type !== 'ROAD').length} point{features.filter(f => f.feature_type !== 'ROAD').length === 1 ? '' : 's'}</strong>
                </div>
              </div>
              <div className="text-[10px] text-muted italic pt-1">
                Click any boundary, route line, or survey marker on the map to inspect and edit measurements.
              </div>
              {(boundaryGeoJSON || roadFeatures.length > 0) && (
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted">Drawings:</span>
                  <button
                    onClick={handleClearAllDrawings}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-medium cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Safeguard: Clears drawn boundaries and routes only. Survey points are never deleted."
                  >
                    <Trash2 size={11} />
                    <span>Clear All Drawings</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COLLAPSIBLE FIELD ASSET LEGEND */}
          {showLegend && (
            <div className="space-y-2 pt-2 border-t border-border animate-in fade-in duration-100 text-[11px]">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#093C22]"></span>
                  <span>Households ({featureBreakdown['HOUSEHOLD'] || 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1d4ed8]"></span>
                  <span>Education ({featureBreakdown['EDUCATION'] || 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]"></span>
                  <span>Health ({featureBreakdown['HEALTH'] || 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7e22ce]"></span>
                  <span>Civic ({featureBreakdown['GOVERNANCE'] || 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]"></span>
                  <span>Worship ({featureBreakdown['CHURCH'] || 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-[#093C22] bg-[#093C22]/15"></span>
                  <span>Boundary</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN MAP CONTAINER */}
      <MapContainer
        center={defaultCenter}
        zoom={15}
        className="flex-1 w-full z-0 font-sans"
        preferCanvas={true}
      >
        <MapInstanceBridge onMapReady={handleMapReady} />
        <MapScaleControl />
        <MapInteractions
          onMapClick={(latlng) => {
            if (isDrawingBoundary || isDrawingRoad) {
              setDrawingVertices(prev => [...prev, [latlng.lat, latlng.lng]]);
              setRedoVertices([]);
              setBoundaryValidationError(null);
            } else {
              setSelectedLocation(latlng);
            }
          }}
          onMouseMove={(latlng) => {
            if (isDrawingBoundary || isDrawingRoad) {
              setHoverLatLng([latlng.lat, latlng.lng]);
            }
          }}
        />

        {/* Dynamic Map Tile Layer based on mapStyle state */}
        {mapStyle === 'streets' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}

        {mapStyle === 'satellite' && (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            crossOrigin="anonymous"
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}

        {mapStyle === 'hybrid' && (
          <>
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              crossOrigin="anonymous"
              maxZoom={19}
              eventHandlers={{ tileerror: () => setTileError(true) }}
            />
            <TileLayer
              attribution='Labels &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              crossOrigin="anonymous"
              maxZoom={19}
            />
          </>
        )}

        {mapStyle === 'terrain' && (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Sources: USGS, FAO, NPS, EPA, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            crossOrigin="anonymous"
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}

        {mapStyle === 'b_w' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            crossOrigin="anonymous"
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
        )}

        {/* Community Boundary Layer Group */}
        <FeatureGroup ref={featureGroupRef} />

        {/* Real-time Drawing Vertices and Lines */}
        {(isDrawingBoundary || isDrawingRoad) && (
          <>
            {/* Placed Vertices */}
            {drawingVertices.map((v, i) => (
              <CircleMarker
                key={`draw-vertex-${i}`}
                center={v}
                radius={i === 0 ? 6 : 4.5}
                pathOptions={{
                  color: i === 0 ? '#059669' : (isDrawingBoundary ? '#093C22' : '#ea580c'),
                  fillColor: i === 0 ? '#34d399' : (isDrawingBoundary ? '#10b981' : '#f97316'),
                  fillOpacity: 1,
                  weight: 2
                }}
              />
            ))}

            {/* Placed Polyline */}
            {drawingVertices.length > 1 && (
              <Polyline
                positions={drawingVertices}
                pathOptions={{
                  color: isDrawingBoundary ? '#093C22' : '#ea580c',
                  weight: 3,
                  dashArray: isDrawingBoundary ? '6, 4' : undefined,
                  opacity: 0.95
                }}
              />
            )}

            {/* Live Pointer Preview Segment */}
            {drawingVertices.length > 0 && hoverLatLng && (
              <Polyline
                positions={[drawingVertices[drawingVertices.length - 1], hoverLatLng]}
                pathOptions={{
                  color: isDrawingBoundary ? '#10b981' : '#f97316',
                  weight: 2.5,
                  dashArray: '5, 5',
                  opacity: 0.85
                }}
              />
            )}

            {/* Polygon Closing Preview Segment back to vertex 0 */}
            {isDrawingBoundary && drawingVertices.length >= 2 && hoverLatLng && (
              <Polyline
                positions={[hoverLatLng, drawingVertices[0]]}
                pathOptions={{
                  color: '#059669',
                  weight: 1.5,
                  dashArray: '2, 4',
                  opacity: 0.55
                }}
              />
            )}
          </>
        )}

        {/* Community Center Marker (When boundary is not yet drawn) */}
        {community.latitude && community.longitude && !boundaryGeoJSON && (
          <Marker position={[community.latitude, community.longitude]} icon={defaultIcon}>
            <Popup>
              <div className="p-1">
                <div className="font-bold text-sm text-[#093C22]">{community.name}</div>
                <div className="text-xs text-gray-600 mt-0.5">Assigned Community Center Point</div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  {community.latitude.toFixed(5)}°, {community.longitude.toFixed(5)}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Student Current GPS Position */}
        {currentLocation && (
          <Marker position={currentLocation} icon={myLocationIcon}>
            <Popup>
              <div className="text-xs font-semibold">Your Current GPS Position</div>
            </Popup>
          </Marker>
        )}

        {/* Clicked Selection Pin */}
        {selectedLocation && (
          <Marker position={selectedLocation} icon={selectedLocationIcon}>
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Coordinates Selected</div>
                <div className="font-mono mt-0.5">{selectedLocation.lat.toFixed(5)}°, {selectedLocation.lng.toFixed(5)}°</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Surveyed Field Features */}
        {visibleFeatures.map(feature => {
          if (feature.feature_type === 'ROAD') return null;
          const associatedSurvey = getAssociatedSurvey(feature.id);
          const icon = createFeatureIcon(feature.feature_type, Boolean(associatedSurvey), mapStyle === 'b_w');
          const visuals = getFeatureVisuals(feature.feature_type);
          const featureName = (feature.metadata_json as Record<string, unknown> | null)?.facility_name ||
                             (feature.metadata_json as Record<string, unknown> | null)?.label;

          return (
            <Marker
              key={feature.id}
              position={[feature.latitude, feature.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setSelectedFeature({
                    id: feature.id,
                    type: 'FEATURE',
                    title: featureName ? String(featureName) : visuals.label,
                    category: visuals.label,
                    surveyId: associatedSurvey?.entity_id || (associatedSurvey ? associatedSurvey.id.slice(0, 8) : undefined),
                    coordinates: `${feature.latitude.toFixed(5)}°, ${feature.longitude.toFixed(5)}°`,
                    accuracy: feature.accuracy_meters ? `±${Math.round(feature.accuracy_meters)}m` : undefined
                  });
                }
              }}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1">
                  <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <span style={{ color: visuals.color }}>●</span>
                    <span>{visuals.label}</span>
                  </div>

                  {Boolean(featureName) && (
                    <div className="font-medium text-gray-700">{String(featureName)}</div>
                  )}

                  {associatedSurvey ? (
                    <div className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Linked Survey: {associatedSurvey.entity_id || associatedSurvey.id.slice(0, 8)}
                    </div>
                  ) : (
                    <div className="inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Field Feature (Unlinked)
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 font-mono">
                    {feature.latitude.toFixed(5)}°, {feature.longitude.toFixed(5)}°
                    {feature.accuracy_meters && ` (±${Math.round(feature.accuracy_meters)}m)`}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Mapped Road / Path Infrastructure Lines */}
        {roadFeatures.map(rf => {
          if (isEditingRoad && editingRoadId === rf.id) {
            return null; // Rendered by interactive editable polyline and vertex handles instead
          }
          const featureData = rf.metadata_json as unknown as GeoJSON.Feature<GeoJSON.LineString> | null;
          const coords = featureData?.geometry?.coordinates;
          if (!coords || !Array.isArray(coords)) return null;
          const latLngs = (coords as [number, number][]).map((c) => [c[1], c[0]] as [number, number]);
          const meta = rf.metadata_json as Record<string, unknown> | null;
          const category = String(meta?.category || 'LOCAL_ROAD');
          const isBW = mapStyle === 'b_w';
          const visuals = getRoadVisuals(category, isBW);
          const roadTitle = String(meta?.label || visuals.label);
          const isSelected = selectedFeature?.id === rf.id;

          return (
            <Polyline
              key={rf.id}
              positions={latLngs}
              pathOptions={{
                color: isSelected ? (isBW ? '#000000' : '#2563eb') : visuals.color,
                weight: isSelected ? visuals.weight + 2 : visuals.weight,
                dashArray: visuals.dashArray,
                opacity: 0.95
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  handleSelectRoad(rf);
                }
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: visuals.color }} />
                    <span>{visuals.label}</span>
                  </div>
                  <div className="font-medium text-gray-700">{roadTitle}</div>
                  {Boolean(meta?.length_km) && (
                    <div className="font-mono text-[10px] text-muted">Length: {String(meta?.length_km)}</div>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Active Editable Road Polyline & Draggable Vertex Handles */}
        {isEditingRoad && editingRoadVertices.length > 0 && (
          <>
            <Polyline
              positions={editingRoadVertices}
              pathOptions={{
                color: '#ea580c',
                weight: 4,
                dashArray: '6, 6',
                opacity: 0.95
              }}
            />
            {editingRoadVertices.map((vertex, idx) => (
              <Marker
                key={`road-edit-handle-${idx}`}
                position={vertex}
                draggable={true}
                eventHandlers={{
                  drag: (e) => {
                    const newPos = e.target.getLatLng();
                    setEditingRoadVertices(prev => {
                      const updated = [...prev];
                      updated[idx] = [newPos.lat, newPos.lng];
                      return updated;
                    });
                  }
                }}
                icon={L.divIcon({
                  className: 'road-vertex-handle',
                  html: `
                    <div style="
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background-color: #ea580c;
                      border: 2px solid #ffffff;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #ffffff;
                      font-size: 10px;
                      font-weight: bold;
                      cursor: grab;
                    ">
                      ${idx + 1}
                    </div>
                  `,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9]
                })}
              />
            ))}
          </>
        )}
      </MapContainer>

      {/* ROAD CREATION NAMING MODAL */}
      {roadModalOpen && pendingRoadGeoJSON && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl w-full max-w-sm shadow-2xl border border-border-strong p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <Route size={14} className="text-amber-600" />
                <span>Save Mapped Route</span>
              </h3>
              <button
                onClick={() => {
                  setRoadModalOpen(false);
                  setPendingRoadGeoJSON(null);
                }}
                className="p-1 text-muted hover:text-primary rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-secondary font-medium mb-1">Route Classification</label>
                <select
                  value={selectedRoadCategory}
                  onChange={(e) => setSelectedRoadCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-page border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                >
                  {ROAD_CATEGORIES.map(rc => (
                    <option key={rc.id} value={rc.id}>{rc.label} — {rc.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-secondary font-medium mb-1">Route Name / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. St. Peter's School Access Road"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-page border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                />
              </div>

              <div>
                <label className="block text-secondary font-medium mb-1">Field Notes / Condition (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Unpaved dirt pathway, usable by motorbikes and pedestrians"
                  value={roadNotes}
                  onChange={(e) => setRoadNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-page border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => {
                  setRoadModalOpen(false);
                  setPendingRoadGeoJSON(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-page font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={savingRoad}
                onClick={handleSaveRoadSubmit}
                className="px-3.5 py-1.5 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {savingRoad ? 'Saving...' : 'Save Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT PRINT & EXPORT MODAL */}
      {showReportModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden !important; }
              #printable-community-map, #printable-community-map * { visibility: visible !important; }
              #printable-community-map {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 10mm !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
              }
            }
          `}} />

          <div className="bg-surface rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-border-strong animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-page/50 flex items-center justify-between shrink-0 print:hidden">
              <div>
                <h2 className="text-base font-bold text-primary">Official Community Fieldwork Map Report</h2>
                <p className="text-xs text-secondary mt-0.5">Standard fieldwork documentation layout ready for print and evaluation.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg border border-border-strong bg-surface text-xs font-semibold text-primary hover:bg-page transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print Map</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#093C22] text-xs font-semibold text-white hover:bg-[#0c512e] transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Save PDF</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 text-muted hover:text-primary hover:bg-page rounded-lg transition-colors ml-1 cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-page flex justify-center">
              <div id="printable-community-map" className="w-full max-w-[210mm] bg-surface p-8 rounded-xl shadow-xs border border-border text-primary font-sans text-xs space-y-5">
                {/* Institutional Header */}
                <div className="border-b-2 border-border-strong pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-base font-bold tracking-tight text-primary">COMMUNITY & FIELD SURVEY SYSTEM (CFSS)</h1>
                      <div className="text-xs text-secondary font-medium">Official Fieldwork Community Map & Geographic Register</div>
                    </div>
                    <div className="text-right text-[11px] text-muted">
                      <div>Session: 2025/2026 Academic Year</div>
                      <div>Date: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* Community Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-page/70 p-3.5 rounded-xl border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold block">Community</span>
                    <strong className="text-primary">{community.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold block">District / Region</span>
                    <strong className="text-primary">{community.district || 'Ghana'}, {community.region || 'Region'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold block">Group Assignment</span>
                    <strong className="text-primary">Group {community.group_number || 1}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-semibold block">Survey Provenance</span>
                    <strong className="text-primary">{((community.spatial_metadata as unknown as GeoJSON.Feature | null)?.properties?.provenance as string) || 'Fieldwork GPS / Manual'}</strong>
                  </div>
                </div>

                {/* Geographic Measurements */}
                {areaStats && (
                  <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold uppercase block">Measured Area</span>
                      <strong className="text-[#093C22] font-mono text-sm">{areaStats.hectares} ha</strong>
                      <div className="text-[10px] text-muted">({areaStats.sqKm} km² / {areaStats.sqMeters} m²)</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold uppercase block">Measured Perimeter</span>
                      <strong className="text-[#093C22] font-mono text-sm">{areaStats.perimeterKm} km</strong>
                      <div className="text-[10px] text-muted">({areaStats.perimeterMeters} m)</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold uppercase block">Centroid Coordinate</span>
                      <strong className="text-[#093C22] font-mono text-sm">{areaStats.centroidLat}°, {areaStats.centroidLng}°</strong>
                      <div className="text-[10px] text-muted">WGS84 Reference</div>
                    </div>
                  </div>
                )}

                {/* Boundary Clipped Map Canvas Preview */}
                {exportPreviewDataUrl ? (
                  <div className="rounded-xl overflow-hidden border border-border bg-page/50 p-2.5 flex flex-col items-center space-y-1.5" data-testid="export-preview-container">
                    <div className="text-[11px] font-semibold text-secondary flex items-center justify-between w-full px-1">
                      <span>Clipped Territorial Boundary Map</span>
                      {exportInteriorStats && (
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full font-mono font-medium">
                          Interior Features: {exportInteriorStats.featuresCount} points, {exportInteriorStats.roadsCount} routes
                        </span>
                      )}
                    </div>
                    <img
                      src={exportPreviewDataUrl}
                      alt="Clipped Boundary Map Preview"
                      className="max-h-[340px] w-auto object-contain rounded-lg shadow-sm border border-border bg-white"
                      data-testid="export-preview-img"
                    />
                  </div>
                ) : isExporting ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-xl">
                    <div className="w-5 h-5 border-2 border-[#093C22] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Rendering clipped territorial boundary canvas...</span>
                  </div>
                ) : null}

                {/* Features Inventory Breakdown Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">Field Assets & Surveys Inventory</h3>
                    {exportInteriorStats && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-mono">
                        Filter: Interior Boundary Features Only
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left border-collapse border border-border text-xs">
                    <thead>
                      <tr className="bg-page text-secondary">
                        <th className="p-2 border border-border font-semibold">Asset Category</th>
                        <th className="p-2 border border-border font-semibold">Count</th>
                        <th className="p-2 border border-border font-semibold">Symbology Description</th>
                        <th className="p-2 border border-border font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border border-border font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#093C22]"></span> Households
                        </td>
                        <td className="p-2 border border-border font-mono">{featureBreakdown['HOUSEHOLD'] || 0}</td>
                        <td className="p-2 border border-border text-secondary">Dark green residential dwellings</td>
                        <td className="p-2 border border-border text-emerald-600 font-semibold">Enumerated</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-border font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#1d4ed8]"></span> Education Institutions
                        </td>
                        <td className="p-2 border border-border font-mono">{featureBreakdown['EDUCATION'] || 0}</td>
                        <td className="p-2 border border-border text-secondary">Blue school facilities & colleges</td>
                        <td className="p-2 border border-border text-emerald-600 font-semibold">Enumerated</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-border font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]"></span> Health Centers
                        </td>
                        <td className="p-2 border border-border font-mono">{featureBreakdown['HEALTH'] || 0}</td>
                        <td className="p-2 border border-border text-secondary">Red clinics, CHPS, & health posts</td>
                        <td className="p-2 border border-border text-emerald-600 font-semibold">Enumerated</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-border font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#7e22ce]"></span> Governance / Civic
                        </td>
                        <td className="p-2 border border-border font-mono">{featureBreakdown['GOVERNANCE'] || 0}</td>
                        <td className="p-2 border border-border text-secondary">Purple palaces & council assemblies</td>
                        <td className="p-2 border border-border text-emerald-600 font-semibold">Enumerated</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-border font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span> Roads & Routes
                        </td>
                        <td className="p-2 border border-border font-mono">{roadFeatures.length}</td>
                        <td className="p-2 border border-border text-secondary">Mapped road & pathway infrastructure</td>
                        <td className="p-2 border border-border text-emerald-600 font-semibold">Mappable LineStrings</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Report Sign-off & Disclaimer */}
                <div className="pt-4 border-t border-border flex justify-between items-end text-[10px] text-muted">
                  <div className="max-w-md leading-relaxed">
                    * Cartographic Disclaimer: Boundary representation and surface calculations are calculated via WGS84 geodesic algorithms based on fieldwork sketches and GNSS captures. Cartographic base map data & geocoding &copy; OpenStreetMap contributors under ODbL, imagery &copy; Esri World Imagery. Intended solely for academic fieldwork reporting.
                  </div>
                  <div className="text-right">
                    <div className="border-b border-border pb-1 mb-1 font-semibold text-primary">Fieldwork Supervisor Sign-off</div>
                    <div>Signature / Date</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
