"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyOnceBlock({
  value,
  warning,
}: {
  value: string;
  warning: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <div className="space-y-2 rounded-lg border border-warn/40 bg-warn-soft p-3">
      <p className="text-xs font-medium text-warn">{warning}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded-md bg-white px-3 py-2 font-mono text-sm text-ink">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-line bg-white p-2 text-ink-muted hover:text-brand"
          aria-label="Copy"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
