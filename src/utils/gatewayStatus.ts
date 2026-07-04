import type { BadgeVariant } from '../components/ui/Badge';
import { formatDateTimeIST } from './datetime';

export function normalizeGatewayStatus(status?: string | boolean | null): string {
  if (status === true) return 'online';
  if (status === false) return 'offline';
  if (typeof status === 'string') return status.toLowerCase().trim();
  return '';
}

export function isGatewayOnline(status?: string | boolean | null): boolean {
  const value = normalizeGatewayStatus(status);
  return value.includes('online') || value === 'active' || value === 'true';
}

export function getGatewayStatusLabel(status?: string | boolean | null): string {
  if (status === true) return 'Online';
  if (status === false) return 'Offline';
  if (typeof status === 'string' && status.trim()) {
    const value = status.toLowerCase();
    if (value === 'true' || value.includes('online') || value === 'active') {
      return 'Online';
    }
    if (
      value === 'false' ||
      value.includes('offline') ||
      value === 'inactive'
    ) {
      return 'Offline';
    }
    return status;
  }
  return 'Unknown';
}

export function getGatewayStatusVariant(
  status?: string | boolean | null,
): BadgeVariant {
  const value = normalizeGatewayStatus(status);
  if (!value) return 'neutral';
  if (value.includes('online') || value === 'active' || value === 'true') {
    return 'success';
  }
  if (value.includes('offline') || value === 'inactive' || value === 'false') {
    return 'neutral';
  }
  if (value.includes('error') || value.includes('fail')) return 'error';
  return 'info';
}

export function formatGatewayUplink(value?: string | null): string {
  if (!value) return 'No uplink yet';
  return formatDateTimeIST(value);
}
