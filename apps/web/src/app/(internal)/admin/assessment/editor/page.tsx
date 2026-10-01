"use client";

import { ArrowRight, Brain, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { client } from "@/lib/client";

interface Assessment { id: string; code: string; name: string; description?: string | null }
interface Version { id: string; versionNumber: number; status: string; publishedAt?: string | null }

/** Index Kelola Tes — daftar semua tes; klik → detail page per tes. */
export default function AssessmentEditorIndex() {
  const aClient = client as any;
  const [items, setItems] = useState<{ a: Assessment; v: Version[] }[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await aClient.discoverAdmin.list();
        const rows = [];
        for (const a of data.assessments ?? []) {
          const v = await aClient.discoverAdmin.versions.list({ assessmentId: a.id });
          rows.push({ a, v: v.items ?? [] });
        }
        setItems(rows);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  if (!items) return <p className="font-manrope text-sm text-muted-foreground">Memuat tes…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
          <Layers className="h-5 w-5 text-brand-navy" /> Kelola Tes
        </h1>
        <p className="font-manrope text-sm text-muted-foreground">Pilih tes untuk mengatur aturan, soal, dan menerbitkan.</p>
      </div>

      {items.length === 0 && <Card><CardContent className="pt-5 font-manrope text-sm text-muted-foreground">Belum ada tes di engine.</CardContent></Card>}

      <div className="grid gap-3">
        {items.map(({ a, v }) => {
          const live = v.find((x) => x.status === "live");
          const draft = v.find((x) => x.status === "draft");
          return (
            <Link key={a.id} href={`/admin/assessment/editor/${a.code}`} className="group block">
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-orange/40 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/10">
                    <Brain className="h-5 w-5 text-brand-navy" />
                  </span>
                  <div>
                    <p className="font-bold font-bricolage text-base text-foreground group-hover:text-brand-navy">{a.name}</p>
                    <p className="font-manrope text-xs text-muted-foreground">
                      {v.length} versi · {live ? <b className="text-teal-700">Online</b> : "Belum Online"} {draft ? "· ada Draf" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden gap-1 sm:flex">
                    {v.slice(0, 4).map((x) => (
                      <Badge key={x.id} className={x.status === "live" ? "border-teal-500/30 bg-teal-500/10 text-teal-700" : x.status === "draft" ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-500"}>
                        v{x.versionNumber}
                      </Badge>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 font-manrope text-sm font-semibold text-brand-navy">
                    Kelola <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}