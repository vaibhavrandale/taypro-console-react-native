import { API_BASE_URL } from './api';

/** Socket server origin (API host without `/api/v1`). */
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
