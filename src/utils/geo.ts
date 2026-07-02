export type GeoPoint = {
  latitude: number;
  longitude: number;
  mapUrl?: string;
};

export function parseCoordinate(value?: number | string | null): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Values that are typically latitude for Taypro solar sites (India and similar). */
function looksLikeLatitude(value: number) {
  return Math.abs(value) <= 90 && Math.abs(value) <= 40;
}

/** Values that are typically longitude for Taypro solar sites. */
function looksLikeLongitude(value: number) {
  return Math.abs(value) <= 180 && Math.abs(value) > 40;
}

/**
 * API fields are often mislabeled (`gateway_lattitude` holds longitude).
 * Detect swap using valid ranges and typical India/site coordinate shapes.
 */
export function normalizeLatLngPair(
  first: number | string | null | undefined,
  second: number | string | null | undefined,
): GeoPoint | null {
  const a = parseCoordinate(first);
  const b = parseCoordinate(second);
  if (a == null || b == null) return null;

  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return { latitude: b, longitude: a };
  }

  if (Math.abs(b) > 90 && Math.abs(a) <= 90) {
    return { latitude: a, longitude: b };
  }

  if (looksLikeLongitude(a) && looksLikeLatitude(b)) {
    return { latitude: b, longitude: a };
  }

  if (looksLikeLatitude(a) && looksLikeLongitude(b)) {
    return { latitude: a, longitude: b };
  }

  return { latitude: a, longitude: b };
}

export function isValidGeoPoint(point?: GeoPoint | null): point is GeoPoint {
  if (!point) return false;
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
