import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { appAlert } from './appAlert';

export type AttendanceLocationPermissionResult = {
  foreground: boolean;
  background: boolean;
};

function openAppSettings() {
  if (Platform.OS === 'ios') {
    void Linking.openURL('app-settings:');
    return;
  }
  void Linking.openSettings();
}

function showAlwaysPermissionRationale(): Promise<boolean> {
  return new Promise((resolve) => {
    appAlert(
      'Allow location all the time',
      'Please choose “Allow all the time” so attendance continues to work correctly if you switch apps while punched in.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
    );
  });
}

function showOpenSettingsForAlways(): void {
  appAlert(
    'Enable “Allow all the time”',
    'Open Settings → Location → Allow all the time so attendance keeps working when you leave the app.',
    [
      { text: 'Later', style: 'cancel' },
      { text: 'Open Settings', onPress: openAppSettings },
    ],
  );
}

/**
 * Foreground first, then Always / “Allow all the time” for punch tracking.
 * Call this wherever attendance needs the user's location.
 */
export async function requestAttendanceLocationPermissions(options?: {
  /** Show Settings hint when Always was denied. Default true. */
  promptSettingsIfDenied?: boolean;
}): Promise<AttendanceLocationPermissionResult> {
  const promptSettings = options?.promptSettingsIfDenied !== false;

  const currentForeground = await Location.getForegroundPermissionsAsync();
  let foregroundGranted = currentForeground.granted;

  if (!foregroundGranted) {
    const foreground = await Location.requestForegroundPermissionsAsync();
    foregroundGranted = foreground.granted;
  }

  if (!foregroundGranted) {
    return { foreground: false, background: false };
  }

  const currentBackground = await Location.getBackgroundPermissionsAsync();
  if (currentBackground.granted) {
    return { foreground: true, background: true };
  }

  if (AppState.currentState !== 'active') {
    return { foreground: true, background: false };
  }

  const shouldAsk = await showAlwaysPermissionRationale();
  if (!shouldAsk) {
    return { foreground: true, background: false };
  }

  try {
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.granted) {
      return { foreground: true, background: true };
    }

    if (promptSettings) {
      showOpenSettingsForAlways();
    }
  } catch {
    if (promptSettings) {
      showOpenSettingsForAlways();
    }
  }

  return { foreground: true, background: false };
}
