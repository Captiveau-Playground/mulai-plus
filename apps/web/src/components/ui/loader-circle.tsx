"use client";

/** Spinner CSS-only (konteks client), tanpa konflik lucide. */
export function LoaderCircle({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
