import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle, Navigation } from 'lucide-react';

export type GpsState = 'NOT_CAPTURED' | 'CAPTURING' | 'CAPTURED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'LOW_ACCURACY';

interface GpsCaptureProps {
  onCapture: (location: { latitude: number, longitude: number, accuracy: number, timestamp: string }) => void;
  isReadonly?: boolean;
  initialCaptured?: boolean;
}

export default function GpsCapture({ onCapture, isReadonly, initialCaptured }: GpsCaptureProps) {
  const [gpsState, setGpsState] = useState<GpsState>(initialCaptured ? 'CAPTURED' : 'NOT_CAPTURED');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Initial state covers initialCaptured

  const captureLocation = useCallback(() => {
    if (isReadonly) return;
    
    if (!('geolocation' in navigator)) {
      setGpsState('UNSUPPORTED');
      return;
    }

    setGpsState('CAPTURING');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setAccuracy(acc);

        if (acc > 100) {
          // If accuracy is worse than 100 meters, we still capture it but warn the user.
          setGpsState('LOW_ACCURACY');
        } else {
          setGpsState('CAPTURED');
        }

        onCapture({
          latitude,
          longitude,
          accuracy: acc,
          timestamp: new Date(position.timestamp || Date.now()).toISOString()
        });
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
        maximumAge: 0 // Do not use stale cache
      }
    );
  }, [isReadonly, onCapture]);

  if (isReadonly && gpsState === 'NOT_CAPTURED') {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          gpsState === 'CAPTURED' ? 'bg-emerald-100 text-emerald-600' :
          gpsState === 'LOW_ACCURACY' ? 'bg-amber-100 text-amber-600' :
          gpsState === 'CAPTURING' ? 'bg-blue-100 text-blue-600' :
          ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'].includes(gpsState) ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-500'
        }`}>
          {gpsState === 'CAPTURING' ? <Loader2 size={20} className="animate-spin" /> : 
           gpsState === 'CAPTURED' || gpsState === 'LOW_ACCURACY' ? <CheckCircle size={20} /> :
           ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT', 'UNSUPPORTED'].includes(gpsState) ? <AlertCircle size={20} /> :
           <MapPin size={20} />}
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            Location
            {gpsState === 'CAPTURED' && <span className="text-emerald-600 text-xs font-medium">Captured</span>}
            {gpsState === 'LOW_ACCURACY' && <span className="text-amber-600 text-xs font-medium">Low Accuracy</span>}
          </h3>
          
          <p className="text-xs text-gray-500">
            {gpsState === 'NOT_CAPTURED' && 'Not captured yet'}
            {gpsState === 'CAPTURING' && 'Getting your location...'}
            {(gpsState === 'CAPTURED' || gpsState === 'LOW_ACCURACY') && accuracy && `Accuracy: ~${Math.round(accuracy)}m`}
            {gpsState === 'PERMISSION_DENIED' && 'Location permission denied.'}
            {gpsState === 'POSITION_UNAVAILABLE' && "Couldn't get your location."}
            {gpsState === 'TIMEOUT' && 'Location request timed out.'}
            {gpsState === 'UNSUPPORTED' && 'Location not supported by your browser.'}
          </p>
        </div>
      </div>
      
      {!isReadonly && gpsState !== 'CAPTURING' && (
        <button
          type="button"
          onClick={captureLocation}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#093C22] transition-colors"
        >
          <Navigation size={16} />
          {gpsState === 'NOT_CAPTURED' ? 'Capture location' : 'Try again'}
        </button>
      )}
    </div>
  );
}
