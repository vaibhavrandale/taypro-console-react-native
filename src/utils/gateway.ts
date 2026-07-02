import { SiteGateway, SiteRobot } from '../types/siteDetails';
import { GeoPoint, isValidGeoPoint, normalizeLatLngPair } from './geo';

export type GatewayMapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status?: string | boolean;
  robotCount: number;
  source: 'gateway' | 'robots';
};

function getGatewayCoords(gateway: SiteGateway): GeoPoint | null {
  const fromLocation = gateway.location;
  if (fromLocation) {
    const normalized = normalizeLatLngPair(
      fromLocation.latitude,
      fromLocation.longitude,
    );
    if (normalized) {
      return { ...normalized, mapUrl: fromLocation.map_url };
    }
  }

  const normalized = normalizeLatLngPair(
    gateway.gateway_lattitude,
    gateway.gateway_longitude,
  );
  if (!normalized) return null;
  return normalized;
}

function getRobotCoords(robot: SiteRobot): GeoPoint | null {
  if (!robot.location) return null;
  const normalized = normalizeLatLngPair(
    robot.location.latitude,
    robot.location.longitude,
  );
  if (!normalized) return null;
  return { ...normalized, mapUrl: robot.location.map_url };
}

function buildRobotCentroids(robots: SiteRobot[]) {
  const groups = new Map<string, { latSum: number; lngSum: number; count: number }>();

  for (const robot of robots) {
    const gatewayId = robot.last_gateway?.trim();
    const coords = getRobotCoords(robot);
    if (!gatewayId || !coords || !isValidGeoPoint(coords)) continue;

    const current = groups.get(gatewayId) ?? { latSum: 0, lngSum: 0, count: 0 };
    current.latSum += coords.latitude;
    current.lngSum += coords.longitude;
    current.count += 1;
    groups.set(gatewayId, current);
  }

  const centroids = new Map<string, GeoPoint>();
  for (const [gatewayId, group] of groups) {
    if (group.count === 0) continue;
    centroids.set(gatewayId, {
      latitude: group.latSum / group.count,
      longitude: group.lngSum / group.count,
    });
  }

  return centroids;
}

export function buildGatewayMapPoints(
  gateways: SiteGateway[],
  robots: SiteRobot[] = [],
): GatewayMapPoint[] {
  const robotCentroids = buildRobotCentroids(robots);
  const points: GatewayMapPoint[] = [];

  for (const gateway of gateways) {
    const id = gateway.gateway_id_in_lns_server;
    const name =
      gateway.gateway_name ||
      gateway.gateway_name_in_lns_server ||
      id ||
      'Gateway';

    const directCoords = getGatewayCoords(gateway);
    const fallbackCoords = id ? robotCentroids.get(id) : undefined;
    const coords = directCoords ?? fallbackCoords;

    if (!coords || !isValidGeoPoint(coords)) continue;

    points.push({
      id: id || `${coords.latitude}-${coords.longitude}`,
      name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      status: gateway.gateway_status,
      robotCount: gateway.robot_count ?? 0,
      source: directCoords ? 'gateway' : 'robots',
    });
  }

  return points;
}
