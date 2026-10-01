"use client";

import katex from "katex";
import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";

/** Render teks LaTeX (KaTeX) — opsional utk soal/opsi bertanda has_math_notation. */
export function Latex({ text, block = false }: { text: string; block?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!ref.current || !text) return;
    try {
      katex.render(text, ref.current, { throwOnError: true, displayMode: block });
      setErr(false);
    } catch {
      setErr(true);
    }
  }, [text, block]);
  if (err) return <span className="text-red-500">{text}</span>;
  return <span ref={ref} />;
}