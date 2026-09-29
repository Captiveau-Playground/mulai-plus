"use client";

import { useEffect } from "react";

/**
 * Inject JSON-LD structured data into the page head.
 * Re-calls on every data change.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  useEffect(() => {
    const id = "__jsonld__";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => script.remove();
  }, [data]);
  return null;
}
