import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './client';
import {
  isSessionExpiredPayload,
  notifySessionExpired,
} from '../utils/sessionExpiry';

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
  options?: { type?: string; name?: string },
): Promise<string> {
  const token = await getAuthToken();
  const form = new FormData();
  form.append('file', {
    uri: normalizeUploadUri(localUri),
    type: options?.type ?? 'image/jpeg',
    name: options?.name ?? 'captured.jpg',
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
        if (
          xhr.status === 401 ||
          isSessionExpiredPayload(errorPayload)
        ) {
          notifySessionExpired();
        }
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

export async function uploadPreventiveMaintenanceImage(
  localUri: string,
): Promise<string> {
  // API path spelling matches backend (maintanance).
  return uploadImageToPath(localUri, '/image-upload/preventive-maintanance');
}

function guessMimeAndName(uri: string, mimeType?: string | null) {
  const path = uri.split('?')[0].toLowerCase();
  if (mimeType) {
    const ext =
      mimeType === 'application/pdf'
        ? 'pdf'
        : mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    return { type: mimeType, name: `expense-claim.${ext}` };
  }
  if (path.endsWith('.pdf')) {
    return { type: 'application/pdf', name: 'expense-claim.pdf' };
  }
  if (path.endsWith('.png')) {
    return { type: 'image/png', name: 'expense-claim.png' };
  }
  return { type: 'image/jpeg', name: 'expense-claim.jpg' };
}

export async function uploadExpenseClaimFile(
  localUri: string,
  mimeType?: string | null,
): Promise<string> {
  return uploadImageToPath(
    localUri,
    '/image-upload/expense-claim',
    guessMimeAndName(localUri, mimeType),
  );
}
