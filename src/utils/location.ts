import * as Location from 'expo-location';

export type UserMapLocation = {
  latitude: number;
  longitude: number;
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
