"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Office coordinates: 28.44388735° N, 77.05672206834356° E
const OFFICE_LAT = 28.44388735;
const OFFICE_LNG = 77.05672206834356;
const GEOFENCE_RADIUS = 1000; // 1km in meters

// Component to update map center when location changes
function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    const centerArray = Array.isArray(center) ? center : [center.lat, center.lng];
    map.setView(centerArray as [number, number], 15);
  }, [map, center]);
  return null;
}

interface LocationCheckInProps {
  onCheckIn: (mode: 'office' | 'remote') => void;
  currentLocation?: { lat: number; lng: number };
  isLoading?: boolean;
}

export default function LocationCheckIn({ 
  onCheckIn, 
  currentLocation, 
  isLoading = false 
}: LocationCheckInProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(currentLocation || null);
  const [locationError, setLocationError] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(!currentLocation);
  const [detectedMode, setDetectedMode] = useState<'office' | 'remote'>('remote');

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get current location and determine mode
  useEffect(() => {
    if (currentLocation) {
      setLocation(currentLocation);
      setIsDetecting(false);
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        OFFICE_LAT,
        OFFICE_LNG
      );
      setDetectedMode(distance <= GEOFENCE_RADIUS ? 'office' : 'remote');
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Location not available');
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = { lat: latitude, lng: longitude };
        setLocation(userLocation);
        
        // Calculate distance to office
        const distance = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setDetectedMode(distance <= GEOFENCE_RADIUS ? 'office' : 'remote');
        setIsDetecting(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Location unavailable');
        setDetectedMode('remote'); // Default to remote if location fails
        setIsDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [currentLocation]);

  const mapCenter: LatLngExpression = location 
    ? [location.lat, location.lng] 
    : [OFFICE_LAT, OFFICE_LNG];

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Current Location</p>
        <h3 className="text-2xl font-bold text-foreground dark:text-foreground">
          {isDetecting ? 'Detecting...' : detectedMode === 'office' ? 'Main Office - Entrance Gate' : 'Remote Location'}
        </h3>
      </div>

      {/* Map Container */}
      <div className="w-full h-64 rounded-xl overflow-hidden border border-border/50 dark:border-border elevation-md">
        {location ? (
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapUpdater center={mapCenter} />
            
            {/* Office marker */}
            <Marker 
              position={[OFFICE_LAT, OFFICE_LNG]}
              icon={L.divIcon({
                className: 'custom-office-marker',
                html: `<div style="
                  width: 20px;
                  height: 20px;
                  background-color: #8b5cf6;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })}
            />
            
            {/* User location marker */}
            <Marker 
              position={[location.lat, location.lng]}
              icon={L.divIcon({
                className: 'custom-user-marker',
                html: `<div style="
                  width: 16px;
                  height: 16px;
                  background-color: #3b82f6;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
            
            {/* Geofence circle */}
            <Circle
              center={[OFFICE_LAT, OFFICE_LNG]}
              radius={GEOFENCE_RADIUS}
              pathOptions={{
                color: '#60a5fa',
                fillColor: '#60a5fa',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted dark:bg-muted">
            {isDetecting ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Detecting location...</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{locationError || 'Location unavailable'}</p>
            )}
          </div>
        )}
      </div>

      {/* Check In Button */}
      <button
        onClick={() => onCheckIn(detectedMode)}
        disabled={isDetecting || isLoading || !location}
        className="w-full h-14 bg-black dark:bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center elevation-lg button-press"
      >
        {isDetecting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Detecting...
          </>
        ) : isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Checking in...
          </>
        ) : (
          'Check in'
        )}
      </button>
    </div>
  );
}

