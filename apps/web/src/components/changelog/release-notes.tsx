"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

/**
 * Render catatan release (markdown) dengan GFM — dipakai di halaman /changelog.
 */
export function ReleaseNotes({ body }: { body: string }) {
  if (!body.trim()) {
    return <p className="font-manrope text-sm text-text-muted-custom/60 italic">Tidak ada catatan rilis.</p>;
  }
  return (
    <div className="changelog-markdown">
      <MarkdownRenderer>{body}</MarkdownRenderer>
    </div>
  );
}
