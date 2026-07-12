"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";

type RoomRow = {
  id: string;
  number: string;
  patientCount: number;
};

export function RoomsManager({
  wardId,
  wardName,
  rooms,
  isAdmin,
}: {
  wardId: string;
  wardName: string;
  rooms: RoomRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomRow | null>(null);
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/wards/${wardId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Create failed");
      return;
    }
    setOpen(false);
    setNumber("");
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRoom) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/wards/${wardId}/rooms/${editRoom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Update failed");
      return;
    }
    setEditRoom(null);
    setNumber("");
    router.refresh();
  }

  async function deleteRoom(roomId: string, roomNumber: string) {
    if (!confirm(`Delete room ${roomNumber}?`)) return;
    const res = await fetch(`/api/wards/${wardId}/rooms/${roomId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert((data as { error?: string }).error || "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-brand hover:underline">
            ← All wards
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            {wardName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {rooms.length} room{rooms.length === 1 ? "" : "s"}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError("");
              setNumber("");
            }}
            className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            New Room
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center text-sm text-ink-muted">
          No rooms yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="relative rounded-xl border border-line bg-surface p-5 transition hover:border-brand"
            >
              {isAdmin && (
                <div className="absolute right-3 top-3 flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1.5 text-ink-muted hover:bg-brand-soft hover:text-brand"
                    aria-label="Edit room"
                    onClick={() => {
                      setEditRoom(room);
                      setNumber(room.number);
                      setError("");
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1.5 text-ink-muted hover:bg-alert-soft hover:text-alert"
                    aria-label="Delete room"
                    onClick={() => deleteRoom(room.id, room.number)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <Link
                href={`/dashboard/wards/${wardId}/rooms/${room.id}`}
                className="block pr-16"
              >
                <h2 className="text-lg font-semibold text-ink">
                  Room {room.number}
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  {room.patientCount} patient
                  {room.patientCount === 1 ? "" : "s"}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal title="New room" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={createRoom} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Room number
            </label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              placeholder="e.g. 12A"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Edit room"
        open={Boolean(editRoom)}
        onClose={() => setEditRoom(null)}
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Room number
            </label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditRoom(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
