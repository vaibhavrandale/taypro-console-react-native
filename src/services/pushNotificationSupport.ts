import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';

export const ROBOT_ALERTS_CHANNEL_ID = 'robot-alerts';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Remote push is not available in Expo Go on Android (SDK 53+). */
export function isRemotePushSupported(): boolean {
  if (!Device.isDevice) return false;
  if (Platform.OS === 'android' && isExpoGo()) return false;
  return true;
}
