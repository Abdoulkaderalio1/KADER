/**
 * Geolocation utilities: Haversine distance, relative bearing, and privacy coordinate fuzzing.
 */

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function calculateBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const y = Math.sin(toRadians(lng2 - lng1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lng2 - lng1));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Fuzzes exact GPS coordinates by ~1.3 km so personal addresses are never exposed publicly.
 */
export function fuzzCoordinates(lat: number, lng: number, seedStr: string): { latApprox: number; lngApprox: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 360;
  }
  const angle = toRadians(hash);
  const offsetDeg = 0.012; // ~1.3 km
  return {
    latApprox: Number((lat + Math.cos(angle) * offsetDeg).toFixed(4)),
    lngApprox: Number((lng + Math.sin(angle) * offsetDeg).toFixed(4)),
  };
}

export function formatDistanceLabel(km: number): string {
  if (km < 1) {
    return `${Math.max(100, Math.round(km * 1000))} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}
