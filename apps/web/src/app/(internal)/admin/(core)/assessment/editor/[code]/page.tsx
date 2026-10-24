"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, FilePlus2, FileUp, Loader2, Plus, Rocket, ShieldCheck, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedEmoji } from "@/components/assessment/animated-emoji";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { client, orpc } from "@/utils/orpc";
import "katex/dist/katex.min.css";
import { QuestionList } from "./_components/question-list";
import { SettingsPanel } from "./_components/settings-panel";

interface Ver {
  id: string;
  versionNumber: number;
  status: string;
  configJson?: any;
  publishedAt?: string | null;
}
interface Dim {
  id: string;
  code: string;
  name: string;
}
interface Qn {
  id: string;
  dimensionId: string;
  questionText: string;
  questionType: string;
  weight?: number;
  hasMathNotation?: boolean;
  displayOrder: number;
}
interface Content {
  questions: Qn[];
  options: any[];
  textConfigs: any[];
  dimensions: Dim[];
  scales: any[];
}

/** Detail tes (TanStack Query) — aturan, soal, simulasi branch & rilis. */
export default function AssessmentDetailPage() {
  const code = (useParams().code as string) ?? "";
  const queryClient = useQueryClient();
  const rawClient = client as any;
  const [rules, setRules] = useState<Record<string, any>>({});
  // Ingat versi yg sedang diedit (refresh tidak pindah versi → data gambar yg tersimpan tetap tampil)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("assess-editor-ver") : null,
  );
  const pickVer = (id: string | null) => {
    setSelectedId(id);
    try {
      if (id) localStorage.setItem("assess-editor-ver", id);
      else localStorage.removeItem("assess-editor-ver");
    } catch {
      /* abaikan */
    }
  };
  const [_branchOpen, _setBranchOpen] = useState(false);
  const [verify, setVerify] = useState<{ vid: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; q?: any } | null>(null);
  const [_dragIdx, setDragIdx] = useState<number | null>(null);
  const [_dimCode, setDimCode] = useState("");
  const [_dimName, setDimName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [gal, setGal] = useState<{
    open: boolean;
    cb: (u: string) => void;
    kind: "question" | "option";
    code: string;
  } | null>(null);
  const [focusQ, setFocusQ] = useState<string | null>(null);
  const [focusDim, setFocusDim] = useState(false);
  // Mode ubah di versi LIVE: draf baru baru dibuat saat perubahan PERTAMA disimpan
  const [intentEdit, setIntentEdit] = useState(false);
  // Preview memakai HALAMAN SISWA yang asli (rute take) di dalam iframe
  const [previewV, setPreviewV] = useState<{ id: string; versionNumber: number; status: string } | null>(null);
  // (#5) Nonce memaksa iframe reload: id versi draf TIDAK berubah saat admin mengubah
  // setting/soal, sehingga preview lama tetap tampil. Nonce di-bump tiap kali preview
  // dibuka / tombol "Muat ulang" ditekan, dan dipakai di `key` + query `t`.
  const [previewNonce, setPreviewNonce] = useState(0);
  // (Temuan analis #2) Preview mengirim pesan saat siswa menekan "Keluar" di dalam iframe
  // → tutup dialog, jangan biarkan iframe terlempar ke area siswa.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e?.data && typeof e.data === "object" && (e.data as any).type === "assessment-preview-exit") {
        setPreviewV(null);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const openPreview = (v: { id: string; versionNumber: number; status: string }) => {
    setPreviewNonce(Date.now());
    setPreviewV(v);
  };
  const draftRef = useRef<string | null>(null);
  const [_hlQ, setHlQ] = useState<string | null>(null);
  const [hlDim, setHlDim] = useState(false);

  const summariesKey = orpc.discoverAdmin.summaries.key();
  const { data: sums } = useQuery(orpc.discoverAdmin.summaries.queryOptions());
  const assess = sums?.items?.find((x: any) => x.code === code);
  const vers: Ver[] = (assess?.versions ?? []) as Ver[];
  const live = vers.find((v) => v.status === "live") ?? null;
  const draft = vers.find((v) => v.status === "draft") ?? null;
  const selVer = vers.find((v) => v.id === selectedId) ?? draft ?? live;

  // Bisa mengedit kalau versi ini draf, ATAU versi live dan admin sudah menekan "Ubah".
  const canEdit = !!selVer && (selVer.status === "draft" || (selVer.status === "live" && intentEdit));
  const versionId = selVer?.id ?? "";

  const contentKey = () => orpc.discoverAdmin.versions.contentList.key({ input: { versionId } });
  const gateKey = () => orpc.discoverAdmin.versions.validate.key({ input: { versionId: draft?.id ?? "" } });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: summariesKey });
    if (versionId) void queryClient.invalidateQueries({ queryKey: contentKey() });
    if (versionId) void queryClient.invalidateQueries({ queryKey: cfgKey });
    if (draft) void queryClient.invalidateQueries({ queryKey: gateKey() });
  };

  const { data: content, isLoading: contentLoading } = useQuery(
    orpc.discoverAdmin.versions.contentList.queryOptions({
      input: { versionId },
      enabled: !!selVer,
    }),
  );
  const cfgKey = ["assess-cfg", versionId];
  const { data: cfgV } = useQuery({
    queryKey: cfgKey,
    queryFn: () => rawClient.discover.config({ versionId }),
    enabled: !!versionId,
  });
  const { data: gate } = useQuery(
    orpc.discoverAdmin.versions.validate.queryOptions({
      input: { versionId: selVer?.status === "draft" ? selVer.id : (draft?.id ?? "") },
      enabled: !!selVer && selVer.status === "draft",
    }),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: form aturan hanya di-reset saat berpindah versi
  useEffect(() => {
    if (selVer) setRules(selVer.configJson ?? {});
  }, [selVer?.id]);

  const mMeta = useMutation(
    orpc.discoverAdmin.updateMeta.mutationOptions({
      onSuccess: () => {
        notify.create("Jenis badge diperbarui ✅");
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const setFamily = (f: string) => {
    if (!assess) return;
    void mMeta.mutateAsync({
      id: assess.id,
      name: assess.name,
      description: assess.description ?? null,
      family: (f as any) || null,
    });
  };
  const mDraft = useMutation(
    orpc.discoverAdmin.versions.createDraft.mutationOptions({
      onSuccess: () => {
        notify.create("Draf baru dibuat", { description: "Versi live siswa tidak berubah sampai kamu rilis." });
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mRules = useMutation(
    orpc.discoverAdmin.versions.configUpdate.mutationOptions({
      onSuccess: () => {
        notify.create("Aturan disimpan ✅");
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mSaveQ = useMutation(
    orpc.discoverAdmin.versions.contentSave.mutationOptions({
      onSuccess: () => {
        notify.create("Soal tersimpan ✅");
        setModal(null);
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mDelQ = useMutation(
    orpc.discoverAdmin.versions.contentDelete.mutationOptions({
      onSuccess: () => {
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mDupQ = useMutation(
    orpc.discoverAdmin.versions.contentDuplicate.mutationOptions({
      onSuccess: () => {
        notify.create("Soal disalin");
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mReorder = useMutation(
    orpc.discoverAdmin.versions.contentReorder.mutationOptions({
      onSuccess: () => {
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mDimsUpd = useMutation({
    mutationFn: (i: any) => rawClient.discoverAdmin.versions.dimsUpdate(i),
    onSuccess: () => {
      notify.create("Dimensi diperbarui ✅");
      void invalidate();
    },
    onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }),
  });
  const mSecSave = useMutation({
    mutationFn: (i: any) => rawClient.discoverAdmin.versions.sectionSave(i),
    onSuccess: () => {
      void invalidate();
      notify.create("Pengantar disimpan ✅");
    },
    onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }),
  });
  const mSecDel = useMutation({
    mutationFn: (i: any) => rawClient.discoverAdmin.versions.sectionDelete(i),
    onSuccess: () => {
      void invalidate();
    },
    onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }),
  });
  const mInstr = useMutation({
    mutationFn: (i: any) => rawClient.discoverAdmin.versions.instrSave(i),
    onSuccess: () => {
      notify.create("Instruksi disimpan ✅");
      void invalidate();
    },
    onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }),
  });
  const mImport = useMutation(
    orpc.discoverAdmin.versions.importQuestions.mutationOptions({
      onSuccess: () => {
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Impor gagal", { description: e.message?.slice(0, 160) }),
    }),
  );
  const mDimsAdd = useMutation(
    orpc.discoverAdmin.versions.dimsAdd.mutationOptions({
      onSuccess: () => {
        notify.create("Dimensi ditambahkan ✅");
        setDimCode("");
        setDimName("");
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mDimsDel = useMutation(
    orpc.discoverAdmin.versions.dimsDelete.mutationOptions({
      onSuccess: () => {
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mPub = useMutation(
    orpc.discoverAdmin.versions.publish.mutationOptions({
      onSuccess: () => {
        notify.create("Versi dijadikan rilis 🎉", { description: "Siswa kini menerima versi ini." });
        setVerify(null);
        pickVer(null);
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: summariesKey });
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );

  useEffect(() => {
    if (focusQ) {
      const el = document.getElementById(`q-${focusQ}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHlQ(focusQ);
      const t = setTimeout(() => setHlQ(null), 2000);
      return () => clearTimeout(t);
    }
  }, [focusQ]);
  useEffect(() => {
    if (focusDim) {
      const el = document.getElementById("aturan");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHlDim(true);
      const t = setTimeout(() => setHlDim(false), 2200);
      return () => clearTimeout(t);
    }
  }, [focusDim]);

  const questions = (content?.questions ?? []) as Qn[];
  const busyAny =
    mDraft.isPending ||
    mRules.isPending ||
    mSaveQ.isPending ||
    mDelQ.isPending ||
    mDupQ.isPending ||
    mReorder.isPending ||
    mDimsAdd.isPending ||
    mDimsDel.isPending ||
    mPub.isPending;
  const dims = (content?.dimensions ?? []) as Dim[];

  /** Masuk mode ubah. Kalau draf sudah ada, langsung pakai draf itu (tanpa bikin baru). */
  const startEdit = () => {
    if (draft) pickVer(draft.id);
    else setIntentEdit(true);
  };

  /**
   * Pastikan ada draf sebelum menulis. Draf dibuat HANYA saat aksi perubahan pertama
   * dijalankan — jadi membuka mode ubah tanpa mengubah apa pun tidak bikin draf kosong.
   */
  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (selVer?.status === "draft") return selVer.id;
    if (draftRef.current) return draftRef.current;
    const r = (await mDraft.mutateAsync({ code })) as { versionId?: string } | undefined;
    if (!r?.versionId) return null;
    draftRef.current = r.versionId;
    pickVer(r.versionId);
    return r.versionId;
  }, [code, selVer?.id, selVer?.status, mDraft.mutateAsync, pickVer]);

  /** Jalankan mutasi dengan versionId draf (buat draf dulu bila masih di versi live). */
  const withDraft = useCallback(
    async (fn: (vid: string) => unknown) => {
      const vid = await ensureDraft();
      if (vid) await fn(vid);
    },
    [ensureDraft],
  );
  const moveQ = useCallback(
    (idx: number, dir: number) => {
      const j = idx + dir;
      if (j < 0 || j >= questions.length) return;
      const qs = [...questions];
      const a = qs[idx];
      const b = qs[j];
      if (!a || !b) return;
      qs[idx] = b;
      qs[j] = a;
      void withDraft((vid) => mReorder.mutateAsync({ versionId: vid, orderedIds: qs.map((q) => q.id) }));
    },
    [questions, withDraft, mReorder.mutateAsync],
  );
  const dropQ = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const qs = [...questions];
      const [moved] = qs.splice(from, 1);
      if (moved) qs.splice(to, 0, moved);
      void withDraft((vid) => mReorder.mutateAsync({ versionId: vid, orderedIds: qs.map((q) => q.id) }));
      setDragIdx(null);
    },
    [questions, withDraft, mReorder.mutateAsync],
  );
  const openEdit = (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (!q) {
      setFocusQ(id);
      return;
    }
    setModal({
      open: true,
      q: {
        ...q,
        opts: (content?.options ?? []).filter((o: any) => o.questionId === q.id),
        tc: (content?.textConfigs ?? []).find((t: any) => t.questionId === q.id),
      },
    });
    setTimeout(() => document.getElementById("q-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const delQ = (id: string) => void withDraft(() => mDelQ.mutateAsync({ questionId: id }));
  const dupQ = (id: string) => void withDraft(() => mDupQ.mutateAsync({ questionId: id }));

  if (!assess) return <div className="font-manrope text-muted-foreground text-sm">Tes tidak ditemukan.</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/assessment/editor"
            className="font-manrope font-semibold text-muted-foreground text-xs hover:text-brand-navy"
          >
            ← Semua Tes
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 font-bold font-bricolage text-foreground text-xl">
            {assess.name}
            {(assess as any).family && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-gray-500">
                {(assess as any).family === "minat" ? "Tes Minat · B2C" : "Tes Bakat · B2C"}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <button
              type="button"
              data-testid="preview-live"
              onClick={() => openPreview({ id: live.id, versionNumber: live.versionNumber, status: live.status })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-manrope font-semibold text-gray-600 text-xs hover:bg-gray-50"
            >
              <Eye className="h-3.5 w-3.5" /> Lihat sebagai siswa
            </button>
          )}
          <Button
            disabled={!draft || (gate ? !gate.ok : false)}
            className={
              (gate && !gate.ok) || !draft
                ? "bg-gray-300 hover:bg-gray-300"
                : "bg-brand-orange hover:bg-brand-orange/90"
            }
            onClick={() => draft && setVerify({ vid: draft.id })}
          >
            <Rocket className="mr-1 h-4 w-4" /> Terbitkan
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Aturan tes — panel terkelompok (accordion + ringkasan), lihat _components/settings-panel.tsx */}
        <div
          className={
            hlDim
              ? "rounded-2xl shadow-lg ring-2 ring-brand-orange/60 lg:sticky lg:top-20 lg:order-2 lg:col-span-2 lg:self-start"
              : "lg:sticky lg:top-20 lg:order-2 lg:col-span-2 lg:self-start"
          }
        >
          <SettingsPanel
            assess={{
              id: assess.id,
              name: assess.name,
              code: assess.code,
              family: ((assess as any).family ?? null) as string | null,
            }}
            versions={vers as any}
            selectedVersionId={selVer?.id ?? null}
            canEdit={canEdit}
            rules={rules}
            onRulesChange={setRules}
            dims={dims as any}
            questions={questions as any}
            options={(content?.options ?? []) as any}
            sections={((cfgV as any)?.sections ?? []) as any}
            instructions={((cfgV as any)?.instructions ?? []) as any}
            gate={selVer?.status === "draft" ? (gate as any) : undefined}
            focusGroup={focusDim ? "dimensi" : null}
            onSelectVersion={pickVer}
            onPreviewVersion={(v) => openPreview({ id: v.id, versionNumber: v.versionNumber, status: v.status })}
            onPublishVersion={(v) => setVerify({ vid: v.id })}
            onSetFamily={setFamily}
            onSaveRules={(cfg) => void withDraft((vid) => mRules.mutateAsync({ versionId: vid, config: cfg ?? rules }))}
            onStartEdit={startEdit}
            onDimsAdd={(code, name) => void withDraft((vid) => mDimsAdd.mutateAsync({ versionId: vid, code, name }))}
            onDimsDelete={(id) => void mDimsDel.mutateAsync({ dimensionId: id })}
            onDimsUpdate={(id, durationSeconds) => void mDimsUpd.mutateAsync({ dimensionId: id, durationSeconds })}
            onDimTimerScope={(id, timerScope) => void mDimsUpd.mutateAsync({ dimensionId: id, timerScope })}
            onSectionSave={(s) =>
              void withDraft((vid) =>
                mSecSave.mutateAsync({
                  versionId: vid,
                  id: s.id,
                  title: s.title,
                  contentType: s.contentType,
                  contentJson: s.contentJson ?? { text: "" },
                  displayOrder: s.displayOrder,
                  visibility: s.visibility ?? true,
                }),
              )
            }
            onSectionDelete={(id) => {
              if (id) void mSecDel.mutateAsync({ id });
            }}
            onInstructionSave={(i) =>
              void mInstr.mutateAsync({
                dimensionId: i.dimensionId,
                id: i.id,
                header: i.header,
                contentType: i.contentType ?? "bullet_list",
                contentJson: i.contentJson ?? { items: [] },
              })
            }
            pendingDraft={intentEdit && selVer?.status === "live"}
            savingRules={mRules.isPending}
            creatingDraft={mDraft.isPending}
            addingDim={mDimsAdd.isPending}
          />
        </div>

        {/* Daftar soal */}
        <div className="rounded-2xl border border-gray-200 bg-white lg:order-1 lg:col-span-3 lg:self-start">
          <div className="flex items-center justify-between border-gray-100 border-b px-5 py-3.5">
            <span className="font-bold font-bricolage text-brand-navy text-sm">
              Daftar soal{" "}
              <span className="ml-1 font-manrope font-normal text-[11px] text-muted-foreground">
                {questions.length} soal {canEdit ? "" : "· hanya baca"}
              </span>
            </span>
            {canEdit ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="q-preview"
                  onClick={() =>
                    selVer && openPreview({ id: selVer.id, versionNumber: selVer.versionNumber, status: selVer.status })
                  }
                  title="Lihat versi ini seperti yang dilihat siswa"
                >
                  <Eye className="mr-1 h-4 w-4" /> Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="q-import"
                  onClick={() => setImportOpen(true)}
                  title="Import banyak soal dari CSV/Excel"
                >
                  <FileUp className="mr-1 h-4 w-4" /> Import Soal
                </Button>
                <Button
                  size="sm"
                  className="bg-brand-orange hover:bg-brand-orange/90"
                  data-testid="q-add"
                  onClick={() => setModal({ open: true })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Tambah soal
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy-light"
                onClick={startEdit}
                disabled={mDraft.isPending}
              >
                {mDraft.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Ubah soal
              </Button>
            )}
          </div>

          {modal?.open && selVer && content && (
            <div id="q-panel" className="border-teal-100 border-b bg-teal-50/20 px-4 py-4">
              <QuestionPanel
                q={modal.q}
                versionId={versionId}
                content={content}
                rules={rules}
                openPicker={(cb, kind) => setGal({ open: true, cb, kind: kind ?? "question", code })}
                onDone={async (qid) => {
                  const id = modal.q?.id;
                  await withDraft((vid) =>
                    mSaveQ.mutateAsync({ ...(id ? { id } : {}), versionId: vid, questionData: qid as any }),
                  );
                  setModal(null);
                }}
                onClose={() => setModal(null)}
              />
            </div>
          )}

          <QuestionList
            questions={questions as any}
            dims={dims}
            canEdit={canEdit}
            optionCountOf={(qid) => (content?.options ?? []).filter((o: any) => o.questionId === qid).length}
            textEvalOf={(qid) => (content?.textConfigs ?? []).find((t: any) => t.questionId === qid)?.evaluationType}
            onEdit={openEdit}
            onDelete={delQ}
            onDuplicate={dupQ}
            onMove={moveQ}
            onDragDrop={dropQ}
            loading={contentLoading}
          />
        </div>
      </div>

      {/* Status rilis */}
      {gate && !gate.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="font-manrope font-semibold text-red-700 text-sm">
            {(gate.errors ?? []).length} hal perlu diperbaiki sebelum terbit — klik untuk lompat:
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            {(gate.details?.length
              ? gate.details
              : (gate.errors ?? []).map((e: string) => {
                  const _qm = e.match(/Soal (?:\\|[a-z0-9]{8,24})/i);
                  const qid = e.match(/Soal\s+([a-z0-9]{8,24})/i);
                  const qidVal = qid?.[1];
                  if (qidVal) return { kind: "question" as const, id: qidVal, message: e };
                  if (/Dimensi\s+\S/i.test(e) && /butuh minimal/i.test(e))
                    return { kind: "dimension" as const, message: e };
                  return { kind: "config" as const, message: e };
                })
            ).map((d: any, i: number) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  if (d.kind === "question" && d.id) openEdit(d.id);
                  else if (d.kind === "dimension") {
                    setFocusDim(true);
                  }
                }}
                className="flex items-start gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-left font-manrope text-[11px] text-red-700/90 transition-all hover:bg-white hover:shadow-sm disabled:opacity-60"
              >
                {d.kind === "question" ? "☰ " : d.kind === "dimension" ? "▦ " : "⚙ "}
                <span className="underline decoration-dotted underline-offset-2">{d.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {gate?.ok && selVer?.status === "draft" && (
        <div
          key={selVer.id}
          className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
          <p className="font-manrope font-semibold text-sm text-teal-700">Siap terbit — tidak ada masalah. 🎉</p>
        </div>
      )}

      {gal?.open && (
        <MediaManager
          kind={gal.kind}
          code={gal.code}
          onPick={(u) => {
            gal.cb(u);
            setGal(null);
          }}
          onClose={() => setGal(null)}
        />
      )}

      <WorkingOverlay
        show={busyAny}
        label={
          mSaveQ.isPending
            ? "Menyimpan soal…"
            : mPub.isPending
              ? "Menerbitkan…"
              : mDimsAdd.isPending
                ? "Menambah dimensi…"
                : mReorder.isPending
                  ? "Menyimpan urutan…"
                  : "Menyimpan…"
        }
      />

      {importOpen && canEdit && (
        <ImportModal
          getVersionId={ensureDraft}
          dims={dims}
          mImport={mImport}
          onDone={() => setImportOpen(false)}
          onClose={() => setImportOpen(false)}
        />
      )}

      {verify && <ReleaseVerifyModal versionId={verify.vid} publish={mPub} onClose={() => setVerify(null)} />}

      {/* Preview memakai HALAMAN SISWA asli (rute take) di dalam iframe. */}
      <Dialog open={!!previewV} onOpenChange={(o) => !o && setPreviewV(null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] gap-3 sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">
              Preview sebagai siswa — v{previewV?.versionNumber}
              <button
                type="button"
                data-testid="preview-reload"
                onClick={() => setPreviewNonce(Date.now())}
                className="ml-2 rounded-lg border border-gray-200 px-2 py-0.5 font-manrope font-semibold text-[10px] text-gray-600 hover:bg-gray-50"
                title="Muat ulang preview (mis. setelah mengubah soal/setting)"
              >
                ⟳ Muat ulang
              </button>
              {previewV?.status !== "live" && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-amber-700">
                  belum dirilis
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              Tampilan ini memakai halaman tes siswa yang sebenarnya, dijalankan sebagai tamu preview — jawaban tidak
              tersimpan ke akun siapa pun.
            </DialogDescription>
          </DialogHeader>
          {previewV && (
            <iframe
              key={`${previewV.id}-${previewNonce}`}
              title="Preview tes sebagai siswa"
              data-testid="preview-frame"
              src={`/dashboard/student/assessment/take/${code}?preview=1&v=${previewV.id}&t=${previewNonce}`}
              className="h-[85vh] w-full rounded-xl border border-gray-200 bg-white"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="font-manrope text-[11px] text-muted-foreground">
              Rute: <code className="rounded bg-gray-100 px-1">/dashboard/student/assessment/take/{code}</code>
            </p>
            {previewV && (
              <a
                href={`/dashboard/student/assessment/take/${code}?preview=1&v=${previewV.id}&t=${previewNonce}`}
                target="_blank"
                rel="noopener"
                className="font-manrope font-semibold text-brand-navy text-xs hover:underline"
              >
                Buka di tab baru ↗
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkingOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <div className="fixed right-5 bottom-5 z-[95] flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 font-manrope font-semibold text-white text-xs shadow-2xl">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function ReleaseVerifyModal({ versionId, publish, onClose }: { versionId: string; publish: any; onClose: () => void }) {
  const { data: checks, isPending } = useQuery(
    orpc.discoverAdmin.versions.validate.queryOptions({ input: { versionId } }),
  );
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold font-bricolage text-base text-brand-navy">
            <ShieldCheck className="h-5 w-5 text-teal-600" /> Verifikasi sebelum rilis
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 font-manrope text-muted-foreground text-xs">
          Versi ini akan menjadi rilis utk siswa. Periksa kelengkapan dulu — seperti merge branch di GitHub.
        </p>
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          {isPending ? (
            <p className="flex items-center gap-2 font-manrope text-muted-foreground text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menjalankan verifikasi…
            </p>
          ) : checks?.ok ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <p className="font-manrope font-semibold text-teal-700 text-xs">
                Semua verifikasi lolos — versi siap dirilis.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {(checks?.errors ?? ["Ada masalah."]).map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-2 font-manrope text-[11px] text-red-700">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>
            Batal
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!checks?.ok || publish.isPending}
            onClick={() => void publish.mutateAsync({ versionId })}
          >
            {publish.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-1 h-4 w-4" />
            )}{" "}
            Aktifkan &amp; Rilis
          </Button>
        </div>
        {!checks?.ok && !isPending && (
          <p className="mt-2 text-center font-manrope text-[10px] text-muted-foreground">
            Perbaiki masalah di versi tersebut sebelum bisa dirilis.
          </p>
        )}
      </div>
    </div>
  );
}

function ImportModal({
  getVersionId,
  dims,
  mImport,
  onDone: _onDone,
  onClose,
}: {
  /** Resolver versi draf — draf dibuat saat impor benar-benar dijalankan. */
  getVersionId: () => Promise<string | null>;
  dims: Dim[];
  mImport: any;
  onDone: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; failed: string[]; dimsCreated?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const cols = [
    "Teks",
    "Dimensi",
    "Tipe",
    "Opsi A",
    "Opsi B",
    "Opsi C",
    "Opsi D",
    "Opsi E",
    "Opsi F",
    "Kunci",
    "Bobot",
    "Kunci Isian",
    "Cara nilai",
    "Toleransi",
  ];

  const downloadTemplate = async (asCsv: boolean) => {
    const XLSX: any = await import("xlsx");
    const sample = {
      Teks: "Kamu lebih suka bekerja dengan…",
      Dimensi: "R",
      Tipe: "pilihan",
      "Opsi A": "Data dan eksperimen ilmiah",
      "Opsi B": "Ide kreatif dan visual",
      "Opsi C": "",
      "Opsi D": "",
      "Opsi E": "",
      "Opsi F": "",
      Kunci: "A",
      Bobot: 1,
      "Kunci Isian": "",
      "Cara nilai": "",
      Toleransi: "",
    };
    const sample2 = {
      Teks: "Hitung 3/4 + 0",
      Dimensi: "NUM",
      Tipe: "isian",
      "Opsi A": "",
      "Opsi B": "",
      "Opsi C": "",
      "Opsi D": "",
      "Opsi E": "",
      "Opsi F": "",
      Kunci: "",
      Bobot: 1,
      "Kunci Isian": "0.75",
      "Cara nilai": "angka",
      Toleransi: "0.01",
    };
    const ws = XLSX.utils.aoa_to_sheet([cols, Object.values(sample), Object.values(sample2)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Soal");
    const data = asCsv
      ? XLSX.utils.sheet_to_csv(ws)
      : (XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer);
    const blob = new Blob([data], {
      type: asCsv ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = asCsv ? "template-soal.csv" : "template-soal.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    setResult(null);
    const XLSX: any = await import("xlsx");
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new Error("file xlsx tidak punya sheet");
    const ws = wb.Sheets[firstSheet];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
    const mapType = (v: any) => {
      const t = String(v ?? "").toLowerCase();
      if (t.includes("isian") || t.includes("text") || t.includes("ketik")) return "text_input";
      if (t.includes("skala") || t.includes("likert") || t.includes("kuisioner")) return "likert";
      if (t.includes("pilih") || t.includes("ganda") || t === "mc") return "multiple_choice";
      return undefined;
    };
    const mapPresentation = (v: any) => {
      const t = String(v ?? "").toLowerCase();
      if (t.includes("emoji") || t.includes("ikon")) return "emoji_option";
      if (t.includes("banding") || t.includes("visual")) return "visual_comparison";
      if (t.includes("gambar")) return "image_option";
      if (t) return "standard_option_card";
      return undefined;
    };
    const mapEval = (v: any) => {
      const t = String(v ?? "").toLowerCase();
      if (!t) return "exact_match";
      if (t.includes("kata") || t.includes("keyword")) return "keyword_match";
      if (t.includes("pola") || t.includes("regex") || t.includes("pattern")) return "pattern_match";
      if (t.includes("angka") || t.includes("numeric") || t.includes("toler")) return "numeric_tolerance";
      if (t.includes("persis") || t.includes("exact")) return "exact_match";
      return "exact_match";
    };
    setRows(
      raw
        .map((r) => ({
          text: String(r.Teks ?? r.Soal ?? ""),
          dimension: String(r.Dimensi ?? ""),
          type: mapType(r.Tipe),
          options: ["A", "B", "C", "D", "E", "F"]
            .map((l) => String(r[`Opsi ${l}`] ?? r[`Opsi${l}`] ?? ""))
            .filter((o) => o.trim().length > 0),
          key: String(r.Kunci ?? "A")
            .toUpperCase()
            .slice(0, 1),
          weight: Number(r.Bobot) || 1,
          answerKey: String(r["Kunci Isian"] ?? r.Jawaban ?? ""),
          evalType: mapEval(r["Cara nilai"]),
          numericTolerance: String(r.Toleransi ?? "0.01"),
          presentationMode: mapPresentation(r.Tampilan ?? r["Tampilan opsi"]),
        }))
        .filter((r: any) => r.text.trim()),
    );
  };

  const doImport = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try {
      const vid = await getVersionId();
      if (!vid) {
        notify.error("Tidak bisa mengimpor: gagal menyiapkan draf.");
        return;
      }
      const r = (await mImport.mutateAsync({ versionId: vid, rows })) as any;
      setResult({ created: r.created ?? 0, failed: r.failed ?? [] });
      notify.create(`Impor selesai — ${r.created ?? 0} soal ditambahkan`, {
        description: (r.failed ?? []).length
          ? `${r.failed.length} baris dilewati (lihat hasil).`
          : "Semua baris berhasil.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">Import Soal (CSV/Excel)</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 font-manrope text-muted-foreground text-xs">
          Kolom: Teks · Dimensi (kode/nama) · Tipe (pilihan/isian) · Opsi A–F · Kunci · Bobot · Kunci Isian · Cara nilai
          · Toleransi.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void downloadTemplate(false)}>
            ⬇ Unduh template .xlsx
          </Button>
          <Button size="sm" variant="outline" onClick={() => void downloadTemplate(true)}>
            ⬇ Unduh template .csv
          </Button>
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 border-dashed bg-gray-50/60 px-4 py-6 font-manrope text-gray-600 text-sm hover:border-brand-orange/40 hover:bg-gray-50">
          <FileUp className="h-5 w-5 text-brand-navy" />
          {fileName || "Pilih file .csv / .xlsx / .xls"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>

        {rows !== null && (
          <div className="mt-3">
            {(() => {
              const known = new Set<string>(dims.flatMap((d) => [d.code.toLowerCase(), d.name.toLowerCase()]));
              const unknown = [
                ...new Set(
                  rows
                    .map((r: any) =>
                      String(r.dimension ?? "")
                        .trim()
                        .toLowerCase(),
                    )
                    .filter((v: string) => v && !known.has(v)),
                ),
              ];
              return unknown.length > 0 ? (
                <p className="mb-1 rounded-lg bg-amber-50 px-2 py-1.5 font-manrope text-[10px] text-amber-700">
                  Dimensi <b>{unknown.length}</b> ini belum ada & akan <b>dibuat otomatis</b>: {unknown.join(", ")}
                </p>
              ) : null;
            })()}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100">
              <table className="w-full text-left font-manrope text-[11px]">
                <thead className="sticky top-0 bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Teks</th>
                    <th className="px-2 py-1">Dimensi</th>
                    <th className="px-2 py-1">Tipe</th>
                    <th className="px-2 py-1">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r: any, i: number) => {
                    const tipe = r.type ?? "multiple_choice";
                    const mc = tipe === "multiple_choice";
                    const bad = mc ? r.options.length < 2 : !r.answerKey.trim();
                    return (
                      <tr key={i} className={`border-gray-50 border-t ${bad ? "bg-red-50/50" : ""}`}>
                        <td className="px-2 py-1 text-gray-400">{i + 2}</td>
                        <td className="max-w-[200px] truncate px-2 py-1">{r.text}</td>
                        <td className="px-2 py-1">{r.dimension}</td>
                        <td className="px-2 py-1">
                          {mc ? `pilihan · ${r.options.length} opsi` : `isian · ${r.answerKey.trim() || "tanpa kunci"}`}
                        </td>
                        <td className="px-2 py-1">
                          {mc ? (
                            r.options.length >= 2 ? (
                              `${r.options.length} opsi [kunci ${r.key}]`
                            ) : (
                              <span className="text-red-600">min. 2 opsi!</span>
                            )
                          ) : r.answerKey.trim() ? (
                            `exact "${r.answerKey}"`
                          ) : (
                            <span className="text-amber-600">isi kunci setelah impor</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 50 && <p className="px-2 py-1 text-[10px] text-gray-400">… +{rows.length - 50} baris</p>}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <p className="font-manrope font-semibold text-teal-700 text-xs">
              {result.created} soal berhasil ditambahkan
              {result.dimsCreated?.length ? ` + ${result.dimsCreated.length} dimensi baru dibuat` : ""}.
            </p>
            {result.failed.length > 0 && (
              <ul className="mt-1 max-h-28 overflow-y-auto font-manrope text-[10px] text-red-700">
                {result.failed.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="font-manrope text-[11px] text-muted-foreground">{rows ? `${rows.length} baris terbaca` : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Tutup
            </Button>
            <Button
              className="bg-brand-navy hover:bg-brand-navy-light"
              disabled={!rows?.length || busy || mImport.isPending}
              onClick={() => void doImport()}
            >
              {busy || mImport.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-1 h-4 w-4" />
              )}{" "}
              Impor {rows?.length ?? 0} soal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaManager({
  onPick,
  onClose,
  kind = "question",
  code = "",
}: {
  onPick: (u: string) => void;
  onClose: () => void;
  kind?: "question" | "option";
  code?: string;
}) {
  const aClient = client as any;
  const qc = useQueryClient();
  const key = ["assess-media", code, kind];
  const { data, isPending } = useQuery({
    queryKey: key,
    queryFn: () => aClient.discoverAdmin.media.list({ kind, code }),
  });
  const items: { key: string; url: string; name: string; size: number }[] = data?.items ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const mUp = useMutation({
    mutationFn: (i: any) => aClient.discoverAdmin.media.upload(i),
    onSuccess: () => {
      notify.create("Gambar diunggah ✅");
      void invalidate();
    },
    onError: (e: any) => notify.error("Gagal unggah", { description: e?.message?.slice(0, 120) }),
  });
  const mDel = useMutation({
    mutationFn: (i: any) => aClient.discoverAdmin.media.delete(i),
    onSuccess: () => {
      void invalidate();
    },
    onError: (e: any) => notify.error("Gagal hapus", { description: e?.message?.slice(0, 120) }),
  });

  const onFile = async (f: File) => {
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result ?? "");
        res(s.split(",")[1] ?? "");
      };
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    const res = (await mUp.mutateAsync({
      dataB64: b64,
      mime: f.type || "image/png",
      filename: f.name,
      kind,
      code,
    })) as any;
    if (res?.url) {
      notify.create(
        kind === "question"
          ? "Gambar soal dipasang ✅ — cek preview di kanan"
          : "Gambar opsi dipasang ✅ — cek preview di kanan",
      );
      onPick(res.url);
    } // upload = langsung pasang + tutup
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">
            {kind === "question" ? "Galeri Gambar Soal" : "Galeri Gambar Jawaban/Opsi"}{" "}
            <span className="text-brand-navy/60">· {code || "test"} (R2)</span>
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 border-dashed bg-gray-50/60 px-4 py-4 font-manrope text-gray-600 text-sm hover:border-brand-orange/40">
          <Plus className="h-4 w-4 text-brand-navy" /> Unggah gambar {kind === "question" ? "soal" : "jawaban/opsi"}{" "}
          baru
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        {isPending && <p className="mt-2 font-manrope text-muted-foreground text-xs">Memuat…</p>}
        <div className="mt-3 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {items.map((o) => (
            <button
              type="button"
              key={o.key}
              onClick={() => onPick(o.url)}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            >
              {/* biome-ignore lint/performance/noImgElement: aset dari R2/CDN, domain dinamis */}
              <img
                src={o.url}
                alt={o.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                className="h-24 w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 hidden bg-black/50 px-1 py-0.5 font-manrope text-[9px] text-white group-hover:block">
                {o.name}
              </span>
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: tombol hapus pada kartu gambar (klik) */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: idem */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Hapus gambar ini?")) void mDel.mutateAsync({ key: o.key });
                }}
                className="absolute top-1 right-1 rounded-md bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
          {items.length === 0 && !isPending && (
            <p className="col-span-full py-6 text-center font-manrope text-muted-foreground text-xs">
              Belum ada gambar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MathPreview({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const katex = (await import("katex")).default;
        if (!ref.current || !alive) return;
        katex.render(text || "\\text{(isi rumus LaTeX di atas…)}", ref.current, {
          throwOnError: true,
          displayMode: true,
        });
        if (alive) setErr(null);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "LaTeX tidak valid");
      }
    })();
    return () => {
      alive = false;
    };
  }, [text]);
  return (
    <div className="rounded-xl border border-gray-200 border-dashed bg-gray-50/60 p-3">
      <p className="font-manrope font-semibold text-[10px] text-gray-400 uppercase tracking-wide">Pratinjau LaTeX</p>
      <div ref={ref} className="mt-1 min-h-[2rem] text-base" />
      {err && <p className="mt-1 font-manrope text-[10px] text-red-600">⚠ {err}</p>}
    </div>
  );
}

function QuestionPanel({
  q,
  versionId: _versionId,
  content,
  rules,
  onDone,
  onClose,
  openPicker,
}: {
  q?: any;
  versionId: string;
  content: Content;
  rules?: any;
  onDone: (payload: any) => void;
  onClose: () => void;
  openPicker?: (cb: (u: string) => void, kind?: "question" | "option") => void;
}) {
  const dims0 = content.dimensions ?? [];
  /** Nomor urut berikutnya di dimensi tsb — gate menolak urutan duplikat per dimensi. */
  const nextOrderFor = (dimId: string) =>
    content.questions
      .filter((x) => x.dimensionId === dimId)
      .reduce((m, x) => Math.max(m, (x.displayOrder ?? 0) + 1), 0);
  const [form, setForm] = useState<any>({
    id: q?.id,
    dimensionId: q?.dimensionId ?? content.dimensions[0]?.id ?? "",
    scaleId: q?.scaleId ?? null,
    questionText: q?.questionText ?? "",
    questionType: q?.questionType ?? "multiple_choice",
    weight: q?.weight ?? 1,
    displayOrder: q?.displayOrder ?? nextOrderFor(q?.dimensionId ?? content.dimensions[0]?.id ?? ""),
    hasMathNotation: q?.hasMathNotation ?? false,
    mediaUrl: q?.mediaUrl ?? "",
    mediaCaption: q?.mediaCaption ?? "",
    presentationMode: q?.presentationMode ?? "standard_option_card",
    durationSeconds: q?.durationSeconds ?? 0,
    options:
      (q?.opts?.length ?? 0) > 0
        ? q.opts.map((o: any) => ({
            id: o.id,
            optionValue: o.optionValue,
            label: o.label,
            score: o.score,
            imageUrl: o.imageUrl ?? null,
            imageCaption: o.imageCaption ?? null,
            icon: o.icon ?? null,
          }))
        : [
            { optionValue: "A", label: "", score: 1, icon: null },
            { optionValue: "B", label: "", score: 0, icon: null },
          ],
    textEval: q?.tc
      ? {
          evaluationType: q.tc.evaluationType ?? "numeric_tolerance",
          answerKey: q.tc.answerKey ?? "",
          numericTolerance: q.tc.numericTolerance ?? "0.01",
        }
      : { evaluationType: "numeric_tolerance", answerKey: "", numericTolerance: "0.01" },
  });
  const [busy, setBusy] = useState(false);
  const patch = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const patchOpt = (i: number, k: string, v: any) =>
    setForm((f: any) => {
      const o = [...f.options];
      o[i] = { ...o[i], [k]: v };
      return { ...f, options: o };
    });

  const issue = !form.questionText.trim()
    ? "Teks soal wajib diisi"
    : dims0.length === 0
      ? "Belum ada dimensi — tambahkan di 'Aturan tes'."
      : !form.dimensionId
        ? "Pilih dimensi untuk soal ini."
        : form.questionType !== "text_input" &&
            form.options.filter((o: any) => String(o.label || "").trim() || o.imageUrl || o.icon).length < 2
          ? "Butuh minimal 2 opsi/skala."
          : "";
  const [_formErr, setFormErr] = useState<string[]>([]);
  const save = async () => {
    if (issue) {
      notify.error(issue);
      return;
    }
    setBusy(true);
    setFormErr([]);
    try {
      await onDone({
        id: form.id,
        dimensionId: form.dimensionId,
        scaleId: form.scaleId ?? null,
        questionText: form.questionText,
        questionType: form.questionType,
        hasMathNotation: !!form.hasMathNotation,
        mediaUrl: form.mediaUrl || null,
        mediaCaption: form.mediaCaption || null,
        presentationMode: form.presentationMode ?? "standard_option_card",
        durationSeconds: Number(form.durationSeconds) > 0 ? Number(form.durationSeconds) : null,
        weight: Number(form.weight) || 1,
        displayOrder: Number(form.displayOrder ?? 0),
        isActive: true,
        options:
          form.questionType !== "text_input"
            ? form.options
                .filter((o: any) => String(o.label || "").trim() || o.imageUrl || o.icon)
                .map((o: any, i: number) => ({
                  id: o.id,
                  optionValue: o.optionValue || "ABCDEF"[i],
                  label: o.label,
                  score: o.score,
                  imageUrl: o.imageUrl ?? null,
                  imageCaption: o.imageCaption ?? null,
                  icon: o.icon ?? null,
                  targetDimension: form.dimensionId,
                  displayOrder: i,
                }))
            : [],
        textEval: form.questionType === "text_input" && form.textEval.answerKey ? form.textEval : null,
      });
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.message ?? "Gagal menyimpan soal.";
      const issues: string[] = (e?.data?.issues ?? []).map(
        (x: any) => `Field "${(x.path ?? []).join(".")}" — ${x.message}`,
      );
      setFormErr([msg, ...issues.slice(0, 4)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold font-bricolage text-base text-brand-navy">
          {form.id ? "Ubah soal" : "Tambah soal"}{" "}
          <span className="ml-1 rounded-md bg-teal-500/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-teal-700">
            preview live di samping
          </span>
        </h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom */}
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Teks soal
            <Input
              className="mt-1"
              data-testid="q-text"
              value={form.questionText}
              onChange={(e) => patch("questionText", e.target.value)}
              placeholder="cth: Kamu lebih suka bekerja dengan…"
            />
          </label>
          <label className="flex items-center gap-2 font-manrope font-medium text-gray-700 text-xs">
            <input
              type="checkbox"
              checked={form.hasMathNotation === true}
              onChange={(e) => patch("hasMathNotation", e.target.checked)}
              className="accent-brand-orange"
            />
            Soal berisi rumus matematika (LaTeX $…$ — di-parse otomatis)
          </label>
          {form.hasMathNotation && <MathPreview text={form.questionText} />}
          <div className="rounded-xl border border-teal-200/70 bg-teal-50/40 p-3">
            <p className="flex items-center gap-1.5 font-bold font-manrope text-[10px] text-teal-700 uppercase tracking-wide">
              🖼️ Gambar SOAL{" "}
              <span className="font-normal text-teal-600/70 normal-case">— hanya utk teks soal (bukan jawaban)</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom */}
              <label className="block font-manrope font-semibold text-foreground text-xs">
                URL gambar soal
                <Input
                  className="mt-1"
                  value={form.mediaUrl}
                  onChange={(e) => patch("mediaUrl", e.target.value)}
                  placeholder="https://cdn…/soal.png"
                />
                {openPicker && (
                  <button
                    type="button"
                    onClick={() => openPicker((u) => patch("mediaUrl", u), "question")}
                    className="mt-1 inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 font-manrope font-semibold text-[10px] text-white hover:bg-teal-700"
                  >
                    📁 Galeri gambar soal
                  </button>
                )}
              </label>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom */}
              <label className="block font-manrope font-semibold text-foreground text-xs">
                Keterangan gambar
                <Input
                  className="mt-1"
                  value={form.mediaCaption}
                  onChange={(e) => patch("mediaCaption", e.target.value)}
                  placeholder="Gambar 1.1: …"
                />
              </label>
            </div>
          </div>
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Tampilan pilihan
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm"
              data-testid="q-presentation"
              value={form.presentationMode}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f: any) => ({
                  ...f,
                  presentationMode: v,
                  options:
                    v === "standard_option_card" ? f.options.map((o: any) => ({ ...o, imageUrl: null })) : f.options,
                }));
              }}
            >
              <option value="standard_option_card">Kartu standar (teks)</option>
              <option value="emoji_option">Emoji / ikon (teks + gambar)</option>
              <option value="image_option">Gambar per opsi (teks + gambar)</option>
              <option value="visual_comparison">Banding visual besar (teks + gambar)</option>
            </select>
            <span className="mt-1 block font-manrope text-[10px] text-muted-foreground">
              {form.presentationMode === "standard_option_card"
                ? "Opsi berupa teks saja."
                : "Opsi berisi teks + gambar (upload aset dari galeri)."}
            </span>
          </label>
          {rules?.timer_scope === "question" && (
            // biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom
            <label className="block font-manrope font-semibold text-foreground text-xs">
              Detik soal ini (timer per soal)
              <Input
                type="number"
                className="mt-1"
                value={form.durationSeconds ?? 0}
                onChange={(e) => patch("durationSeconds", Number(e.target.value))}
                placeholder="cth: 10"
              />
              <span className="mt-0.5 block font-manrope font-normal text-[10px] text-muted-foreground">
                Kosongkan/0 = pakai default. Tiap soal bisa beda (10s, 20s, …).
              </span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom */}
            <label className="block font-manrope font-semibold text-foreground text-xs">
              Bobot soal (utk metode Bobot)
              <Input
                type="number"
                className="mt-1"
                value={form.weight ?? 1}
                onChange={(e) => patch("weight", Number(e.target.value))}
              />
            </label>
            <label className="block font-manrope font-semibold text-foreground text-xs">
              Skala jawaban
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm"
                value={form.scaleId ?? ""}
                onChange={(e) => patch("scaleId", e.target.value || null)}
              >
                <option value="">Bawaan otomatis</option>
                {(content.scales ?? []).map((sx: any) => (
                  <option key={sx.id} value={sx.id}>
                    {sx.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-manrope font-semibold text-foreground text-xs">
              Dimensi
              <select
                className={
                  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" +
                  (dims0.length === 0 ? "bg-gray-50 text-gray-400" : "")
                }
                data-testid="q-dimension"
                value={form.dimensionId}
                onChange={(e) => {
                  const dim = e.target.value;
                  if (!form.id) setForm((f: any) => ({ ...f, dimensionId: dim, displayOrder: nextOrderFor(dim) }));
                  else patch("dimensionId", dim);
                }}
              >
                {dims0.length === 0 && <option value="">— belum ada dimensi —</option>}
                {dims0.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block font-manrope font-semibold text-foreground text-xs">
              Jenis jawaban
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm"
                data-testid="q-type"
                value={form.questionType}
                onChange={(e) => {
                  const next = e.target.value;
                  patch("questionType", next);
                  // Soal skala baru: isi 5 titik emoji (bukan 2 opsi kosong) supaya
                  // langsung valid & tidak memicu error gate "titik skala < 2".
                  if (next === "likert" && form.options.every((o: any) => !String(o.label || "").trim() && !o.icon)) {
                    const cap = ["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"];
                    const emo = ["😡", "🙁", "😐", "🙂", "😍"];
                    patch(
                      "options",
                      cap.map((c, i) => ({
                        optionValue: "ABCDE"[i],
                        label: c,
                        imageCaption: c,
                        score: i + 1,
                        imageUrl: null,
                        icon: emo[i],
                      })),
                    );
                  }
                }}
              >
                <option value="multiple_choice">Pilihan ganda</option>
                <option value="likert">Skala Likert 1–5 (kuisioner)</option>
                <option value="text_input">Mengetik jawaban</option>
              </select>
            </label>
          </div>
          {form.questionType !== "text_input" ? (
            <div className="space-y-2">
              <p className="font-bold font-manrope text-[10px] text-orange-600 uppercase tracking-wide">
                🖼️ Gambar JAWABAN — per pilihan (A/B/C/D), terpisah dr gambar soal
              </p>
              <p className="font-manrope font-semibold text-foreground text-xs">
                {rules.scoring_mode === "likert"
                  ? `Skala Likert ${rules.likert_min ?? 1}–${rules.likert_max ?? 5} — poin naik linier per pilihan`
                  : form.presentationMode === "standard_option_card"
                    ? "Pilihan teks — pilihan yang dipilih mendapat poin untuk dimensinya, sisanya 0"
                    : "Pilihan teks + gambar — pilihan yang dipilih mendapat poin untuk dimensinya, sisanya 0"}
              </p>
              {form.options.map((o: any, i: number) => (
                <div key={i} className="space-y-1.5 rounded-xl border border-gray-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-100 font-bold text-[9px] text-gray-500">
                      {o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}
                    </span>
                    {form.presentationMode === "emoji_option" && (
                      <input
                        value={o.icon ?? ""}
                        onChange={(e) => patchOpt(i, "icon", e.target.value)}
                        placeholder="😀"
                        title="Emoji / ikon utk opsi ini"
                        className="w-12 rounded-lg border border-gray-200 px-1 py-1 text-center font-manrope text-sm"
                      />
                    )}
                    <Input
                      className="flex-1"
                      data-testid={`q-option-label-${i}`}
                      placeholder={`Pilihan ${["A", "B", "C", "D", "E", "F"][i]} (kosongkan bila hanya gambar)`}
                      value={o.label}
                      onChange={(e) => patchOpt(i, "label", e.target.value)}
                    />
                    {form.questionType === "likert" ? (
                      <Input
                        className="w-40"
                        placeholder="Label skala (cth: Sangat suka)"
                        value={o.imageCaption ?? ""}
                        onChange={(e) => patchOpt(i, "imageCaption", e.target.value)}
                      />
                    ) : (
                      <Input
                        type="number"
                        className="w-16"
                        data-testid={`q-option-score-${i}`}
                        title="Bobot (mode Bobot bebas)"
                        value={o.score}
                        onChange={(e) => patchOpt(i, "score", Number(e.target.value))}
                      />
                    )}
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          patch(
                            "options",
                            form.options.filter((_: any, x: number) => x !== i),
                          )
                        }
                        className="text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {(o.imageUrl || true) &&
                    (o.imageUrl ? (
                      <div className="flex items-center gap-2">
                        {/* biome-ignore lint/performance/noImgElement: aset dari R2/CDN, domain dinamis */}
                        <img
                          src={o.imageUrl}
                          alt=""
                          className="h-10 w-14 rounded-lg border border-gray-200 object-cover"
                        />
                        <Input
                          className="flex-1"
                          value={o.imageUrl}
                          onChange={(e) => patchOpt(i, "imageUrl", e.target.value)}
                          placeholder="URL gambar…"
                        />
                        {openPicker && (
                          <button
                            type="button"
                            onClick={() => openPicker((u: string) => patchOpt(i, "imageUrl", u), "option")}
                            className="inline-flex shrink-0 items-center gap-1 font-manrope font-semibold text-[10px] text-teal-600 hover:text-teal-700"
                          >
                            📁 Gambar jawaban {o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => patchOpt(i, "imageUrl", null)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : openPicker ? (
                      <button
                        type="button"
                        onClick={() => openPicker((u: string) => patchOpt(i, "imageUrl", u), "option")}
                        className="inline-flex items-center gap-1 font-manrope font-semibold text-[10px] text-teal-600 hover:text-teal-700"
                      >
                        📁 + pasang gambar jawaban utk opsi ini
                      </button>
                    ) : null)}
                </div>
              ))}
              {form.questionType === "likert" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="q-preset-likert"
                    onClick={() => {
                      const cap = ["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"];
                      const lv = [1, 2, 3, 4, 5].map((v, i) => ({
                        optionValue: "ABCDEF"[i],
                        label: String(v),
                        imageCaption: cap[i],
                        score: v,
                        imageUrl: null,
                        icon: null,
                      }));
                      patch("options", lv);
                    }}
                    className="rounded-lg border border-brand-navy/30 border-dashed bg-brand-navy/5 px-3 py-2 font-manrope font-semibold text-[11px] text-brand-navy hover:bg-brand-navy/10"
                  >
                    🔢 Skala angka 1–5 + label
                  </button>
                  <button
                    data-testid="q-preset-emoji"
                    type="button"
                    onClick={() => {
                      const cap = ["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"];
                      const emo = ["😡", "🙁", "😐", "🙂", "😍"];
                      const lv = emo.map((e, i) => ({
                        optionValue: "ABCDEF"[i],
                        label: e,
                        imageCaption: cap[i],
                        score: i + 1,
                        imageUrl: null,
                        icon: e,
                      }));
                      patch("options", lv);
                    }}
                    className="rounded-lg border border-brand-orange/40 border-dashed bg-brand-orange/5 px-3 py-2 font-manrope font-semibold text-[11px] text-brand-orange hover:bg-brand-orange/10"
                  >
                    😍 Skala emoticon + label
                  </button>
                  <span className="self-center font-manrope text-[10px] text-gray-400">
                    label bawah = tampilan; bobot tersembunyi
                  </span>
                </div>
              )}
              {rules.scoring_mode === "likert" && (
                <button
                  type="button"
                  data-testid="q-preset-likert-auto"
                  onClick={() => {
                    const mn = Number(rules.likert_min ?? 1);
                    const mx = Number(rules.likert_max ?? 5);
                    const lv: any[] = [];
                    for (let v = mn; v <= mx; v++)
                      lv.push({
                        optionValue: "ABCDEF"[lv.length],
                        label: String(v),
                        score: v - mn + 1,
                        imageUrl: null,
                        icon: null,
                      });
                    patch("options", lv);
                  }}
                  className="w-full rounded-lg border border-brand-orange/40 border-dashed bg-brand-orange/5 px-3 py-2 font-manrope font-semibold text-[11px] text-brand-orange hover:bg-brand-orange/10"
                >
                  ⚖ Isi otomatis skala Likert {rules.likert_min ?? 1}–{rules.likert_max ?? 5} (poin naik linier)
                </button>
              )}
              {form.options.length < 6 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patch("options", [
                      ...form.options,
                      { optionValue: "ABCDEF"[form.options.length], label: "", score: 0, imageUrl: null, icon: null },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Tambah pilihan
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block font-manrope font-semibold text-foreground text-xs">
                Cara nilai
                <select
                  data-testid="q-eval-type"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm"
                  value={form.textEval.evaluationType}
                  onChange={(e) => patch("textEval", { ...form.textEval, evaluationType: e.target.value })}
                >
                  <option value="exact_match">Persis sama</option>
                  <option value="numeric_tolerance">Angka + toleransi</option>
                  <option value="keyword_match">Mengandung kata kunci (pisah dengan |)</option>
                  <option value="pattern_match">Pola regex</option>
                </select>
              </label>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom */}
              <label className="block font-manrope font-semibold text-foreground text-xs">
                Kunci jawaban
                <Input
                  data-testid="q-answer-key"
                  className="mt-1"
                  value={form.textEval.answerKey}
                  onChange={(e) => patch("textEval", { ...form.textEval, answerKey: e.target.value })}
                  placeholder={
                    form.textEval.evaluationType === "keyword_match"
                      ? "cth: jakarta|bandung"
                      : form.textEval.evaluationType === "pattern_match"
                        ? "cth: ^[0-9]{3}$"
                        : "cth: 0.75 atau 3/4"
                  }
                />
              </label>
              {form.textEval.evaluationType === "numeric_tolerance" && (
                // biome-ignore lint/a11y/noLabelWithoutControl: label membungkus komponen <Input/> kustom
                <label className="block font-manrope font-semibold text-foreground text-xs">
                  Toleransi angka
                  <Input
                    data-testid="q-tolerance"
                    className="mt-1"
                    value={form.textEval.numericTolerance}
                    onChange={(e) => patch("textEval", { ...form.textEval, numericTolerance: e.target.value })}
                    placeholder="0.01"
                  />
                </label>
              )}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4" data-testid="student-preview">
          <p className="font-manrope font-semibold text-[10px] text-teal-600 uppercase tracking-wide">Tampilan siswa</p>
          <p className="mt-2 font-manrope text-[10px] text-gray-400">
            {content.dimensions.find((d) => d.id === form.dimensionId)?.name ?? "Dimensi"}
          </p>
          <h4 className="mt-1 font-bold font-bricolage text-gray-900 text-sm leading-snug">
            {form.hasMathNotation ? <MathPreview text={form.questionText} /> : form.questionText || "Teks soal…"}
          </h4>
          {form.mediaUrl ? (
            <figure className="mt-2">
              {/* biome-ignore lint/performance/noImgElement: aset dari R2/CDN, domain dinamis */}
              <img
                src={form.mediaUrl}
                alt={form.mediaCaption ?? "Gambar soal"}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><rect width='100%25' height='100%25' fill='%23f5f5f5'/><text x='50%25' y='55%25' font-size='11' fill='%23b0b0b0' text-anchor='middle' font-family='sans-serif'>GAMBAR RUSAK</text></svg>";
                }}
                className="mx-auto max-h-40 rounded-xl border border-gray-100 object-contain"
              />
              {form.mediaCaption && (
                <figcaption className="mt-1 text-center font-manrope text-[10px] text-gray-400">
                  {form.mediaCaption}
                </figcaption>
              )}
            </figure>
          ) : (
            <p className="mt-2 rounded-lg border border-gray-200 border-dashed px-3 py-2 text-center font-manrope text-[10px] text-gray-400">
              Gambar soal belum dipasang — klik “📁 Galeri gambar soal” lalu pilih / unggah.
            </p>
          )}
          {form.questionType === "likert" ? (
            // Samakan dengan halaman siswa: emoji dari kolom `icon`, caption sekali saja.
            // (Sebelumnya preview mencetak `label` + `imageCaption` sekaligus — di bank kita
            // keduanya berisi caption yang sama, jadi tampil dobel dan emojinya hilang.)
            <div className="mt-2 space-y-1.5">
              {form.options.slice(0, 6).map((o: any, i: number) => {
                const glyph = String(o.icon || o.label || i + 1);
                const caption = String(o.imageCaption || (o.icon ? (o.label ?? "") : ""));
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                    {/^\d+$/.test(glyph) ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center font-bold font-bricolage text-base text-gray-900">
                        {glyph}
                      </span>
                    ) : (
                      <AnimatedEmoji emoji={glyph} size={30} testId="preview-likert-emoji" />
                    )}
                    <span className="min-w-0 flex-1 font-manrope text-[11px] text-gray-700">{caption}</span>
                    <span className="flex h-4 w-4 shrink-0 rounded-full border-2 border-gray-200" />
                  </div>
                );
              })}
            </div>
          ) : form.questionType === "multiple_choice" ? (
            <div
              className={`mt-2 ${form.presentationMode === "visual_comparison" ? "grid grid-cols-2 gap-2" : "space-y-1.5"}`}
            >
              {form.options
                .filter((o: any) => String(o.label || "").trim() || o.imageUrl || o.icon)
                .map((o: any, i: number) => {
                  // Tandai KUNCI (skor > 0), bukan "opsi pertama" — dulu opsi A selalu
                  // ter-highlight padahal belum tentu jawabannya.
                  const isKey = Number(o.score ?? 0) > 0 && rules.scoring_mode !== "likert";
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 ${isKey ? "border-teal-500/60 bg-teal-500/5" : "border-gray-200 bg-white"}`}
                    >
                      {form.presentationMode === "emoji_option" && o.icon ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-base">
                          {o.icon}
                        </span>
                      ) : (
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-[9px] ${isKey ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}
                        >
                          {o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}
                        </span>
                      )}
                      {o.imageUrl && (
                        // biome-ignore lint/performance/noImgElement: aset dari R2/CDN, domain dinamis
                        <img
                          src={o.imageUrl}
                          alt=""
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                          className="h-8 w-11 shrink-0 rounded-md border border-gray-100 object-cover"
                        />
                      )}
                      {String(o.label || "").trim() && (
                        <span className="font-manrope text-gray-700 text-xs">{o.label}</span>
                      )}
                      {isKey && (
                        <span className="ml-auto rounded bg-teal-500/10 px-1.5 py-0.5 font-bold font-manrope text-[9px] text-teal-700">
                          kunci
                        </span>
                      )}
                      {rules.scoring_mode === "likert" && (
                        <span className="ml-auto rounded bg-brand-navy/5 px-1.5 py-0.5 font-bold font-manrope text-[9px] text-brand-navy">
                          {o.score} pts
                        </span>
                      )}
                    </div>
                  );
                })}
              {rules.scoring_mode === "likert" && form.options.length === 0 && (
                <p className="font-manrope text-[10px] text-gray-400">
                  Klik "Isi otomatis skala Likert" utk membuat pilihan skala.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    form.textEval.evaluationType === "numeric_tolerance" ? "Ketik angka… (cth 0.75)" : "Ketik jawaban…"
                  }
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.,/-]/g, "");
                    if (v !== e.target.value) e.target.value = v;
                  }}
                  className="flex-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5 font-manrope text-xs outline-none focus:border-teal-400"
                />
                <span className="rounded-md bg-brand-navy px-3 py-1.5 font-manrope font-semibold text-[10px] text-white">
                  Jawab
                </span>
              </div>
              {form.textEval.answerKey && (
                <p className="mt-1.5 font-manrope text-[10px] text-gray-400">
                  Kunci: {form.textEval.answerKey}
                  {form.textEval.evaluationType === "numeric_tolerance"
                    ? ` (toleransi ${form.textEval.numericTolerance || "0.01"})`
                    : ""}{" "}
                  · tipe {form.textEval.evaluationType}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Batal
        </Button>
        {issue && <p className="mr-auto self-center font-manrope font-medium text-[11px] text-red-600">{issue}</p>}
        <Button
          data-testid="q-save"
          className="bg-brand-navy hover:bg-brand-navy-light"
          onClick={save}
          disabled={busy || !!issue}
        >
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-1 h-4 w-4" />} Simpan
          soal
        </Button>
      </div>
    </div>
  );
}
