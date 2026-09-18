"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand-deep px-3 py-1.5 text-sm font-semibold text-white print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
