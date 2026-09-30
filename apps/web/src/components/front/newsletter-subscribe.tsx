"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

/** Form subscribe newsletter — inline, tanpa reload. */
export function NewsletterSubscribe({
  source = "article-page",
}: {
  source?: "article-page" | "popup" | "footer-form";
}) {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    try {
      await client.cms.newsletter.subscribe({ email, source });
      setDone(true);
      setEmail("");
      notify.create("Berlangganan berhasil 🎉", { description: "Artikel & berita baru akan dikirim ke emailmu." });
    } catch (err) {
      notify.error("Gagal berlangganan 🙈", {
        description: (err as Error)?.message?.slice(0, 120) || "Coba lagi sebentar ya.",
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="email"
          required
          value={email}
          disabled={done || subscribing}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@kamu.id"
          className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pr-3 pl-9 font-manrope text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-orange/60"
        />
      </label>
      <Button
        type="submit"
        disabled={done || subscribing}
        className="shrink-0 rounded-xl bg-brand-orange px-6 font-manrope font-semibold text-white hover:bg-brand-orange/90 disabled:opacity-70"
      >
        {subscribing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
        {done ? "Terdaftar ✓" : "Subscribe Newsletter"}
      </Button>
    </form>
  );
}
