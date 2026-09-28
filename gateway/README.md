# SIM800 SMS gateway (hospital PC)

Forwards vitals SMS from a USB/UART SIM800 or SIM800L modem into the local Patient Monitor API.

## Hardware

1. Insert a working SIM (disable PIN or unlock with `AT+CPIN="xxxx"` once).
2. Connect modem USB-UART to the hospital PC (Windows: Device Manager → Ports → note `COMx`).
3. Antenna outdoors/window for rural signal.
4. ESP32 bed monitors send SMS when Wi‑Fi fails, body like:

```text
KEY=dev_xxxx HR=72 SPO2=98 TEMP=36.8 SYS=120 DIA=80 RR=16
```

## Run

```bash
cd gateway
npm install
set SIM800_PORT=COM3
set INGEST_URL=http://127.0.0.1:3000/api/ingest/sms
npm start
```

Linux:

```bash
export SIM800_PORT=/dev/ttyUSB0
npm start
```

Keep the Next.js app listening on the same machine (`npm run start:lan`).

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `SIM800_PORT` | (required) | Serial port |
| `SIM800_BAUD` | `9600` | UART baud |
| `INGEST_URL` | `http://127.0.0.1:3000/api/ingest/sms` | App ingest |
| `POLL_MS` | `5000` | Inbox poll interval |

Non-vitals SMS are left unread (not deleted). Vitals SMS are deleted after a successful ingest.
