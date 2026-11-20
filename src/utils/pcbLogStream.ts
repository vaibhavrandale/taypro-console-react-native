export const PCB_LOG_FLUSH_MS = 150;
export const PCB_LOG_FLUSH_CHARS = 2000;

const ROBOT_NO = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,63}$/;

export type PcbLogUser = {
  username: string;
  role: string;
  email: string;
};

export type PcbLogOpen = {
  robotNo: string;
  deveui: string;
  loraNo: string;
  room: string;
  user: PcbLogUser | null;
};

export type PcbLogEvent =
  | { type: "start"; session: PcbLogOpen }
  | { type: "chunk"; robotNo: string; text: string }
  | { type: "stop"; robotNo: string };

export function pcbLogRobotNo(value: string): string | null {
  const id = value.trim();
  if (!ROBOT_NO.test(id)) return null;
  return id;
}

export function createPcbLogSender(emit: (event: PcbLogEvent) => void) {
  let robotNo = "";
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let live = false;

  function takeFullSlices() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!live || !robotNo) {
      buffer = "";
      return;
    }
    while (buffer.length >= PCB_LOG_FLUSH_CHARS) {
      emit({ type: "chunk", robotNo, text: buffer.slice(0, PCB_LOG_FLUSH_CHARS) });
      buffer = buffer.slice(PCB_LOG_FLUSH_CHARS);
    }
  }

  function flushAll() {
    takeFullSlices();
    if (!live || !robotNo || !buffer) return;
    const text = buffer;
    buffer = "";
    emit({ type: "chunk", robotNo, text });
  }

  function stop() {
    flushAll();
    if (live && robotNo) emit({ type: "stop", robotNo });
    live = false;
    robotNo = "";
    buffer = "";
  }

  function start(next: string | PcbLogOpen) {
    stop();
    const source = typeof next === "string" ? { robotNo: next, deveui: "", loraNo: "", room: "", user: null } : next;
    robotNo = pcbLogRobotNo(source.robotNo) ?? "";
    live = robotNo.length > 0;
    if (!live) return;
    emit({
      type: "start",
      session: {
        robotNo,
        deveui: source.deveui,
        loraNo: source.loraNo,
        room: `pcb-log:${robotNo}`,
        user: source.user,
      },
    });
  }

  function push(chunk: string) {
    if (!live || !chunk) return;
    buffer += chunk;
    if (buffer.length >= PCB_LOG_FLUSH_CHARS) {
      takeFullSlices();
      if (buffer && !timer) timer = setTimeout(flushAll, PCB_LOG_FLUSH_MS);
      return;
    }
    if (!timer) timer = setTimeout(flushAll, PCB_LOG_FLUSH_MS);
  }

  return { start, push, stop };
}
