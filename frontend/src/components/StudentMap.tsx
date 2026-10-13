"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
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

export type MapStyle = 'streets' | 'satellite' | 'hybrid' | 'terrain';

// Road categories and styling
export const ROAD_CATEGORIES = [
  { id: 'MAJOR_ROAD', label: 'Major Road', description: 'Highway / Inter-settlement link', color: '#ea580c', weight: 4.5, dashArray: undefined },
  { id: 'LOCAL_ROAD', label: 'Local Road', description: 'Main settlement street', color: '#2563eb', weight: 3.5, dashArray: undefined },
  { id: 'ACCESS_ROAD', label: 'Access Road', description: 'Compound / facility access', color: '#059669', weight: 3, dashArray: '6, 4' },
  { id: 'FOOTPATH', label: 'Footpath / Trail', description: 'Pedestrian walking route', color: '#d97706', weight: 2.5, dashArray: '3, 4' },
  { id: 'OTHER', label: 'Other Route', description: 'Locally identified path', color: '#7c3aed', weight: 3, dashArray: '5, 5' }
] as const;

export const getRoadVisuals = (category: string) => {
  const found = ROAD_CATEGORIES.find(c => c.id === category?.toUpperCase());
  return found || ROAD_CATEGORIES[1];
};

// Accessible Feature Symbology with embedded SVG icons
export const getFeatureVisuals = (type: string) => {
  switch (type.toUpperCase()) {
    case 'HOUSEHOLD':
      return {
        color: '#093C22',
        label: 'Household',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
      };
    case 'EDUCATION':
      return {
        color: '#1d4ed8',
        label: 'Education Facility',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
      };
    case 'HEALTH':
      return {
        color: '#dc2626',
        label: 'Health / Clinic',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14"/></svg>`
      };
    case 'GOVERNANCE':
      return {
        color: '#7e22ce',
        label: 'Governance / Palace',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`
      };
    case 'CHURCH':
    case 'RELIGIOUS':
    case 'WORSHIP':
      return {
        color: '#d97706',
        label: 'Place of Worship',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H7M18 10H6"/></svg>`
      };
    case 'WATER':
      return {
        color: '#0284c7',
        label: 'Water Point',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`
      };
    case 'ROAD':
      return {
        color: '#ea580c',
        label: 'Road / Path',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`
      };
    default:
      return {
        color: '#475569',
        label: 'Field Landmark',
        iconSvg: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
      };
  }
};

const createFeatureIcon = (type: string, isSubmitted: boolean) => {
  const { color, iconSvg } = getFeatureVisuals(type);
  const opacity = isSubmitted ? '1' : '0.85';
  const border = isSubmitted ? '2px solid #ffffff' : '2px dashed #fef08a';

  return L.divIcon({
    className: 'custom-feature-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 8px;
        border: ${border};
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
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

function MapInteractions({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
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
  const [boundaryVertexCount, setBoundaryVertexCount] = useState(0);
  const [boundaryValidationError, setBoundaryValidationError] = useState<string | null>(null);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [hasUnsavedBoundary, setHasUnsavedBoundary] = useState(false);

  // Road Drawing State
  const [selectedRoadCategory, setSelectedRoadCategory] = useState<string>('LOCAL_ROAD');
  const [isDrawingRoad, setIsDrawingRoad] = useState(false);
  const [roadVertexCount, setRoadVertexCount] = useState(0);
  const [pendingRoadGeoJSON, setPendingRoadGeoJSON] = useState<GeoJSON.Feature | null>(null);
  const [roadModalOpen, setRoadModalOpen] = useState(false);
  const [roadName, setRoadName] = useState('');
  const [roadNotes, setRoadNotes] = useState('');
  const [savingRoad, setSavingRoad] = useState(false);

  // Inspector State
  const [inspectedFeature, setInspectedFeature] = useState<{
    id?: string;
    type: 'FEATURE' | 'ROAD' | 'BOUNDARY';
    title: string;
    category?: string;
    surveyId?: string;
    coordinates?: string;
    accuracy?: string;
    stats?: string;
    notes?: string;
  } | null>(null);

  // UI state
  const [showLegend, setShowLegend] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [tileError, setTileError] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const boundaryLayersInit = useRef(false);

  const handleMapReady = useCallback((map: L.Map | null) => {
    mapInstanceRef.current = map;
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

  // Load Initial Boundary into FeatureGroup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !featureGroupRef.current || boundaryLayersInit.current) return;
    if (initialBoundary) {
      boundaryLayersInit.current = true;
      try {
        featureGroupRef.current.clearLayers();
        const layer = L.geoJSON(initialBoundary as GeoJSON.GeoJsonObject, {
          style: {
            color: '#093C22',
            weight: 3,
            opacity: 0.9,
            fillColor: '#093C22',
            fillOpacity: 0.15
          }
        });
        layer.eachLayer((l) => {
          featureGroupRef.current?.addLayer(l);
        });
      } catch (err) {
        console.warn("Failed to load initial boundary layer", err);
      }
    }
  }, [initialBoundary]);

  // Geoman Programmatic Event Bindings
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

    const handleCreate = (e: { layer: L.Layer }) => {
      const layer = e.layer;

      if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // Road LineString Created
        const lineGeo = (layer as L.Polyline).toGeoJSON();
        setPendingRoadGeoJSON(lineGeo);
        setRoadModalOpen(true);
        // Remove raw line from map, will be rendered by React Polyline
        map.removeLayer(layer);
        setIsDrawingRoad(false);
        setRoadVertexCount(0);
        return;
      }

      if (layer instanceof L.Polygon) {
        // Community Polygon Created
        featureGroupRef.current?.addLayer(layer);
        const newGeo = extractGeoJSONFromLayers();
        const validation = validatePolygon(newGeo);
        setBoundaryValidationError(validation.error || null);
        setBoundaryGeoJSON(newGeo);
        setHasUnsavedBoundary(true);
        setIsDrawingBoundary(false);
        setBoundaryVertexCount(0);
      }
    };

    const handleVertexAdded = () => {
      setBoundaryVertexCount(prev => prev + 1);
      setRoadVertexCount(prev => prev + 1);
    };

    const handleVertexRemoved = () => {
      setBoundaryVertexCount(prev => Math.max(0, prev - 1));
      setRoadVertexCount(prev => Math.max(0, prev - 1));
    };

    const handleEdit = () => {
      const updatedGeo = extractGeoJSONFromLayers();
      const validation = validatePolygon(updatedGeo);
      setBoundaryValidationError(validation.error || null);
      setBoundaryGeoJSON(updatedGeo);
      setHasUnsavedBoundary(true);
    };

    map.on('pm:create', handleCreate);
    map.on('pm:vertexadded', handleVertexAdded);
    map.on('pm:vertexremoved', handleVertexRemoved);

    return () => {
      map.off('pm:create', handleCreate);
      map.off('pm:vertexadded', handleVertexAdded);
      map.off('pm:vertexremoved', handleVertexRemoved);
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

      const metrics = {
        sqMeters: Math.round(areaSqMeters).toLocaleString(),
        hectares: (areaSqMeters / 10000).toFixed(2),
        sqKm: (areaSqMeters / 1000000).toFixed(3),
        perimeterKm: perimeterKm.toFixed(2),
        perimeterMeters: Math.round(perimeterKm * 1000).toLocaleString(),
        centroidLat: centroid.geometry.coordinates[1].toFixed(5),
        centroidLng: centroid.geometry.coordinates[0].toFixed(5)
      };

      if (onMetricsChange) {
        onMetricsChange({
          areaHa: metrics.hectares,
          areaKm2: metrics.sqKm,
          perimeterKm: metrics.perimeterKm,
          centroid: [parseFloat(metrics.centroidLat), parseFloat(metrics.centroidLng)]
        });
      }

      return metrics;
    } catch {
      return null;
    }
  }, [boundaryGeoJSON, onMetricsChange, validatePolygon]);

  // Start Drawing Boundary
  const startDrawBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { enableDraw: (shape: string, opts: Record<string, unknown>) => void } }).pm.enableDraw('Polygon', {
        snappable: true,
        snapDistance: 15,
        allowSelfIntersection: true,
        finishOn: 'dblclick'
      });
      setIsDrawingBoundary(true);
      setBoundaryVertexCount(0);
      setBoundaryValidationError(null);
    } catch (e) {
      console.warn("Could not start polygon drawing", e);
    }
  }, []);

  // Finish Boundary Drawing
  const finishDrawBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const drawInstance = (map as unknown as { pm: { Draw: { Polygon?: { _finishShape?: () => void } } } }).pm.Draw.Polygon;
      if (drawInstance && drawInstance._finishShape) {
        drawInstance._finishShape();
      }
    } catch {
      // ignore
    }
  }, []);

  // Cancel Drawing Boundary
  const cancelDrawBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { disableDraw: () => void } }).pm.disableDraw();
      setIsDrawingBoundary(false);
      setBoundaryVertexCount(0);
    } catch {
      // ignore
    }
  }, []);

  // Enable Boundary Vertex Edit Mode
  const startEditBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { enableGlobalEditMode: (opts?: Record<string, unknown>) => void } }).pm.enableGlobalEditMode({
        snappable: true,
        snapDistance: 15
      });
      setIsEditingBoundary(true);
    } catch (e) {
      console.warn("Could not start vertex editing", e);
    }
  }, []);

  // Stop Boundary Vertex Edit Mode
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
    } catch (e) {
      console.warn("Could not stop vertex editing", e);
    }
  }, [extractGeoJSONFromLayers, validatePolygon]);

  // Cancel Boundary Edits (Restore Original Backup)
  const cancelEditBoundary = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { disableGlobalEditMode: () => void } }).pm.disableGlobalEditMode();
      setIsEditingBoundary(false);
      featureGroupRef.current?.clearLayers();
      if (savedBoundaryBackup.current) {
        const layer = L.geoJSON(savedBoundaryBackup.current as GeoJSON.GeoJsonObject, {
          style: {
            color: '#093C22',
            weight: 3,
            opacity: 0.9,
            fillColor: '#093C22',
            fillOpacity: 0.15
          }
        });
        layer.eachLayer((l) => featureGroupRef.current?.addLayer(l));
      }
      setBoundaryGeoJSON(savedBoundaryBackup.current);
      setHasUnsavedBoundary(false);
      setBoundaryValidationError(null);
    } catch {
      // ignore
    }
  }, []);

  // Clear / Delete Boundary
  const handleClearBoundary = useCallback(() => {
    if (!confirm('Are you sure you want to delete the community boundary? This will reset the territorial coverage for this community.')) {
      return;
    }
    featureGroupRef.current?.clearLayers();
    setBoundaryGeoJSON(null);
    setHasUnsavedBoundary(true);
    setBoundaryValidationError(null);
    if (onSaveBoundary) {
      onSaveBoundary(null);
    }
  }, [onSaveBoundary]);

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

  // Start Drawing Road / Pathway
  const startDrawRoad = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { enableDraw: (shape: string, opts: Record<string, unknown>) => void } }).pm.enableDraw('Line', {
        snappable: true,
        snapDistance: 15,
        finishOn: 'dblclick'
      });
      setIsDrawingRoad(true);
      setRoadVertexCount(0);
    } catch (e) {
      console.warn("Could not start road drawing", e);
    }
  }, []);

  // Finish Road Drawing
  const finishDrawRoad = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const drawInstance = (map as unknown as { pm: { Draw: { Line?: { _finishShape?: () => void } } } }).pm.Draw.Line;
      if (drawInstance && drawInstance._finishShape) {
        drawInstance._finishShape();
      }
    } catch {
      // ignore
    }
  }, []);

  // Cancel Road Drawing
  const cancelDrawRoad = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      (map as unknown as { pm: { disableDraw: () => void } }).pm.disableDraw();
      setIsDrawingRoad(false);
      setRoadVertexCount(0);
    } catch {
      // ignore
    }
  }, []);

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

  // Export Map to Image / PDF
  const handleExport = async (format: 'png' | 'pdf') => {
    if (!mapContainerRef.current) return;
    try {
      const node = mapContainerRef.current;
      const dataUrl = await htmlToImage.toPng(node, {
        cacheBust: true,
        backgroundColor: '#ffffff'
      });

      if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
        const props = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (props.height * pdfWidth) / props.width;

        pdf.setFontSize(14);
        pdf.setTextColor(9, 60, 34);
        pdf.text(`CFSS Community Fieldwork Map — ${community?.name || 'Community'}`, 14, 12);

        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Generated on ${new Date().toLocaleDateString()} | Area: ${areaStats?.hectares || 'N/A'} ha | Perimeter: ${areaStats?.perimeterKm || 'N/A'} km`, 14, 18);

        pdf.addImage(dataUrl, 'PNG', 10, 22, pdfWidth - 20, Math.min(pdfHeight, 175));
        pdf.save(`${community?.name || 'community'}_map_report.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${community?.name || 'community'}_map.${format}`;
        link.href = dataUrl;
        link.click();
      }
    } catch {
      alert('Map export completed with vector annotations. Ensure tiles have completed loading.');
    }
  };

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

      {/* TOP LEFT: Map Style Switcher (Google / Apple Maps inspired) */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-surface/95 backdrop-blur-md p-1 rounded-xl border border-border-strong shadow-md text-xs">
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
        </div>
      </div>

      {/* TOP CENTER / RIGHT: Unified Action Dock */}
      <div className="absolute top-14 sm:top-3 right-3 z-[1000] flex flex-col items-end gap-2">
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
            onClick={() => setShowReportModal(true)}
            data-testid="report-map-btn"
            className="px-2.5 py-1 text-secondary hover:text-primary hover:bg-page rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            title="Official Report Map"
          >
            <Printer size={15} />
            <span>Report Map</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            className="p-1.5 text-secondary hover:text-primary hover:bg-page rounded-lg transition-colors cursor-pointer"
            title="Download PDF"
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
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Tracing Boundary Polygon</span>
                  <span className="font-mono bg-emerald-200/50 dark:bg-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                    {boundaryVertexCount} vertices placed
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Click/tap to place vertices (pan/zoom anytime). Double-click or click first point to close polygon.
                </p>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={cancelDrawBoundary}
                    className="px-2.5 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={finishDrawBoundary}
                    className="px-3 py-1 bg-[#093C22] text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
                  >
                    Finish Polygon
                  </button>
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
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Tracing {getRoadVisuals(selectedRoadCategory).label}</span>
                  <span className="font-mono bg-amber-200/50 dark:bg-amber-800/40 px-2 py-0.5 rounded text-[10px]">
                    {roadVertexCount} vertices
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Click along aerial imagery to place line vertices. Double-click to complete route.
                </p>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={cancelDrawRoad}
                    className="px-2.5 py-1 bg-page hover:bg-surface text-secondary border border-border rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={finishDrawRoad}
                    className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
                  >
                    Finish Route
                  </button>
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
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-[900] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <span>Offline Map Mode: Satellite and street tiles are cached or unavailable, but community boundaries and survey features remain fully operational.</span>
          </div>
          <button onClick={() => setTileError(false)} className="text-amber-900 font-bold ml-2 cursor-pointer">&times;</button>
        </div>
      )}

      {/* GPS LOCATING SPINNER */}
      {isLocating && (
        <div className="absolute inset-0 bg-page/60 backdrop-blur-xs z-[2000] flex flex-col items-center justify-center text-xs font-semibold text-primary">
          <div className="w-7 h-7 border-2 border-[#093C22] border-t-transparent rounded-full animate-spin mb-2"></div>
          <div>Acquiring GPS fix...</div>
        </div>
      )}

      {/* LOCATION ERROR TOAST */}
      {locationError && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="font-bold text-red-900 cursor-pointer">&times;</button>
        </div>
      )}

      {/* BOTTOM RIGHT FLOATING CONTROLS */}
      <div className="absolute bottom-6 right-4 z-[990] flex flex-col items-end gap-2">
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

      {/* BOTTOM LEFT: Scale, Compass, & Collapsible Legend */}
      <div className="absolute bottom-6 left-4 z-[990] flex flex-col gap-2 max-w-xs pointer-events-auto">
        <div className="bg-surface/95 backdrop-blur-md p-3 rounded-xl border border-border-strong shadow-md text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-primary">
            <div className="flex items-center gap-1.5" data-testid="compass-north">
              <Compass size={14} className="text-[#093C22]" />
              <span>GIS Register &mdash; {community.name}</span>
            </div>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-muted hover:text-primary p-0.5 cursor-pointer"
            >
              {showLegend ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

          {showLegend && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-100 text-[11px]">
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

              {areaStats && (
                <div className="pt-2 border-t border-border space-y-0.5 text-[10px] font-mono">
                  <div className="text-primary font-semibold">Area: {areaStats.hectares} ha ({areaStats.sqKm} km²)</div>
                  <div className="text-secondary">Perimeter: {areaStats.perimeterKm} km ({areaStats.perimeterMeters} m)</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FEATURE INSPECTOR DRAWER / CARD */}
      {inspectedFeature && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1050] bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-border-strong shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-2 text-xs space-y-2.5">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {inspectedFeature.category || inspectedFeature.type}
                </span>
                {inspectedFeature.accuracy && (
                  <span className="text-[10px] text-muted">Accuracy: {inspectedFeature.accuracy}</span>
                )}
              </div>
              <h4 className="font-bold text-sm text-primary">{inspectedFeature.title}</h4>
            </div>
            <button
              onClick={() => setInspectedFeature(null)}
              className="p-1 text-muted hover:text-primary rounded-lg transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {inspectedFeature.stats && (
            <div className="p-2 bg-page rounded-lg border border-border font-mono text-[11px] text-primary">
              {inspectedFeature.stats}
            </div>
          )}

          {inspectedFeature.notes && (
            <p className="text-secondary text-[11px] italic">
              &quot;{inspectedFeature.notes}&quot;
            </p>
          )}

          {inspectedFeature.surveyId && (
            <div className="text-[11px] text-secondary flex items-center justify-between border-t border-border pt-2">
              <span>Linked Survey Entity: <strong className="text-primary font-mono">{inspectedFeature.surveyId}</strong></span>
            </div>
          )}

          {inspectedFeature.type === 'ROAD' && inspectedFeature.id && onDeleteFeature && (
            <div className="flex justify-end pt-1">
              <button
                onClick={async () => {
                  if (confirm('Delete this mapped road feature?')) {
                    await onDeleteFeature(inspectedFeature.id!);
                    setInspectedFeature(null);
                  }
                }}
                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete Route</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN MAP CONTAINER */}
      <MapContainer
        center={defaultCenter}
        zoom={15}
        className="flex-1 w-full z-0 font-sans"
        preferCanvas={true}
      >
        <MapInstanceBridge onMapReady={handleMapReady} />
        <MapScaleControl />
        <MapInteractions onMapClick={(latlng) => setSelectedLocation(latlng)} />

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

        {/* Community Boundary Layer Group */}
        <FeatureGroup ref={featureGroupRef} />

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
          const icon = createFeatureIcon(feature.feature_type, Boolean(associatedSurvey));
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
                  setInspectedFeature({
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
          const featureData = rf.metadata_json as unknown as GeoJSON.Feature<GeoJSON.LineString> | null;
          const coords = featureData?.geometry?.coordinates;
          if (!coords || !Array.isArray(coords)) return null;
          const latLngs = (coords as [number, number][]).map((c) => [c[1], c[0]] as [number, number]);
          const meta = rf.metadata_json as Record<string, unknown> | null;
          const category = String(meta?.category || 'LOCAL_ROAD');
          const visuals = getRoadVisuals(category);
          const roadTitle = String(meta?.label || visuals.label);

          return (
            <Polyline
              key={rf.id}
              positions={latLngs}
              pathOptions={{
                color: visuals.color,
                weight: visuals.weight,
                dashArray: visuals.dashArray,
                opacity: 0.95
              }}
              eventHandlers={{
                click: () => {
                  setInspectedFeature({
                    id: rf.id,
                    type: 'ROAD',
                    title: roadTitle,
                    category: visuals.label,
                    stats: `Length: ${meta?.length_km || 'N/A'} (${coords.length} vertices)`,
                    notes: meta?.notes ? String(meta.notes) : undefined
                  });
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

                {/* Features Inventory Breakdown Table */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">Field Assets & Surveys Inventory</h3>
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
