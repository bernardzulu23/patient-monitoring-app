/**
 * SIM800 / SIM800L serial SMS gateway for rural hospital PCs.
 *
 * Reads inbound SMS over UART, forwards vitals payloads to the local app:
 *   POST {INGEST_URL}  body: { text: "KEY=… HR=… SPO2=…" }
 *
 * Env:
 *   SIM800_PORT   COM3 (Windows) or /dev/ttyUSB0 (Linux) — required
 *   SIM800_BAUD   default 9600
 *   INGEST_URL    default http://127.0.0.1:3000/api/ingest/sms
 *   POLL_MS       default 5000
 */
import { SerialPort } from "serialport";

const PORT = process.env.SIM800_PORT?.trim();
const BAUD = Number(process.env.SIM800_BAUD || 9600);
const INGEST_URL =
  process.env.INGEST_URL?.trim() || "http://127.0.0.1:3000/api/ingest/sms";
const POLL_MS = Number(process.env.POLL_MS || 5000);

if (!PORT) {
  console.error(
    "Set SIM800_PORT (e.g. COM3 on Windows, /dev/ttyUSB0 on Linux).",
  );
  process.exit(1);
}

const port = new SerialPort({
  path: PORT,
  baudRate: Number.isFinite(BAUD) ? BAUD : 9600,
  autoOpen: false,
});

let buffer = "";
/** @type {((line: string) => void) | null} */
let waitResolve = null;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function writeLine(cmd) {
  return new Promise((resolve, reject) => {
    port.write(`${cmd}\r`, (err) => (err ? reject(err) : resolve()));
  });
}

function waitFor(predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (waitResolve === onLine) waitResolve = null;
      reject(new Error(`Timeout waiting for response to settle (${timeoutMs}ms)`));
    }, timeoutMs);

    function onLine(line) {
      if (predicate(line)) {
        clearTimeout(timer);
        if (waitResolve === onLine) waitResolve = null;
        resolve(line);
      }
    }
    waitResolve = onLine;
  });
}

async function at(cmd, { expectOk = true, timeoutMs = 8000 } = {}) {
  log(">>", cmd);
  await writeLine(cmd);
  if (!expectOk) return;
  await waitFor(
    (line) => line === "OK" || line.startsWith("ERROR") || line.startsWith("+CME"),
    timeoutMs,
  );
}

function looksLikeVitals(text) {
  return /(?:^|\s)KEY=/i.test(text) && /(?:HR|SPO2|TEMP|SYS)=/i.test(text);
}

async function forwardSms(text, from) {
  log("Forwarding SMS from", from || "unknown", "→", INGEST_URL);
  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Ingest ${res.status}: ${body}`);
  }
  log("Ingest OK:", body.slice(0, 200));
}

/**
 * Parse +CMGL: index,... then following text line(s) until next +CMGL or OK.
 * @param {string[]} lines
 */
function parseCmgl(lines) {
  /** @type {{ index: string, from: string, text: string }[]} */
  const messages = [];
  for (let i = 0; i < lines.length; i++) {
    const header = /^\+CMGL:\s*(\d+),/.exec(lines[i] ?? "");
    if (!header) continue;
    const index = header[1];
    // +CMGL: i,"REC UNREAD","+260…","","…"
    const fromMatch = /"([^"]*)"/.exec(
      (lines[i] ?? "").split(",").slice(2).join(","),
    );
    const from = fromMatch?.[1] ?? "";
    const textParts = [];
    for (let j = i + 1; j < lines.length; j++) {
      const L = lines[j] ?? "";
      if (L.startsWith("+CMGL:") || L === "OK" || L.startsWith("ERROR")) break;
      if (L.startsWith(">")) continue;
      textParts.push(L);
    }
    messages.push({ index, from, text: textParts.join("\n").trim() });
  }
  return messages;
}

async function pollInbox() {
  await writeLine('AT+CMGL="ALL"');
  const collected = [];
  const done = await new Promise((resolve) => {
    const started = Date.now();
    const prev = waitResolve;
    waitResolve = (line) => {
      collected.push(line);
      if (line === "OK" || line.startsWith("ERROR") || Date.now() - started > 12000) {
        waitResolve = prev;
        resolve(line);
      }
    };
    setTimeout(() => {
      waitResolve = prev;
      resolve("TIMEOUT");
    }, 12000);
  });

  if (done === "TIMEOUT" || String(done).startsWith("ERROR")) {
    log("CMGL ended with", done);
    return;
  }

  const messages = parseCmgl(collected);
  for (const msg of messages) {
    if (!msg.text) continue;
    if (!looksLikeVitals(msg.text)) {
      log("Skipping non-vitals SMS #", msg.index, msg.text.slice(0, 60));
      continue;
    }
    try {
      await forwardSms(msg.text, msg.from);
      await at(`AT+CMGD=${msg.index}`);
    } catch (err) {
      log("Failed to process SMS #", msg.index, err);
    }
  }
}

port.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  let idx;
  while ((idx = buffer.search(/\r?\n/)) >= 0) {
    const line = buffer.slice(0, idx).replace(/\r$/, "").trim();
    buffer = buffer.slice(idx + (buffer[idx] === "\r" ? 2 : 1));
    if (!line) continue;
    log("<<", line);
    if (waitResolve) waitResolve(line);
    if (line.startsWith("+CMTI:")) {
      // New message indication — poll soon
      void pollInbox().catch((e) => log("poll after CMTI failed", e));
    }
  }
});

port.open(async (err) => {
  if (err) {
    console.error("Failed to open", PORT, err.message);
    process.exit(1);
  }
  log("Opened", PORT, "baud", BAUD);
  try {
    await at("AT");
    await at("ATE0");
    await at("AT+CMGF=1"); // text mode
    await at('AT+CNMI=2,1,0,0,0'); // new message indications
    log("Modem ready. Polling every", POLL_MS, "ms →", INGEST_URL);
    setInterval(() => {
      void pollInbox().catch((e) => log("poll failed", e));
    }, POLL_MS);
    await pollInbox();
  } catch (e) {
    console.error("Modem init failed:", e);
    process.exit(1);
  }
});
