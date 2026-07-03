import { apiFetch } from "./client";
import {
  RobotCommand,
  RobotOperatingDetails,
  SendMqttDownlinkBody,
  SendMqttDownlinkResponse,
  SendMqttMulticastDownlinkBody,
} from "../types/robotOperating";
import {
  BlockRobotSummary,
  GatewaysAndRobotsData,
  SearchGateway,
  SearchRobot,
} from "../types/robotSearch";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload : {};
    throw new Error(
      String(
        errorPayload.message ??
          errorPayload.error ??
          `Request failed (${response.status})`,
      ),
    );
  }

  // if (__DEV__ && isRecord(payload)) {
  //   console.log('[api] response keys:', Object.keys(payload));
  // }

  return payload;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeGatewaysAndRobots(payload: unknown): GatewaysAndRobotsData {
  if (!isRecord(payload)) {
    return { robots: [], gateways: [] };
  }

  const nested = isRecord(payload.data) ? payload.data : payload;

  return {
    robots: asArray<SearchRobot>(nested.robots),
    gateways: asArray<SearchGateway>(nested.gateways),
  };
}

function normalizeBlockRobots(payload: unknown): BlockRobotSummary[] {
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.data)) {
    return payload.data as BlockRobotSummary[];
  }

  if (Array.isArray(payload.robots)) {
    return payload.robots as BlockRobotSummary[];
  }

  return [];
}

function normalizeRobotDetails(payload: unknown): RobotOperatingDetails {
  if (!isRecord(payload)) {
    throw new Error("No robot data returned");
  }

  if (isRecord(payload.data)) {
    return payload.data as RobotOperatingDetails;
  }

  return payload as RobotOperatingDetails;
}

function getCommandPayload(command: RobotCommand) {
  const payloads: Record<RobotCommand, string> = {
    start: "11",
    stop: "14",
    return: "15",
  };

  return payloads[command];
}

function normalizeCommandResponse(payload: unknown): SendMqttDownlinkResponse {
  if (!isRecord(payload)) return {};

  return {
    success: typeof payload.success === "boolean" ? payload.success : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    data: payload.data,
  };
}

export async function fetchGatewaysAndRobots(): Promise<GatewaysAndRobotsData> {
  const response = await apiFetch("/robots/get-gateways-and-robots");
  const payload = await parseJson(response);
  const normalized = normalizeGatewaysAndRobots(payload);

  // if (__DEV__) {
  //   console.log("[search] gateways-and-robots", {
  //     robots: normalized.robots.length,
  //     gateways: normalized.gateways.length,
  //   });
  // }

  return normalized;
}

export async function fetchRobotsBySiteAndBlock(siteId: string, block: string) {
  const encodedSite = encodeURIComponent(siteId);
  const encodedBlock = encodeURIComponent(block);
  const response = await apiFetch(
    `/robots/get-robotsno-by-site-and-block/${encodedSite}/${encodedBlock}`,
  );
  const payload = await parseJson(response);
  return normalizeBlockRobots(payload);
}

export async function fetchRobotByRobotNo(robotNo: string) {
  const encoded = encodeURIComponent(robotNo);
  const response = await apiFetch(
    `/robots/get-robot-using-robot-no/${encoded}`,
  );
  const payload = await parseJson(response);
  return normalizeRobotDetails(payload);
}

export async function sendMqttDownlink(
  command: RobotCommand,
  robot: Pick<
    RobotOperatingDetails,
    "deveui" | "lora_no" | "robot_no" | "site_id"
  >,
) {
  if (
    !robot.deveui ||
    robot.lora_no == null ||
    !robot.robot_no ||
    !robot.site_id
  ) {
    throw new Error("Missing robot command details");
  }

  const body: SendMqttDownlinkBody = {
    deveui: robot.deveui,
    lora_no: robot.lora_no,
    payload: getCommandPayload(command),
    robot_no: robot.robot_no,
    site_id: robot.site_id,
  };

  const response = await apiFetch("/robots/send-mqtt-downlink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);
  return normalizeCommandResponse(payload);
}

export async function sendMqttMulticastDownlink(
  command: RobotCommand,
  params: {
    siteId: string;
    block: string;
    robots: Array<Pick<BlockRobotSummary, "deveui" | "robot_no">>;
  },
) {
  const deveui: string[] = [];
  const robot_no: string[] = [];

  for (const robot of params.robots) {
    if (robot.deveui && robot.robot_no) {
      deveui.push(robot.deveui);
      robot_no.push(robot.robot_no);
    }
  }

  if (!deveui.length) {
    throw new Error("No robots with command details");
  }

  const body: SendMqttMulticastDownlinkBody = {
    site_id: params.siteId,
    block: params.block,
    command: getCommandPayload(command),
    deveui,
    robot_no,
  };

  const response = await apiFetch("/robots/send-mqtt-multicast-downlink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);
  return normalizeCommandResponse(payload);
}
