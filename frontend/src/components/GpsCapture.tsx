import React, { useState, useCallback } from 'react';
import {
  MapPin,
  Loader2,
  AlertCircle,
  Navigation,
  Edit2,
  X,
  GraduationCap,
  HeartPulse,
  ShieldCheck,
  Home
} from 'lucide-react';

export type GpsState =
  | 'NOT_CAPTURED'
  | 'CAPTURING'
  | 'CAPTURED'
  | 'MANUAL'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'LOW_ACCURACY';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  label?: string;
  provenance?: 'GPS_CAPTURED' | 'MANUALLY_PLACED';
}

interface GpsCaptureProps {
  onCapture: (location: LocationData) => void;
  onClear?: () => void;
  isReadonly?: boolean;
  initialLocation?: LocationData | null;
  surveyType?: string;
}

export default function GpsCapture({
  onCapture,
  onClear,
  isReadonly = false,
  initialLocation = null,
  surveyType = 'HOUSEHOLD'
}: GpsCaptureProps) {
  const [prevInitialLocation, setPrevInitialLocation] = useState<LocationData | null>(initialLocation);
  const [gpsState, setGpsState] = useState<GpsState>(
    initialLocation
      ? (initialLocation.provenance === 'MANUALLY_PLACED' ? 'MANUAL' : 'CAPTURED')
      : 'NOT_CAPTURED'
  );
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(initialLocation);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualLat, setManualLat] = useState(initialLocation?.latitude?.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.longitude?.toString() || '');
  const [locationLabel, setLocationLabel] = useState(initialLocation?.label || '');
  const [manualError, setManualError] = useState('');

  if (initialLocation !== prevInitialLocation) {
    setPrevInitialLocation(initialLocation);
    if (initialLocation) {
      setCurrentLocation(initialLocation);
      setGpsState(initialLocation.provenance === 'MANUALLY_PLACED' ? 'MANUAL' : 'CAPTURED');
      setManualLat(initialLocation.latitude.toString());
      setManualLng(initialLocation.longitude.toString());
      if (initialLocation.label) setLocationLabel(initialLocation.label);
    }
  }

  const isFacility = ['EDUCATION', 'HEALTH', 'GOVERNANCE'].includes(surveyType.toUpperCase());

  const handleLabelChange = (newLabel: string) => {
    setLocationLabel(newLabel);
    if (currentLocation) {
      const updated = { ...currentLocation, label: newLabel };
      setCurrentLocation(updated);
      onCapture(updated);
    }
  };

  const captureLocation = useCallback(() => {
    if (isReadonly) return;

    if (isFacility && !locationLabel.trim()) {
      setManualError(`Facility name is required before capturing GPS coordinates for ${surveyType.toLowerCase()} facilities.`);
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsState('UNSUPPORTED');
      return;
    }

    setGpsState('CAPTURING');
    setShowManualInputs(false);
    setManualError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        const state: GpsState = acc > 100 ? 'LOW_ACCURACY' : 'CAPTURED';
        setGpsState(state);

        const loc: LocationData = {
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(acc),
          timestamp: new Date(position.timestamp || Date.now()).toISOString(),
          label: locationLabel.trim() || `${surveyType.toUpperCase()} Location`,
          provenance: 'GPS_CAPTURED'
        };

        setCurrentLocation(loc);
        setManualLat(loc.latitude.toString());
        setManualLng(loc.longitude.toString());
        onCapture(loc);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsState('PERMISSION_DENIED');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsState('POSITION_UNAVAILABLE');
            break;
          case error.TIMEOUT:
            setGpsState('TIMEOUT');
            break;
          default:
            setGpsState('POSITION_UNAVAILABLE');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, [isReadonly, onCapture, locationLabel, surveyType, isFacility]);

  const handleManualSave = () => {
    if (isFacility && !locationLabel.trim()) {
      setManualError(`Facility name is required before saving coordinates for ${surveyType.toLowerCase()} facilities.`);
      return;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setManualError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setManualError('Longitude must be a valid number between -180 and 180');
      return;
    }

    setManualError('');
    setGpsState('MANUAL');
    const loc: LocationData = {
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      accuracy: 10, // nominal estimate for manual pin
      timestamp: new Date().toISOString(),
      label: locationLabel.trim() || `${surveyType.toUpperCase()} Location`,
      provenance: 'MANUALLY_PLACED'
    };

    setCurrentLocation(loc);
    setShowManualInputs(false);
    onCapture(loc);
  };

  const handleClearLocation = () => {
    if (isReadonly) return;
    setCurrentLocation(null);
    setGpsState('NOT_CAPTURED');
    setManualLat('');
    setManualLng('');
    if (onClear) onClear();
  };

  const getSurveyIcon = () => {
    switch (surveyType.toUpperCase()) {
      case 'EDUCATION':
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case 'HEALTH':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'GOVERNANCE':
        return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case 'HOUSEHOLD':
      default:
        return <Home className="w-5 h-5 text-[#093C22]" />;
    }
  };

  const isLocationSaved = gpsState === 'CAPTURED' || gpsState === 'LOW_ACCURACY' || gpsState === 'MANUAL';

  return (
    <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border-strong shadow-xs transition-all space-y-4">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            isLocationSaved
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-600'
              : gpsState === 'CAPTURING'
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-600'
              : ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'].includes(gpsState)
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-600'
              : 'bg-page border-border text-muted'
          }`}>
            {gpsState === 'CAPTURING' ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : isLocationSaved ? (
              getSurveyIcon()
            ) : ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'].includes(gpsState) ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <MapPin className="w-5 h-5 text-muted" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary">Field Location</h3>
              {gpsState === 'CAPTURED' && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  GPS High Accuracy
                </span>
              )}
              {gpsState === 'LOW_ACCURACY' && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Low Accuracy (±{currentLocation?.accuracy}m)
                </span>
              )}
              {gpsState === 'MANUAL' && (
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  Manually Placed
                </span>
              )}
            </div>

            <p className="text-xs text-secondary mt-0.5">
              {currentLocation ? (
                <span className="font-mono text-primary font-medium">
                  {currentLocation.latitude.toFixed(5)}°, {currentLocation.longitude.toFixed(5)}°
                  {currentLocation.accuracy ? ` (±${currentLocation.accuracy}m)` : ''}
                </span>
              ) : gpsState === 'CAPTURING' ? (
                'Acquiring satellite GPS fix...'
              ) : gpsState === 'PERMISSION_DENIED' ? (
                'Location access denied. Please allow GPS permission in your browser or enter coordinates manually.'
              ) : gpsState === 'TIMEOUT' ? (
                'GPS satellite timeout. Move to an open area or enter coordinates manually.'
              ) : (
                'Record the GPS coordinate to map this survey on your community map.'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {!isReadonly && (
          <div className="flex items-center gap-2 shrink-0">
            {gpsState === 'CAPTURING' ? (
              <div className="text-xs text-blue-600 font-semibold px-3 py-1.5 flex items-center gap-1.5 bg-blue-50 rounded-lg">
                <Loader2 size={13} className="animate-spin" />
                <span>Fixing GPS...</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={captureLocation}
                  className="px-3 py-1.5 bg-[#093C22] hover:bg-[#0c512e] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>{currentLocation ? 'Re-capture GPS' : 'Capture GPS'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInputs(!showManualInputs)}
                  className="px-2.5 py-1.5 bg-page hover:bg-surface-elevated text-primary border border-border-strong text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>{showManualInputs ? 'Close' : 'Manual'}</span>
                </button>

                {currentLocation && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    title="Remove location"
                    className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Validation / Error banner */}
      {manualError && (
        <div className="text-red-600 text-xs font-medium bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-800/40 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{manualError}</span>
        </div>
      )}

      {/* Prominent Facility Name / Household Label Input */}
      {!isReadonly && (
        <div className="pt-1">
          <label className="block text-secondary font-medium text-xs mb-1.5">
            {isFacility ? (
              <span>
                {surveyType.toUpperCase() === 'EDUCATION' ? 'School / Institution Name' :
                 surveyType.toUpperCase() === 'HEALTH' ? 'Clinic / Hospital Name' :
                 'Public Institution / Facility Name'}
                <span className="text-red-500 ml-1 font-bold">*</span>
              </span>
            ) : (
              'Household Label / Compound Note (Optional)'
            )}
          </label>
          <input
            type="text"
            data-testid="field-location-label"
            placeholder={
              isFacility
                ? `e.g. ${surveyType.toUpperCase() === 'EDUCATION' ? 'Methodist Primary School' : surveyType.toUpperCase() === 'HEALTH' ? 'Ejisu Community Health Post' : 'Town Council / Chief Palace'}`
                : 'e.g. House 14, Methodist School'
            }
            value={locationLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full px-3 py-2 bg-page border border-border-strong rounded-lg text-primary text-xs focus:outline-none focus:ring-1 focus:ring-[#093C22]"
          />
        </div>
      )}

      {/* Manual Coordinate Entry Drawer */}
      {showManualInputs && !isReadonly && (
        <div className="p-3.5 bg-page rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
          <div className="font-semibold text-primary">Enter Coordinates Directly</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-secondary font-medium mb-1">Latitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 5.6037"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
              />
            </div>
            <div>
              <label className="block text-secondary font-medium mb-1">Longitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. -0.1870"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-border-strong rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-[#093C22]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowManualInputs(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-surface font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-1.5 rounded-lg bg-[#093C22] text-white hover:bg-[#0c512e] font-semibold shadow-2xs"
            >
              Apply Coordinates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
