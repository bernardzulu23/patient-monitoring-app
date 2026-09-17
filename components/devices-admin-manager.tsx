"use client";

import { useEffect, useState } from "react";
import { CopyOnceBlock } from "@/components/copy-once-block";

type DeviceRow = {
  id: string;
  deviceName: string;
  lastSeen: string | null;
  roomId: string | null;
  wardName: string | null;
  roomNumber: string | null;
  patientId: string | null;
  patientName: string | null;
};

type RoomOpt = { id: string; label: string };

export function DevicesAdminManager() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/devices", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      devices: DeviceRow[];
      rooms: RoomOpt[];
    };
    setDevices(data.devices);
    setRooms(data.rooms);
    if (!roomId && data.rooms[0]) setRoomId(data.rooms[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, deviceName }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Register failed");
      return;
    }
    setApiKeyOnce(
      (data as { device: { apiKey: string } }).device.apiKey,
    );
    setDeviceName("");
    await load();
  }

  async function remap(deviceId: string, newRoomId: string) {
    const res = await fetch(`/api/admin/devices/${deviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: newRoomId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert((data as { error?: string }).error || "Remap failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={register}
        className="space-y-4 rounded-xl border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Register device to bed
        </h2>
        <p className="text-xs text-ink-muted">
          ESP32 identity is the API key only — payloads never trust bed/patient
          IDs from the device body.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Device name</label>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bed</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Register
        </button>
      </form>

      {apiKeyOnce && (
        <CopyOnceBlock
          value={apiKeyOnce}
          warning="Save this API key now — it will not be shown again."
        />
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg/60 text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Bed</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Remap</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-2.5 font-medium">{d.deviceName}</td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {d.wardName
                    ? `${d.wardName} · Bed ${d.roomNumber}`
                    : "Unmapped"}
                </td>
                <td className="px-4 py-2.5">
                  {d.patientName ?? (
                    <span className="text-ink-muted">None</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    defaultValue={d.roomId ?? ""}
                    onChange={(e) => remap(d.id, e.target.value)}
                    className="rounded border border-line bg-white px-2 py-1 text-xs"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
