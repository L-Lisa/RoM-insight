"use client";

/** C4 (v1): PDF via webbläsarens utskrift — @media print-stilar gör sidan ljus och ren. */
export function PrintButton({ label = "Spara som PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print text-sm px-4 py-2 rounded-lg border border-[var(--line)] hover:bg-[var(--bg-hover)] transition-colors"
    >
      {label}
    </button>
  );
}
