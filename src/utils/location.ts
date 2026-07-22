import * as Location from 'expo-location';

export type UserMapLocation = {
  latitude: number;
  longitude: number;
};

export type PhotoWatermarkMeta = {
  lat: string;
  lng: string;
  address: string;
  timestamp: string;
};

export async function getCurrentUserLocation(): Promise<UserMapLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Location permission is required to show your position.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function formatIstTimestamp(date = new Date()) {
  return date.toLocaleString('en-IN', {
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/** Lat/lng + reverse-geocoded address for PM photo watermarks. */
export async function getPhotoWatermarkMeta(): Promise<PhotoWatermarkMeta> {
  const timestamp = formatIstTimestamp();

  try {
    const { latitude, longitude } = await getCurrentUserLocation();
    const lat = latitude.toFixed(6);
    const lng = longitude.toFixed(6);

    try {
      const places = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const place = places[0];
      const address = place
        ? [place.name, place.street, place.city, place.region, place.postalCode]
            .filter(Boolean)
            .join(', ') || 'Unknown location'
        : 'Unknown location';

      return { lat, lng, address, timestamp };
    } catch {
      return { lat, lng, address: 'Location not available', timestamp };
    }
  } catch {
    return {
      lat: 'N/A',
      lng: 'N/A',
      address: 'Location not available',
      timestamp,
    };
  }
}
