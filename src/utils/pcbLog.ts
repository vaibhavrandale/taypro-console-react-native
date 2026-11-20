export type PcbVerdict = "no-data" | "busy" | "join-failed" | "joined" | "alive";

export type PcbReading = {
  verdict: PcbVerdict;
  title: string;
  detail: string;
};

const CLASS_A =
  " Class A in this log is only the join step. The robot still runs as Class C after it joins.";

export function classifyPcbLog(raw: string): PcbReading {
  const text = raw.trim();
  if (!text) {
    return {
      verdict: "no-data",
      title: "No log",
      detail:
        "The lead is on the wrong pins, or the main board is not running. Check TX, RX, DTR, and GND. Leave the 5 V pin off.",
    };
  }

  const classNote = /Class A was not set/i.test(text) ? CLASS_A : "";

  if (/Network joined/i.test(text)) {
    return {
      verdict: "joined",
      title: "PCB is working",
      detail: `The module joined the network. Wait for the join row on the server. Do not replace this board.${classNote}`,
    };
  }

  if (/LoRaWAN modem is busy|JOIN failed - timeout/i.test(text)) {
    return {
      verdict: "busy",
      title: "PCB is alive",
      detail: `The firmware started a second join before the first one finished. Power-cycle the robot and read the log again before changing the PCB.${classNote}`,
    };
  }

  if (/\+JOIN:\s*Join failed/i.test(text)) {
    return {
      verdict: "join-failed",
      title: "Join did not complete",
      detail: `The module sent a join and heard no answer. Swap the antenna with a robot on the same gateway. Change the PCB only if that antenna also produces no join.${classNote}`,
    };
  }

  if (/Firmware\s+\d/i.test(text)) {
    return {
      verdict: "alive",
      title: "Main board is running",
      detail: `The log started. Keep the cable on through one reset so the join lines arrive.${classNote}`,
    };
  }

  return {
    verdict: "alive",
    title: "Port is live",
    detail: `Bytes are arriving. Reset the robot and wait for the join lines.${classNote}`,
  };
}

export function hexToText(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code === 10 || code === 13 || (code >= 32 && code < 127)) {
      out += String.fromCharCode(code);
    }
  }
  return out;
}
