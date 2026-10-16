"use client";

// Emoji animasi (Noto Emoji Animation) untuk skala jawaban.
//
// Aset: https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json
//   (Lottie, 15–46 KB per emoji — jauh lebih ringan daripada WebP animasi 677 KB)
// Player: @lottiefiles/dotlottie-react (sudah tersedia di repo)
//
// Selalu ada fallback ke glyph emoji biasa, jadi kalau aset/player gagal dimuat
// (offline, diblokir, CI) tampilannya tetap benar.
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Ubah satu emoji menjadi hex codepoint, mis. 😡 → "1f621". */
function codepointHex(emoji: string): string | null {
  const chars = [...emoji.trim()];
  if (chars.length === 0 || chars.length > 2) return null;
  const hex = chars.map((c) => c.codePointAt(0)?.toString(16)).filter(Boolean) as string[];
  return hex.length ? hex.join("-") : null;
}

/** Benarkah string ini sebuah emoji (bukan angka/teks biasa)? */
function isEmojiOnly(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text) && codepointHex(text) !== null;
}

export function AnimatedEmoji({
  emoji,
  size = 40,
  className,
  testId,
}: {
  emoji: string;
  size?: number;
  className?: string;
  testId?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  const hex = codepointHex(emoji);

  // Bukan emoji tunggal (mis. angka "1".."5") → tampilkan teks apa adanya.
  if (!hex || !isEmojiOnly(emoji)) {
    return (
      <span className={cn("leading-none", className)} style={{ fontSize: size * 0.8 }}>
        {emoji}
      </span>
    );
  }

  const fallback = state !== "ok";

  return (
    <span
      data-testid={testId ?? "animated-emoji"}
      data-state={state}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {fallback && (
        <span
          className="absolute inset-0 flex items-center justify-center leading-none"
          style={{ fontSize: size * 0.72 }}
        >
          {emoji}
        </span>
      )}
      <span className={cn("absolute inset-0", fallback ? "opacity-0" : "opacity-100")} aria-hidden>
        <DotLottieReact
          src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/lottie.json`}
          loop
          autoplay
          style={{ width: size, height: size }}
          dotLottieRefCallback={(dl) => {
            if (!dl) return;
            const ok = () => setState("ok");
            const fail = () => setState("failed");
            dl.addEventListener("load", ok);
            dl.addEventListener("loadError", fail);
          }}
        />
      </span>
    </span>
  );
}
