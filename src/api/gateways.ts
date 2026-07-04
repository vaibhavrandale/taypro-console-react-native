import { apiFetch } from "./client";
import type {
  Gateway,
  GatewaysBySiteResponse,
  MongoDateValue,
  MongoIdValue,
  RawGateway,
} from "../types/gateway";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeId(value?: MongoIdValue): string | undefined {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$oid === "string") return value.$oid;
  return undefined;
}

function normalizeDate(value?: MongoDateValue): string | null | undefined {
  if (value == null) return value;
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.$date === "string") return value.$date;
  return undefined;
}

function normalizeCoordinate(
  value?: number | string | null,
): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeGateway(gateway: RawGateway): Gateway {
  const raw = gateway as Record<string, unknown>;

  return {
    ...gateway,
    _id: normalizeId(gateway._id),
    gateway_lattitude:
      normalizeCoordinate(gateway.gateway_lattitude) ??
      normalizeCoordinate(
        raw.gateway_latitude as string | number | undefined,
      ) ??
      normalizeCoordinate(raw.latitude as string | number | undefined),
    gateway_longitude:
      normalizeCoordinate(gateway.gateway_longitude) ??
      normalizeCoordinate(raw.longitude as string | number | undefined),
    gateway_simnumber: normalizeCoordinate(gateway.gateway_simnumber),
    last_uplink: normalizeDate(gateway.last_uplink) ?? null,
    createdAt: normalizeDate(gateway.createdAt) ?? undefined,
    updatedAt: normalizeDate(gateway.updatedAt) ?? undefined,
  };
}

export async function fetchGatewaysBySite(siteId: string): Promise<Gateway[]> {
  const response = await apiFetch(
    `/gateways/site/${encodeURIComponent(siteId)}`,
  );

  const text = await response.text();
  let result: GatewaysBySiteResponse | null = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!response.ok) {
    const errorPayload = isRecord(result) ? result : {};
    throw new Error(
      String(
        errorPayload.message ??
          errorPayload.error ??
          `Failed to load gateways (${response.status})`,
      ),
    );
  }

  if (!Array.isArray(result?.data)) {
    if (__DEV__) {
      console.log("[gateways] unexpected response shape", {
        siteId,
        status: response.status,
        result,
      });
    }
    return [];
  }

  const normalized = result.data.map(normalizeGateway);

  // if (__DEV__) {
  //   console.log('[gateways] GET /gateways/site/:siteId response', {
  //     siteId,
  //     status: response.status,
  //     count: normalized.length,
  //     raw: result,
  //     normalized: normalized.map((gateway) => ({
  //       gateway_id: gateway.gateway_id,
  //       gateway_name: gateway.gateway_name,
  //       gateway_id_in_lns_server: gateway.gateway_id_in_lns_server,
  //       gateway_lattitude: gateway.gateway_lattitude,
  //       gateway_longitude: gateway.gateway_longitude,
  //       gateway_status: gateway.gateway_status,
  //       gateway_type: gateway.gateway_type,
  //       last_uplink: gateway.last_uplink,
  //     })),
  //   });
  // }

  return normalized;
}
