import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { downloadCleaningLogsPdf } from '../api/cleaningLogs';

/** Old SAF Downloads-tree URI — not writable on many Androids. Drop it. */
const LEGACY_SAF_DIR_KEY = 'cleaning_logs_downloads_saf_uri';

type SaveFileFn = (options: {
  name: string;
  type: string;
  data: string;
  encoding?: 'base64' | 'utf8';
}) => Promise<{ cancelled: true } | { cancelled: false; uri: string }>;

type DownloadsApi = {
  saveFile: SaveFileFn;
  getPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
};

function bytesToBase64(bytes: Uint8Array) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < len ? chars[(triplet >> 6) & 63] : '=';
    result += i + 2 < len ? chars[triplet & 63] : '=';
  }
  return result;
}

/**
 * expo-downloads throws at require-time when the native module is not in the
 * binary (Expo Go / old dev client). Never import it at top-level.
 */
function getDownloadsApi(): DownloadsApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-downloads') as DownloadsApi;
    if (typeof mod?.saveFile !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

async function saveViaShareSheet(base64: string, fileName: string) {
  if (!FileSystem.cacheDirectory) {
    throw new Error('Cache directory is unavailable');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  const destination = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(destination, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Save cleaning logs PDF',
  });
  return destination;
}

async function saveToAndroidDownloads(base64: string, fileName: string) {
  await AsyncStorage.removeItem(LEGACY_SAF_DIR_KEY);

  const downloads = getDownloadsApi();
  if (!downloads) {
    await saveViaShareSheet(base64, fileName);
    return { path: null as string | null, method: 'share' as const };
  }

  try {
    const current = await downloads.getPermissionsAsync();
    if (!current.granted) {
      const next = await downloads.requestPermissionsAsync();
      if (!next.granted) {
        throw new Error('Storage permission is required to save to Downloads');
      }
    }

    const result = await downloads.saveFile({
      name: fileName,
      type: 'application/pdf',
      data: base64,
      encoding: 'base64',
    });

    if (result.cancelled) {
      throw new Error('Download was cancelled');
    }

    return { path: result.uri, method: 'downloads' as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/native module|Downloads|not linked|Unavailability/i.test(message)) {
      await saveViaShareSheet(base64, fileName);
      return { path: null as string | null, method: 'share' as const };
    }
    throw err;
  }
}

async function saveToIosDocuments(base64: string, fileName: string) {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is unavailable');
  }
  const destination = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destination;
}

/** Download cleaning-logs PDF from backend and save to device storage. */
export async function exportCleaningLogsPdf(options: {
  siteName: string;
  siteId: string;
  date: string;
}) {
  const { bytes, fileName } = await downloadCleaningLogsPdf({
    siteId: options.siteId,
    siteName: options.siteName,
    date: options.date,
  });
  const base64 = bytesToBase64(bytes);

  if (Platform.OS === 'android') {
    const result = await saveToAndroidDownloads(base64, fileName);
    return {
      saved: true as const,
      fileName,
      path: result.path,
      method: result.method,
    };
  }

  const path = await saveToIosDocuments(base64, fileName);
  return {
    saved: true as const,
    fileName,
    path,
    method: 'downloads' as const,
  };
}
