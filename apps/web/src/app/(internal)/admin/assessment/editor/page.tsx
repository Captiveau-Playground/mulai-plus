"use client";

import { CheckCircle2, FilePlus2, GitBranch, Layers, Loader2, Rocket, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

interface Assessment {
  id: string;
  code: string;
  name: string;
}
interface Version {
  id: string;
  assessmentId: string;
  versionNumber: number;
  status: string;
  publishedAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  live: "bg-teal-500/10 text-teal-700 border-teal-500/30",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  archived: "bg-gray-50 text-gray-400 border-gray-200",
  preview: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  validate: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

export default function AssessmentEditorPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    const data = await client.discoverAdmin.list();
    setAssessments(data.assessments as any);
    const byId: Record<string, Version[]> = {};
    for (const a of data.assessments as any) {
      const v = await client.discoverAdmin.versions.list({ assessmentId: a.id });
      byId[a.id] = v.items as any;
    }
    setVersions(byId);
    setLoaded(true);
  };

  useEffect(() => {
    refresh().catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createDraft = async (code: string) => {
    setBusy((b) => ({ ...b, [`draft:${code}`]: true }));
    try {
      const r = await client.discoverAdmin.versions.createDraft({ code });
      notify.create("Draft v" + (r as any).versionNumber + " dibuat", { description: "Snapshot dari versi LIVE." });
      await refresh();
    } catch (e) {
      notify.error("Gagal buat draft", { description: (e as Error)?.message?.slice(0, 140) });
    } finally {
      setBusy((b) => ({ ...b, [`draft:${code}`]: false }));
    }
  };

  const publish = async (code: string, versionId: string) => {
    setBusy((b) => ({ ...b, [`pub:${versionId}`]: true }));
    try {
      const r = (await client.discoverAdmin.versions.publish({ versionId })) as any;
      if (r.ok) {
        notify.create("Publikasi berhasil 🎉", { description: "Versi LIVE; versi lama di-archive." });
        setErrors((e) => ({ ...e, [code]: [] }));
      } else {
        setErrors((e) => ({ ...e, [code]: r.errors ?? ["Publish ditolak"] }));
        notify.error("Publish ditolak oleh gatekeeper", {
          description: `${(r.errors ?? []).length} aturan tidak terpenuhi.`,
        });
      }
      await refresh();
    } catch (e) {
      notify.error("Gagal publish", { description: (e as Error)?.message?.slice(0, 140) });
    } finally {
      setBusy((b) => ({ ...b, [`pub:${versionId}`]: false }));
    }
  };

  if (!loaded)
    return (
      <div className="flex items-center gap-2 font-manrope text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat assessment…
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            <Layers className="h-5 w-5 text-brand-navy" /> Assessment Editor
          </h1>
          <p className="mt-1 font-manrope text-sm text-muted-foreground">
            Engine generik (Fase 0) — kelola versi &amp; publikasi. Konten soal via Back Office penuh menyusul.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={Object.keys(busy).length > 0}>
          Segarkan
        </Button>
      </div>

      {assessments.length === 0 && (
        <Card>
          <CardContent className="pt-5 font-manrope text-sm text-muted-foreground">
            Belum ada assessment di engine. Jalankan seeder <code className="text-xs">bun scripts/seed-assessment.ts</code>{" "}
            di packages/db.
          </CardContent>
        </Card>
      )}

      {assessments.map((a) => {
        const vs = versions[a.id] ?? [];
        const live = vs.find((v) => v.status === "live");
        return (
          <Card key={a.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                <span className="mr-2 rounded-md bg-brand-navy px-2 py-0.5 font-manrope text-[10px] text-white">
                  {a.code}
                </span>
                {a.name}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createDraft(a.code)}
                disabled={!!busy[`draft:${a.code}`] || !live}
              >
                {busy[`draft:${a.code}`] ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitBranch className="mr-1 h-3.5 w-3.5" />
                )}
                Buat Draft v{(live?.versionNumber ?? 0) + 1}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {vs.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-manrope text-xs text-muted-foreground">v{v.versionNumber}</span>
                    <Badge className={`border ${STATUS_STYLE[v.status] ?? ""}`}>{v.status}</Badge>
                    {v.publishedAt && (
                      <span className="font-manrope text-[11px] text-muted-foreground">
                        {new Date(v.publishedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    )}
                  </div>
                  {v.status !== "live" && v.status !== "archived" && (
                    <Button
                      size="sm"
                      className="bg-brand-orange hover:bg-brand-orange/90"
                      onClick={() => publish(a.code, v.id)}
                      disabled={!!busy[`pub:${v.id}`]}
                    >
                      {busy[`pub:${v.id}`] ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Rocket className="mr-1 h-3.5 w-3.5" />
                      )}
                      Publish
                    </Button>
                  )}
                </div>
              ))}
              {(errors[a.code] ?? []).length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                  <p className="flex items-center gap-1.5 font-manrope text-xs font-semibold text-red-700">
                    <XCircle className="h-3.5 w-3.5" /> Gatekeeper menolak publikasi:
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {(errors[a.code] ?? []).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5 font-manrope text-[11px] text-red-700/90">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 opacity-40" /> {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <p className="font-manrope text-[11px] text-muted-foreground">
        <FilePlus2 className="mr-1 inline h-3 w-3" />
        Roadmap: edit konten (dimensi/soal/opsi/scales) + preview-as-student di fase berikutnya. Engine tidak mengubah
        alur TMB lama.
      </p>
    </div>
  );
}