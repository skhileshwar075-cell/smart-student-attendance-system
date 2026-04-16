import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out.',
        };
        setError(messages[err.code] || 'Failed to get location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isWithinRadius = (targetLat, targetLng, radiusMeters) => {
    if (!location) return null;
    return getDistance(location.lat, location.lng, targetLat, targetLng) <= radiusMeters;
  };

  return { location, error, loading, getLocation, getDistance, isWithinRadius };
}
