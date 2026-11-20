/**
 * Run: node --experimental-strip-types src/utils/pcbLog.check.ts
 */
import assert from "node:assert/strict";
import { classifyPcbLog, hexToText } from "./pcbLog";

assert.equal(classifyPcbLog("   ").verdict, "no-data");
assert.equal(
  classifyPcbLog("+JOIN: Network joined\n+JOIN: NetID 000000 DevAddr 00:D7:F3:E2").verdict,
  "joined",
);
assert.equal(
  classifyPcbLog("AT+JOIN=DR2\n+JOIN: LoRaWAN modem is busy\nJOIN failed - timeout").verdict,
  "busy",
);
assert.equal(
  classifyPcbLog("+JOIN: Start\n+JOIN: NORMAL\n+JOIN: Join failed\n+JOIN: Done\nJOIN failed - modem").verdict,
  "join-failed",
);
assert.equal(classifyPcbLog("Firmware 1.0.67\nStarting join attempt").verdict, "alive");
assert.match(
  classifyPcbLog("Retry join: Class A was not set\n+JOIN: Join failed").detail,
  /Class C/,
);
assert.equal(hexToText("4669726d77617265"), "Firmware");
assert.equal(hexToText("0d0a"), "\r\n");

console.log("pcbLog.check: ok");
