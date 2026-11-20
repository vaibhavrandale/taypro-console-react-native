/**
 * Run: node --experimental-strip-types src/utils/pcbLogStream.check.ts
 */
import assert from "node:assert/strict";
import { createPcbLogSender, PCB_LOG_FLUSH_CHARS } from "./pcbLogStream.ts";
import type { PcbLogEvent } from "./pcbLogStream.ts";

const events: PcbLogEvent[] = [];
const sender = createPcbLogSender((event) => events.push(event));

sender.start("   ");
sender.push("Firmware");
assert.equal(events.length, 0);

sender.start("ABD-2324694");
sender.push("Firmware 1.0\n");
sender.stop();
assert.deepEqual(
  events.map((event) => event.type),
  ["start", "chunk", "stop"],
);
assert.equal(events[1].type === "chunk" ? events[1].text : "", "Firmware 1.0\n");
assert.equal(events[1].type === "chunk" ? events[1].robotNo : "", "ABD-2324694");

events.length = 0;
sender.start("ABD-1");
sender.push("x".repeat(PCB_LOG_FLUSH_CHARS + 5));
assert.equal(events.filter((event) => event.type === "chunk").length, 1);
assert.equal(
  events.find((event) => event.type === "chunk" && event.text.length === PCB_LOG_FLUSH_CHARS)
    ?.type,
  "chunk",
);
sender.stop();
assert.equal(events.at(-1)?.type, "stop");
assert.equal(
  events.filter((event) => event.type === "chunk").reduce((sum, event) => {
    return sum + (event.type === "chunk" ? event.text.length : 0);
  }, 0),
  PCB_LOG_FLUSH_CHARS + 5,
);

events.length = 0;
sender.start("ABD-1");
sender.push("hi");
await new Promise((resolve) => setTimeout(resolve, 200));
assert.equal(events.some((event) => event.type === "chunk" && event.text === "hi"), true);
sender.stop();

console.log("pcb log sender checks passed");
