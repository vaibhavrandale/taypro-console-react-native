import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './client';

const UPLOAD_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUploadUri(uri: string) {
  if (
    Platform.OS === 'android' &&
    uri.startsWith('/') &&
    !uri.startsWith('file://')
  ) {
    return `file://${uri}`;
  }
  return uri;
}

/**
 * Multipart upload via XMLHttpRequest — React Native's fetch (Expo 57) does not
 * support the { uri, type, name } FormData parts that multer expects.
 */
async function uploadImageToPath(
  localUri: string,
  path: string,
): Promise<string> {
  const token = await getAuthToken();
  const form = new FormData();
  form.append('file', {
    uri: normalizeUploadUri(localUri),
    type: 'image/jpeg',
    name: 'captured.jpg',
  } as unknown as Blob);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeout = setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timed out. Please try again.'));
    }, UPLOAD_TIMEOUT_MS);

    xhr.onload = () => {
      clearTimeout(timeout);

      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        reject(new Error('Invalid response from server'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const errorPayload = isRecord(payload) ? payload : {};
        reject(
          new Error(
            String(errorPayload.error ?? errorPayload.message ?? 'Upload failed'),
          ),
        );
        return;
      }

      if (isRecord(payload) && typeof payload.url === 'string') {
        resolve(payload.url);
        return;
      }

      reject(new Error('Upload succeeded but no image URL was returned'));
    };

    xhr.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Network error during upload'));
    };

    xhr.onabort = () => {
      clearTimeout(timeout);
      reject(new Error('Upload was cancelled'));
    };

    xhr.open('POST', `${API_BASE_URL}${path}`);
    xhr.withCredentials = false;
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    // Do not set Content-Type — XHR sets multipart boundary automatically.
    xhr.send(form);
  });
}

export async function uploadUserImage(localUri: string): Promise<string> {
  return uploadImageToPath(localUri, '/image-upload/user-images');
}

export async function uploadServiceTicketImage(
  localUri: string,
): Promise<string> {
  return uploadImageToPath(localUri, '/image-upload/service-tickets');
}
