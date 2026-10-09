"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

// Fix for default Leaflet icon in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface GeomanSetupProps {
  featureGroupRef: React.RefObject<L.FeatureGroup | null>;
  onShapeChange: (geojson: any) => void;
  initialGeoJSON: any;
}

function GeomanSetup({ featureGroupRef, onShapeChange, initialGeoJSON }: GeomanSetupProps) {
  const map = useMap();
  const initDone = useRef(false);

  useEffect(() => {
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

    const updateShape = () => {
      if (!featureGroupRef.current) return;
      const layers = featureGroupRef.current.getLayers();
      if (layers.length === 0) {
        onShapeChange(null);
        return;
      }
      
      // If multiple shapes, keep only the last one (enforce single polygon)
      if (layers.length > 1) {
        const lastLayer = layers[layers.length - 1];
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(lastLayer);
        const geojson = (lastLayer as any).toGeoJSON();
        onShapeChange(geojson);
      } else {
        const geojson = (layers[0] as any).toGeoJSON();
        onShapeChange(geojson);
      }
    };

    map.on('pm:create', (e) => {
      const layer = e.layer;
      featureGroupRef.current?.addLayer(layer);
      
      // Listen for edit on the new layer
      layer.on('pm:edit', updateShape);
      
      updateShape();
    });

    map.on('pm:remove', (e) => {
      updateShape();
    });
    
    // Load initial shape if available
    if (initialGeoJSON && !initDone.current && featureGroupRef.current) {
      initDone.current = true;
      const layer = L.geoJSON(initialGeoJSON, {
        onEachFeature: (feature, l) => {
          l.on('pm:edit', updateShape);
        }
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
  }, [map, featureGroupRef, onShapeChange, initialGeoJSON]);

  return null;
}

interface AdminCommunityMapProps {
  community: any;
  onSave: (spatialData: any, lat: number | null, lng: number | null) => Promise<void>;
  onCancel: () => void;
}

export default function AdminCommunityMap({ community, onSave, onCancel }: AdminCommunityMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [geoJSON, setGeoJSON] = useState<any>(community.spatial_metadata || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Default center: Ghana if no boundary, or community centroid if available
  const defaultCenter: [number, number] = (community.latitude && community.longitude) 
    ? [community.latitude, community.longitude] 
    : [7.9465, -1.0232];
  const defaultZoom = (community.latitude && community.longitude) ? 14 : 6;
  
  const areaStats = useMemo(() => {
    if (!geoJSON) return null;
    
    try {
      const areaSqMeters = turf.area(geoJSON);
      const areaHectares = areaSqMeters / 10000;
      const areaSqKm = areaSqMeters / 1000000;
      
      return {
        sqMeters: areaSqMeters.toFixed(2),
        hectares: areaHectares.toFixed(2),
        sqKm: areaSqKm.toFixed(4)
      };
    } catch (e) {
      console.error("Error calculating area:", e);
      return null;
    }
  }, [geoJSON]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let lat = community.latitude;
      let lng = community.longitude;
      let newSpatial = geoJSON;

      if (geoJSON) {
        // Calculate centroid to update lat/lng of community
        try {
          const centroid = turf.centroid(geoJSON);
          lng = centroid.geometry.coordinates[0];
          lat = centroid.geometry.coordinates[1];
          
          // Optionally enrich metadata with area
          newSpatial = {
            ...geoJSON,
            properties: {
              ...geoJSON.properties,
              area_sqm: turf.area(geoJSON)
            }
          };
        } catch (e) {
          console.warn("Failed to calculate centroid", e);
        }
      } else {
        newSpatial = null;
        lat = null;
        lng = null;
      }

      await onSave(newSpatial, lat, lng);
    } catch (err: any) {
      setError(err.message || 'Failed to save boundary');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center bg-page p-4 border border-border rounded-lg shadow-sm">
        <div>
          <h3 className="font-bold text-primary">Community Boundary</h3>
          <p className="text-xs text-secondary mt-1">
            Draw the boundary of {community.name}. This is used to validate student GPS submissions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cfss-green hover:bg-cfss-green-dark">
            {saving ? 'Saving...' : 'Save Boundary'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      
      {areaStats && (
        <div className="flex gap-4 p-3 bg-cfss-green-soft text-cfss-green rounded-md text-sm font-medium">
          <div><span className="opacity-70 text-xs block uppercase">Area (Hectares)</span> {areaStats.hectares} ha</div>
          <div><span className="opacity-70 text-xs block uppercase">Area (Sq. km)</span> {areaStats.sqKm} km²</div>
        </div>
      )}

      <div className="flex-1 relative rounded-lg overflow-hidden border border-border shadow-sm min-h-[400px]">
        <MapContainer 
          center={defaultCenter} 
          zoom={defaultZoom} 
          className="w-full h-full absolute inset-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FeatureGroup ref={featureGroupRef}>
            <GeomanSetup 
              featureGroupRef={featureGroupRef} 
              onShapeChange={setGeoJSON} 
              initialGeoJSON={community.spatial_metadata} 
            />
          </FeatureGroup>
        </MapContainer>
      </div>
    </div>
  );
}
