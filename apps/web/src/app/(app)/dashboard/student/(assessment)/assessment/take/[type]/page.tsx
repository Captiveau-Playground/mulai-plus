"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, Check, Home, Sparkles, Timer, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatedEmoji } from "@/components/assessment/animated-emoji";
import { Latex } from "@/components/assessment/latex";
import { StreakFlame } from "@/components/assessment/streak-flame";
import { trackEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

type Question = {
  id: string;
  text: string;
  dimension: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  answered: string | null;
};

function fireConfetti() {
  const colors = ["#1a1f6d", "#0d9488", "#fe9114", "#f93447"];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
}

export default function TmbTestPage() {
  const t = String(useParams().type ?? "");
  return (
    <Suspense
      fallback={<div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-bg-light" />}
    >
      <TestRoute code={t} />
    </Suspense>
  );
}

/**
 * Rute tes siswa. Mendukung mode preview (dipakai admin dari editor):
 *   ?preview=1      → tanpa login, studentId sintetis (tidak mencemari data siswa)
 *   &v=<versionId>  → memaksa konten versi tertentu (mis. draf yang sedang disunting)
 */
function TestRoute({ code }: { code: string }) {
  const search = useSearchParams();
  const preview = search?.get("preview") === "1";
  const versionId = search?.get("v");
  // Preview admin: engine dipakai untuk SEMUA kode (termasuk tes kustom), supaya yang
  // dilihat admin persis halaman tes siswa dengan konten versi yang dipilih.
  if (preview || code === "DISCOVER" || code === "TALENT")
    return <EngineWrapper code={code} preview={preview} versionId={versionId} />;
  return <LegacyWizard />;
}

function EngineWrapper({
  code,
  preview = false,
  versionId = null,
}: {
  code: string;
  preview?: boolean;
  versionId?: string | null;
}) {
  const [ready, setReady] = useState<{
    sessionId: string;
    questions: any[];
    dims: any[];
    otherCode: string;
    otherLabel: string;
    studentId: string;
    sections: number;
    secData?: any[];
    instr?: any[];
    sectionMode?: string;
    allowPause?: boolean;
  } | null>(null);
  const [errg, setErrg] = useState("");
  const { data: authSession } = authClient.useSession();
  const startedRef = useRef(false);
  // id preview dibuat sekali per mount (tidak memicu loop & tidak menyentuh data siswa)
  const previewSid = useMemo(() => (preview ? `preview-${Math.random().toString(36).slice(2, 9)}` : null), [preview]);
  const sid = previewSid ?? authSession?.user?.id;
  useEffect(() => {
    if (!sid) return;
    if (startedRef.current) return; // StrictMode/dev double-mount → jangan start 2x
    startedRef.current = true;
    (async () => {
      try {
        const cfg = (await client.discover.config(versionId ? ({ versionId } as any) : ({ code } as any))) as any;
        const st = (await client.discover.start({
          code,
          studentId: sid,
          versionId: versionId ?? undefined,
        } as any)) as any;
        // (M2.3) Kelas punya jadwal & sedang di luar window → tampilkan pesan jadwal,
        // bukan error generik. (Server tetap sumber kebenaran penolakannya.)
        if (st?.ok === false) {
          const fmt = (iso?: string | null) =>
            iso
              ? new Date(iso).toLocaleString("id-ID", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
          const kelas = (st as any).className ? `kelas ${(st as any).className}` : "kelasmu";
          setErrg(
            (st as any).error === "window_not_started"
              ? `Tes untuk ${kelas} dibuka mulai ${fmt((st as any).windowStart)}.`
              : (st as any).error === "window_ended"
                ? `Jadwal tes untuk ${kelas} sudah berakhir (${fmt((st as any).windowStart)} – ${fmt((st as any).windowEnd)}).`
                : "Gagal memuat tes",
          );
          return;
        }
        setReady({
          sessionId: st.sessionId,
          questions: (cfg.questions ?? []).filter((q: any) => q.isActive),
          dims: cfg.dimensions ?? [],
          otherCode: code === "DISCOVER" ? "TALENT" : "DISCOVER",
          otherLabel: code === "DISCOVER" ? "Tes Bakat" : "Tes Minat",
          studentId: sid,
          sections: (cfg.runSections ?? []).length,
          secData: cfg.sections ?? [],
          instr: cfg.instructions ?? [],
          // Config yang HARUS dihormati UI siswa:
          //  section_mode "none" → tanpa layar per bagian/instruksi (soal mengalir terus)
          //  allow_pause false   → tombol jeda disembunyikan
          sectionMode: (cfg.config?.section_mode ?? "none") as string,
          allowPause: cfg.config?.allow_pause !== false,
        });
      } catch (e: any) {
        setErrg(e?.message ?? "Gagal memuat tes");
      }
    })();
  }, [code, sid, versionId]);
  if (errg)
    return (
      <div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-bg-light p-4">
        <p className="font-manrope text-red-500 text-sm">{errg}</p>
      </div>
    );
  if (!ready)
    return (
      <div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-bg-light">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  return (
    <LegacyWizard
      engine={{
        code,
        sessionId: ready.sessionId,
        questions: ready.questions,
        dims: ready.dims,
        otherCode: ready.otherCode,
        otherLabel: ready.otherLabel,
        studentId: ready.studentId,
        sections: ready.sections,
        secData: ready.secData ?? [],
        instr: ready.instr ?? [],
        sectionMode: ready.sectionMode,
        allowPause: ready.allowPause,
      }}
    />
  );
}

function LegacyWizard({
  engine,
}: {
  engine?: {
    code: string;
    sessionId: string;
    questions: any[];
    dims: any[];
    otherCode: string;
    otherLabel: string;
    studentId: string;
    sections?: number;
    secData?: any[];
    instr?: any[];
    sectionMode?: string;
    allowPause?: boolean;
  };
}) {
  const isEngine = !!engine;
  // Mode bagian: hanya bila config section_mode ≠ "none". Saat "none", soal mengalir tanpa
  // layar "Bagian X dari Y" + instruksi dimensi (permintaan analis untuk Tes Minat), dan tetap
  // bisa diatur dari editor (Aturan tes → pembagian bagian).
  const sectionsOn = isEngine && (engine?.sectionMode ?? "none") !== "none";
  const allowPause = engine?.allowPause !== false;
  // (Temuan analis #2) Di PREVIEW admin, "Keluar" JANGAN bernavigasi ke area siswa
  // (dulu iframe preview terlempar ke dashboard student). Kirim pesan ke parent →
  // editor menutup dialog preview.
  const isPreviewMode =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
  const keluar = () => {
    if (isPreviewMode) {
      try {
        window.parent?.postMessage({ type: "assessment-preview-exit" }, "*");
      } catch {
        /* abaikan */
      }
      return;
    }
    router.push("/dashboard/student/assessment");
  };
  /** Tombol keleluar (X) yang bisa dipakai di layar mana pun: intro, bagian, overlay. */
  const exitBtn = (
    <button
      type="button"
      onClick={() => setExitOpen(true)}
      aria-label="Keluar test"
      data-testid="exit-button"
      className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-sm transition-colors hover:bg-gray-200"
    >
      <X className="h-4 w-4" />
    </button>
  );
  /** Cegat klik Link saat preview (halaman selesai/CTA) agar tidak pindah rute. */
  const guardLink = (e: React.MouseEvent) => {
    if (!isPreviewMode) return;
    e.preventDefault();
    keluar();
  };
  const engineQs = engine?.questions ?? [];
  const [orderIds, setOrderIds] = useState<string[] | null>(null); // urutan soal sesi (ujian) — stabil utk resume & grid
  const [answeredSet, setAnsweredSet] = useState<Set<string> | null>(null);
  const answeredRef = useRef<Set<string> | null>(null);
  const effQs: any[] = orderIds
    ? orderIds.map((id) => engineQs.find((q: any) => q.id === id)).filter(Boolean)
    : engineQs;
  const [eq, setEq] = useState(0);
  const [intro, setIntro] = useState<boolean | null>(isEngine ? null : false); // null = masih cek resume → jangan render intro dulu
  const introStarted = useRef(false);
  const resumeStartRef = useRef(0);
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!isEngine || !engine?.sessionId || resumedRef.current) return;
    resumedRef.current = true;
    (async () => {
      try {
        const rs = (await (client as any).discover.session({ sessionId: engine?.sessionId })) as any;
        const answeredSetNow: Set<string> = new Set((rs?.answers ?? []).map((a: any) => String(a.questionId)));
        setAnsweredSet(answeredSetNow);
        answeredRef.current = answeredSetNow;
        // jawaban per soal → ur-UI (pilihan: huruf; isian: teks)
        const letterById = new Map<string, string>();
        for (const qq of engineQs) for (const oo of qq?.opts ?? []) letterById.set(oo.id, oo.optionValue ?? "");
        const map: Record<string, { letter?: string; text?: string }> = {};
        for (const a of rs?.answers ?? []) {
          map[String(a.questionId)] = {
            ...(a.optionId && letterById.get(String(a.optionId)) ? { letter: letterById.get(String(a.optionId)) } : {}),
            ...(typeof a.text === "string" && a.text ? { text: String(a.text) } : {}),
          };
        }
        setSavedByQ(map);
        if (rs?.orderIds?.length) setOrderIds(rs.orderIds); // urutan SAMA dgn saat jawab (konsep ujian)
        if (answeredSetNow.size > 0) {
          // RESUME: lewati intro → posisi soal pertama yg belum dijawab sesuai urutan sesi
          const order: string[] = (rs?.orderIds ?? []).length ? rs.orderIds : engineQs.map((q2: any) => q2.id);
          const fi = order.findIndex((id: string) => !answeredSetNow.has(id));
          resumeStartRef.current = fi >= 0 ? fi : 0;
          setIntro(false);
        } else {
          setIntro(true);
        }
      } catch {
        setIntro(true);
      }
    })();
  }, [isEngine, engine?.sessionId, engineQs.map, engineQs]);
  const otherDoneQ = useQuery({
    queryKey: ["engine-other-done", engine?.code, engine?.studentId],
    enabled: isEngine && !!engine?.studentId,
    queryFn: () => (client as any).discover.resultsFor({ code: engine?.otherCode, studentId: engine?.studentId }),
  });
  const otherDone = isEngine ? (otherDoneQ.data as any)?.present === true : false;
  const attQ = useQuery({
    queryKey: ["engine-attempts", engine?.studentId],
    enabled: isEngine && !!engine?.studentId,
    queryFn: () => (client as any).discover.attempts({ studentId: engine?.studentId }),
  });
  const attempts: any[] = (attQ.data as any)?.attempts ?? [];
  const attemptNo =
    attempts.length === 0 ? 1 : attempts[attempts.length - 1]?.complete ? attempts.length + 1 : attempts.length;
  const params = useParams();
  const router = useRouter();
  const testCode = isEngine
    ? engine?.code === "DISCOVER"
      ? "interest"
      : "ability"
    : (params.type as string) === "ability"
      ? "ability"
      : "interest";
  const isInterest = testCode === "interest";
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [demoIdx, setDemoIdx] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const DEMO_QUESTIONS = [
    // 2 soal minat (2 opsi)
    {
      id: "dm1",
      text: "Kamu lebih menikmati kegiatan mana?",
      dimension: "Social",
      optionA: "Mengorganisir acara kematemanan bersama banyak orang",
      optionB: "Menganalisis data di depan laptop sendirian",
      optionC: null,
      optionD: null,
      correct: null,
    },
    {
      id: "dm2",
      text: "Ketika tugas kelompok, kamu paling nyaman sebagai…",
      dimension: "Enterprising",
      optionA: "Pemimpin yang menentukan arah",
      optionB: "Eksekutor yang mengeksekusi detail",
      optionC: null,
      optionD: null,
      correct: null,
    },
    // 2 soal bakat (4 opsi, kunci = B)
    {
      id: "db1",
      text: "Pilih pola yang paling logis: 2, 4, 8, 16, …",
      dimension: "Numerik",
      optionA: "20",
      optionB: "32",
      optionC: "24",
      optionD: "64",
      correct: "B",
    },
    {
      id: "db2",
      text: "Jika hari ini Rabu, 10 hari lagi hari…?",
      dimension: "Logika",
      optionA: "Jumat",
      optionB: "Sabtu",
      optionC: "Rabu",
      optionD: "Senin",
      correct: "B",
    },
  ];

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [bothDone, setBothDone] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [_correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [_lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState(0);
  const [_xpFlash, setXpFlash] = useState(0);
  const [comboPop, setComboPop] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const milestonesShown = useRef<Set<string>>(new Set());
  const _answeredRef = useRef(false);

  // Guide pertama kali (keyboard, auto-next, dsb)
  useEffect(() => {
    try {
      if (localStorage.getItem("mulai-test-guide-v1")) return;
      setShowGuide(true);
    } catch {
      /* noop */
    }
  }, []);

  // Timer — waktu dihabiskan (analitik + tampilan)
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done]);

  // Duolingo streak — hitung & simpan tanggal terakhir main
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mulai-test-streak");
      const today = new Date().toDateString();
      const prev = raw ? JSON.parse(raw) : null;
      const prevDay = prev?.day;
      const prevN = Number(prev?.n ?? 0);
      let n = 1;
      if (prevDay === today) n = Math.max(1, prevN);
      else if (prevDay === new Date(Date.now() - 864e5).toDateString()) n = Math.max(1, prevN + 1);
      setStreak(n);
      localStorage.setItem("mulai-test-streak", JSON.stringify({ day: today, n }));
    } catch {
      /* noop */
    }
  }, []);

  const optsRef = useRef<any[] | null>(null);
  const engineLoad = (i: number) => {
    const q = effQs[i];
    if (!q) {
      void engineFinish();
      return;
    }
    lastDimRef.current = q.dimensionId;
    optsRef.current = q.opts ?? [];
    // Per-SOAL: pulihkan jawaban yg sudah tersimpan utk soal ini (konsep ujian, beda soal beda jawaban)
    const sv = savedByQ[q.id];
    setSelected(sv?.letter ?? null);
    setRevealed(false);
    setEtv(sv?.text ?? "");
    setLastEval(null);
    setSavedFlash(false);
    setQuestion({
      id: q.id,
      text: q.questionText,
      dimension: engine?.dims?.find((d: any) => d.id === q.dimensionId)?.name ?? engine?.code ?? "Soal",
      optionA: q.opts?.[0]?.label,
      optionB: q.opts?.[1]?.label,
      optionC: q.opts?.[2]?.label,
      optionD: q.opts?.[3]?.label,
      _optImgs: (q.opts ?? []).map((x: any) => x.imageUrl ?? null),
      _optIcons: (q.opts ?? []).map((x: any) => x.icon ?? null),
      _media: q.mediaUrl ?? null,
      _mediaCap: q.mediaCaption ?? null,
      _math: q.hasMathNotation === true,
      _optMath: (q.opts ?? []).map((x: any) => x.hasMathNotation === true),
      // Tipe penilaian jawaban isian (dari server) → menentukan keyboard & saringan input.
      _textEval: (q as any).textEval?.evaluationType ?? null,
      _textMode: (q as any).textEval?.inputMode ?? null,
      // Skala/emoji: ikon jadi label UTAMA, caption jadi teks kecil di bawah.
      // (sebelumnya label = caption sehingga emoji tidak pernah tampil di halaman siswa)
      // Skala emoji: kalau data opsi belum punya ikon, pakai skala emoji default
      // supaya siswa tetap melihat emoji (bukan label teks saja).
      _optLabels: (() => {
        const opts = (q.opts ?? []) as any[];
        // Skala ANGKA (label "1".."5") selalu menang atas ikon — kalau admin memilih
        // angka, siswa harus melihat angka, bukan emoji sisa data lama.
        const numeric = opts.length > 0 && opts.every((x) => /^\d+$/.test(String(x.label ?? "").trim()));
        if (numeric) return opts.map((x) => String(x.label).trim());
        // Fallback emoji HANYA untuk mode "Emoji / ikon" yang belum punya ikon.
        const emojiMode = (q as any).presentationMode === "emoji_option";
        const hasIcon = opts.some((x) => x.icon && String(x.icon).trim());
        if (emojiMode && !hasIcon) {
          const def = ["😖", "🙁", "😐", "🙂", "😄"];
          return opts.map((_, i) => def[Math.min(i, def.length - 1)]);
        }
        return opts.map((x) => x.icon ?? x.label ?? "");
      })(),
      _optCaps: (() => {
        const opts = (q.opts ?? []) as any[];
        const hasIcon = opts.some((x) => x.icon && String(x.icon).trim());
        return opts.map((x) => x.imageCaption ?? (hasIcon ? (x.label ?? "") : (x.label ?? "")));
      })(),
    } as unknown as Question);
    setProgress(i + 1);
    setTotal(effQs.length);
    setEq(i);
  };
  const engineFinish = async () => {
    try {
      const r = (await client.discover.finish({ sessionId: engine?.sessionId } as any)) as any;
      setXpEarned(r?.xpEarned ?? 0);
    } catch {
      /* ok */
    }
    setDone(true);
    blip(1318, 0.22);
    fireConfetti();
    setTimeout(() => setAchPop(true), 500);
    /* completion dicatat di SERVER (resultsFor) — no localStorage */
  };
  const [_secDone, setSecDone] = useState(0);
  const [secStreak, setSecStreak] = useState(0);
  const [secOverlay, setSecOverlay] = useState<{ nextEq: number; doneName: string; nextName: string } | null>(null);
  const [secStart, setSecStart] = useState<{ eqIndex: number; name: string } | null>(null);
  const lastDimRef = useRef<string | null>(null);
  const dimNameOf = (dimId: string) => engine?.dims?.find((d: any) => d.id === dimId)?.name ?? "Bagian berikutnya";
  // indeks dimensi (0-based) utk posisi soal eq: berapa dimensi berbeda sebelum eq
  const dimIdxOf = (eqI: number) => {
    const seen = new Set<string>();
    for (let k = 0; k < eqI; k++) {
      const d = effQs[k]?.dimensionId;
      if (d) seen.add(d);
    }
    return seen.size;
  };
  const totalDims = new Set(effQs.map((q: any) => q.dimensionId).filter(Boolean)).size || engine?.sections || 1;
  // Segmen top-bar per bagian (Duolingo-style) — dari urutan sesi
  const secs = useMemo(() => {
    // Tanpa pembagian bagian → satu segmen saja (top-bar tidak menampilkan "bagian")
    if (!sectionsOn) {
      const ids = (effQs as any[]).map((q) => q?.id).filter(Boolean);
      // Tanpa pembagian bagian: tampilkan NAMA TES, bukan label generik "Tes"
      const single = isInterest ? "Tes Minat" : "Tes Bakat";
      return [{ name: single, ids, count: ids.length }];
    }
    const out: { name: string; ids: string[]; count: number }[] = [];
    for (const q of effQs as any[]) {
      const nm = dimNameOf(q?.dimensionId);
      const last = out[out.length - 1];
      if (last && last.name === nm) {
        last.count++;
        last.ids.push(q.id);
      } else out.push({ name: nm, ids: [q.id], count: 1 });
    }
    return out;
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps sengaja dibatasi (hindari re-render tiap soal)
  }, [effQs, sectionsOn, dimNameOf, isInterest]);
  const curSec = Math.min(dimIdxOf(eq), Math.max(0, secs.length - 1));
  const curSecName = secs[curSec]?.name ?? "";
  // Suara mikro (tanpa berkas) — WebAudio
  const blip = (freq = 660, dur = 0.09) => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {
      /* hening */
    }
  };
  const engineBegin = (i: number) => {
    const q = effQs[i];
    if (!q) {
      void engineFinish();
      return;
    }
    // Layar pembuka bagian hanya bila pembagian bagian aktif (section_mode ≠ none)
    if (sectionsOn && lastDimRef.current !== q.dimensionId && (secStart || secOverlay || !lastDimRef.current)) {
      setSecStart({ eqIndex: i, name: dimNameOf(q.dimensionId) });
      lastDimRef.current = q.dimensionId;
      return;
    }
    engineLoad(i);
  };

  const engineNext = (i: number) => {
    const cur = effQs[i - 1];
    const nxt = effQs[i];
    const dimName = (id: string) => engine?.dims?.find((d: any) => d.id === id)?.name ?? "Bagian berikutnya";
    if (sectionsOn && nxt && cur && cur.dimensionId !== nxt.dimensionId) {
      setSecDone((c) => c + 1);
      setSecStreak((c) => c + 1);
      setXpFlash(10);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 } });
      } catch {
        /* ignore */
      }
      setSecOverlay({ nextEq: i, doneName: dimName(cur.dimensionId), nextName: dimName(nxt.dimensionId) });
      setSecStart(null);
      blip(932, 0.16);
    } else if (i >= effQs.length) {
      void engineFinish();
    } else {
      engineLoad(i);
      setSelected(null);
      setRevealed(false);
    }
  };

  const markAnswered = (qid: string) => {
    answeredRef.current = new Set([...(answeredRef.current ?? []), qid]);
    setAnsweredSet((prev) => new Set([...(prev ?? []), qid]));
  };
  // Lanjut hanya ke soal yg BELUM dijawab (konsep ujian: jangan isi ulang yg sudah)
  const nextUn = (from: number) => {
    const a = answeredRef.current;
    for (let j = from; j < effQs.length; j++) if (!a?.has(effQs[j]?.id)) return j;
    return effQs.length;
  };
  const engineSelect = (option: string) => {
    if (revealed || !question) return;
    if (dimExpiredNow() || questionExpiredNow()) {
      setTimerNotice("⏱ Waktu habis — tidak bisa dijawab");
      setTimeout(() => setTimerNotice(null), 2500);
      return;
    }
    setSelected(option);
    setRevealed(true);
    // huruf/teks → id opsi ASLI (q.opts[i].id) — submit butuh optionId valid
    const oList = optsRef.current ?? [];
    const idx = ["A", "B", "C", "D", "E", "F"].indexOf(option);
    const optId = idx >= 0 ? oList[idx]?.id : oList.find((o: any) => o.id === option)?.id;
    if (!optId) {
      console.warn("[engine] opsi tanpa id:", option, oList);
      return;
    }
    void client.discover
      .submit({ sessionId: engine?.sessionId, questionId: question.id, optionId: optId } as any)
      .then((r: any) => {
        if (r && r.ok === false) console.warn("[engine] submit ditolak", r);
      })
      .catch((e: any) => console.error("[engine] submit gagal:", e?.message ?? e));
    markAnswered(question.id);
    setSavedFlash(true);
    blip(660, 0.09);
    setTimeout(() => {
      setSavedFlash(false);
    }, 700);
    setTimeout(() => engineNext(nextUn(eq + 1)), 500);
  };

  const [etv, setEtv] = useState("");
  const [savedByQ, setSavedByQ] = useState<Record<string, { letter?: string; text?: string }>>({}); // jawaban tersimpan per soal (resume)
  const [exitOpen, setExitOpen] = useState(false); // konfirmasi keluar ala Duolingo
  /**
   * Dialog konfirmasi keluar — dirender sebagai overlay yang SAMA di semua layar
   * (intro, layar bagian, soal). Dulu hanya ada di layar soal sehingga X di intro
   * tidak memunculkan apa pun.
   */
  const exitOverlay = exitOpen ? (
    <div className="fixed inset-0 z-[95] flex items-center justify-center">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-bg-light/60 backdrop-blur-sm"
        onClick={() => setExitOpen(false)}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-2xl">
          💾
        </span>
        <h3 className="mt-3 font-bold font-bricolage text-gray-900 text-lg">Progresmu aman</h3>
        <p className="mt-1 font-manrope text-gray-500 text-sm">
          Jawaban tersimpan otomatis — lanjutkan kapan saja dari posisi terakhir.
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setExitOpen(false)}
            className="w-full rounded-2xl bg-brand-navy px-4 py-3 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-110"
          >
            Lanjut Test
          </button>
          <button
            type="button"
            onClick={keluar}
            className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 font-manrope font-semibold text-gray-500 text-xs hover:bg-gray-50"
          >
            Keluar & Simpan
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const [mapOpen, setMapOpen] = useState(false); // panel Peta Soal (bottom sheet)
  const [savedFlash, setSavedFlash] = useState(false); // chip "tersimpan" singkat
  const [achPop, setAchPop] = useState(false); // modal perayaan brand saat tes selesai
  const [timerSt, setTimerSt] = useState<any | null>(null); // heartbeat timer (otoritas server)
  const [timerNotice, setTimerNotice] = useState<string | null>(null); // banner "waktu habis"
  const [_tick, setTick] = useState(0); // re-render tiap detik utk countdown & cek deadline
  const jumpRef = useRef<string>(""); // cegah lompat dobel

  // ⏱ Deadline EFEKTIF untuk satu soal — timer bisa beda scope per dimensi (#7):
  //   · soal ber-scope "question" → qEnds[i]
  //   · soal di dimensi ber-scope "dimension" → dims[dimId].endISO
  //   · selain itu → tanpa batas
  const deadlineOf = (i: number): { kind: "none" | "question" | "dimension"; endISO?: string; totalMs?: number } => {
    const t: any = timerSt;
    if (!t?.ok) return { kind: "none" };
    const qEnd = (t.qEnds ?? [])[i];
    if (qEnd) return { kind: "question", endISO: qEnd, totalMs: Math.max(1000, Number(t.qPerMs ?? 30000)) };
    const dimId = effQs[i]?.dimensionId;
    const d = (t.dims ?? []).find((x: any) => x.id === dimId);
    if (d?.endISO) return { kind: "dimension", endISO: d.endISO, totalMs: Number(d.durationSeconds ?? 0) * 1000 };
    return { kind: "none" };
  };
  const serverNowEst = () =>
    Number(timerSt?.serverNow ?? Date.now()) + (Date.now() - Number(timerSt?._localAt ?? Date.now()));
  const timeExpiredNow = () => {
    const dl = deadlineOf(eq);
    return dl.kind !== "none" && serverNowEst() >= new Date(dl.endISO as string).getTime();
  };
  const dimExpiredNow = timeExpiredNow;
  const questionExpiredNow = timeExpiredNow;
  const timerJump = (target: number) => {
    if (target < 0 || target >= effQs.length) {
      void engineFinish();
      return;
    }
    setSelected(null);
    setRevealed(false);
    setEtv("");
    setLastEval?.(null as any);
    engineLoad(target);
  };
  useEffect(() => {
    if (!isEngine || !timerSt?.ok) return;
    const nowS = serverNowEst();
    const expiredAt = (i: number) => {
      const dl = deadlineOf(i);
      return dl.kind !== "none" && nowS >= new Date(dl.endISO as string).getTime();
    };
    if (!expiredAt(eq)) return; // soal sekarang masih ada waktu
    // Cari soal berikutnya yang deadlinenya belum lewat (mixed scope: per soal & per bagian)
    let target = -1;
    for (let i = eq + 1; i < effQs.length; i++)
      if (!expiredAt(i)) {
        target = i;
        break;
      }
    if (target === -1)
      for (let i = 0; i < effQs.length; i++)
        if (!expiredAt(i)) {
          target = i;
          break;
        }
    if (target === -1) {
      void engineFinish();
      return;
    }
    const key = `exp:${target}`;
    if (jumpRef.current === key) return;
    jumpRef.current = key;
    const dl = deadlineOf(eq);
    setTimerNotice(
      dl.kind === "dimension" ? "⏱ Waktu bagian habis — lanjut otomatis" : "⏱ Waktu soal habis — lanjut otomatis",
    );
    timerJump(target);
    setTimeout(() => setTimerNotice(null), 3000);
    // biome-ignore lint/correctness/useExhaustiveDependencies: timer tick sengaja hanya bergantung nilai ini
  }, [timerSt, eq, effQs.length, engineFinish, timerJump, isEngine, serverNowEst, deadlineOf]);

  const [_lastEval, setLastEval] = useState<boolean | null>(null); // hasil eval soal isian
  const engineSubmitText = () => {
    if (revealed || !question || !etv.trim()) return;
    if (dimExpiredNow() || questionExpiredNow()) {
      setTimerNotice("⏱ Waktu habis — tidak bisa dijawab");
      setTimeout(() => setTimerNotice(null), 2500);
      return;
    }
    setRevealed(true);
    markAnswered(question.id);
    void client.discover
      .submitText({ sessionId: engine?.sessionId, questionId: question.id, textAnswer: etv.trim() } as any)
      .then((r: any) => {
        if (r && r.ok === false) console.warn("[engine] submitText ditolak", r);
        else if (r) {
          setLastEval(r.correct === true);
          blip(r.correct ? 1046 : 330, 0.12);
        }
      })
      .catch((e: any) => console.error("[engine] submitText gagal:", e?.message ?? e));
    setTimeout(() => engineNext(nextUn(eq + 1)), 950);
  };

  // ⏱ HEARTBEAT timer (server-authoritative) — sinkron tiap 12s + tick 1s utk UI
  useEffect(() => {
    if (!isEngine || !engine?.sessionId) return;
    let alive = true;
    const sync = async () => {
      try {
        const r = (await (client as any).discover.timerState({ sessionId: engine?.sessionId })) as any;
        if (alive && r?.ok) setTimerSt({ ...r, _localAt: Date.now() });
      } catch {
        /* offline: biarkan state terakhir */
      }
    };
    void sync();
    const iv = setInterval(sync, 12000);
    const tk = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(tk);
    };
  }, [isEngine, engine?.sessionId]);

  const startMutation = useMutation({
    ...orpc.tmb.assessment.start.mutationOptions(),
    onSuccess: async (data) => {
      setAttemptId(data.attemptId);
      setTotal(data.total);
      trackEvent("assessment_start", { type: testCode });
      await loadQuestion(data.attemptId);
    },
  });

  const questionQuery = useQuery({
    ...orpc.tmb.assessment.question.queryOptions({ input: { attemptId: attemptId ?? "" } }),
    enabled: !isEngine && !!attemptId && !question,
  });

  const answerMutation = useMutation({
    ...orpc.tmb.assessment.answer.mutationOptions(),
    onSuccess: (data) => {
      // ability: tunjukkan feedback benar/salah sebentar, lalu lanjut otomatis
      if (!isInterest && data.isCorrect !== null && data.isCorrect !== undefined) {
        setLastCorrect(data.isCorrect);
        if (data.isCorrect) {
          setCorrectCount((c) => c + 1);
          setXpFlash(10);
          setTimeout(() => setXpFlash(0), 900);
          const c = combo + 1;
          setCombo(c);
          if (c >= 3) {
            setComboPop(c);
            setTimeout(() => setComboPop(0), 1500);
          }
        } else {
          setCombo(0);
        }
        setTimeout(() => {
          if (data.done) {
            finishMutation.mutate({ attemptId: attemptId ?? "" });
          } else {
            setProgress(data.progress);
            setSelected(null);
            setRevealed(false);
            setLastCorrect(null);
            loadQuestion(attemptId ?? "");
          }
        }, 800);
        return;
      }

      if (data.done) {
        finishMutation.mutate({ attemptId: attemptId ?? "" });
      } else {
        setProgress(data.progress);
        setSelected(null);
        setRevealed(false);
        loadQuestion(attemptId ?? "");
      }
    },
  });

  const finishMutation = useMutation({
    ...orpc.tmb.assessment.finish.mutationOptions(),
    onSuccess: (data) => {
      setDone(true);
      setBothDone(!!data.bothDone);
      setResultId(data.resultId ?? null);
      trackEvent("assessment_completed", { type: testCode, both_done: !!data.bothDone });
      setXpEarned(isInterest ? 50 : 100);
      fireConfetti();
      queryClient.invalidateQueries({ queryKey: orpc.tmb.assessment.list.key() });
    },
  });

  // Motivasi tengah jalan (Duolingo-style)
  const showMilestone = (pct: number) => {
    if (banner) return;
    const item = Math.round(pct / 10) * 10;
    if (milestonesShown.current.has(String(item))) return;
    milestonesShown.current.add(String(item));
    let msg: string | null = null;
    if (pct >= 90) msg = "Dikit lagi selesai — kamu hebat! 💪";
    else if (pct >= 60) msg = "Tinggal sedikit lagi! Lanjutkan 🚀";
    else if (pct >= 45) msg = "Setengah jalan — pertahankan! 🏁";
    else if (pct >= 20) msg = "Bagus! Teruskan momentummu ✨";
    if (msg) {
      setBanner(msg);
      setTimeout(() => setBanner(null), 2600);
    }
  };

  const loadQuestion = async (id: string) => {
    if (isEngine) return;
    try {
      const q = await queryClient.fetchQuery({
        ...orpc.tmb.assessment.question.queryOptions({ input: { attemptId: id } }),
      });
      if (q.done) {
        setDone(true);
        setBothDone(false);
        return;
      }
      setQuestion(q.question);
      setProgress(q.progress);
      setTotal(q.total);
      showMilestone((q.progress / (q.total || 1)) * 100);
    } catch {
      /* ignore */
    }
  };

  // auto-start
  useEffect(() => {
    if (isEngine) {
      if (intro !== false) return; // null (cek resume) / true (layar info) → tunggu
      if (!introStarted.current) {
        introStarted.current = true;
        engineBegin(resumeStartRef.current);
      }
      return;
    }
    if (isDemo) return; // mode simulasi tidak perlu backend
    if (!attemptId && !startMutation.isPending && !done) {
      startMutation.mutate({ testCode });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps dibatasi sengaja
  }, [done, testCode, startMutation.mutate, startMutation.isPending, attemptId, isDemo, intro, isEngine, engineBegin]);

  // pakai data dari query jika state kosong
  useEffect(() => {
    if (questionQuery.data && !question) {
      if (questionQuery.data.done) {
        setDone(true);
      } else {
        setQuestion(questionQuery.data.question);
        setProgress(questionQuery.data.progress);
        setTotal(questionQuery.data.total);
      }
    }
  }, [questionQuery.data, question]);

  const handleSelect = (option: string) => {
    if (isDemo) {
      const dq = DEMO_QUESTIONS[demoIdx] as unknown as Question & { correct?: string | null };
      const demoMinat = demoIdx < 2; // 2 soal minat dulu, lalu 2 soal bakat
      if (revealed) return;
      setSelected(option);
      if (!demoMinat) {
        setLastCorrect(dq?.correct === option);
        setRevealed(true);
        setTimeout(() => {
          if (demoIdx + 1 >= DEMO_QUESTIONS.length) {
            setDone(true);
            setBothDone(true);
            setXpEarned(isInterest ? 50 : 100 + demoIdx * 10);
            fireConfetti();
          } else {
            setProgress(demoIdx + 1);
            setDemoIdx(demoIdx + 1);
            setSelected(null);
            setRevealed(false);
            setLastCorrect(null);
          }
        }, 700);
      }
      return;
    }
    if (isEngine) {
      engineSelect(option);
      return;
    }
    if (revealed || answerMutation.isPending || !question) return;
    setSelected(option);

    if (!isInterest && question.optionC) {
      setRevealed(true);
      answerMutation.mutate({ attemptId: attemptId ?? "", questionId: question.id, selectedOption: option });
    }
  };

  // interest: jawab → highlight → tampilkan tombol lanjut

  const handleConfirmInterest = () => {
    if (isEngine) {
      if (selected) engineSelect(selected);
      return;
    }
    if (isDemo) {
      if (!selected) return;
      if (demoIdx + 1 >= DEMO_QUESTIONS.length) {
        setDone(true);
        setBothDone(false);
        setXpEarned(50);
        fireConfetti();
      } else {
        setProgress(demoIdx + 1);
        setDemoIdx(demoIdx + 1);
        setSelected(null);
        setRevealed(false);
      }
      return;
    }
    if (!question || !selected) return;
    answerMutation.mutate({ attemptId: attemptId ?? "", questionId: question.id, selectedOption: selected });
  };
  // Keyboard: A-D / 1-4 pilih opsi, Enter konfirmasi (interest)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Jangan bajak shortcut browser: Ctrl/Cmd/Alt + huruf (mis. Ctrl+C copy,
      // Cmd+V paste) TIDAK boleh memilih opsi.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Jangan bereaksi saat siswa mengetik di kolom isian (jawaban teks / search).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const liveQ = isDemo ? (DEMO_QUESTIONS[demoIdx] as unknown as Question) : question;
      if (done || !liveQ || (isDemo ? false : answerMutation.isPending)) return;
      const letter = e.key.toLowerCase();
      // A–F atau 1–6 (skema opsi maksimal 6). Sebelumnya hanya a–d / 1–4, sehingga
      // opsi ke-5 (E) dan ke-6 (F) tidak bisa dipilih lewat keyboard.
      const letters = ["a", "b", "c", "d", "e", "f"];
      const digits = ["1", "2", "3", "4", "5", "6"];
      const li = letters.indexOf(letter);
      const idx = li !== -1 ? li : digits.indexOf(e.key);
      if (idx === -1) return;
      // Jumlah opsi sebenarnya soal ini: engine dari daftar opsi versi,
      // interest selalu 2, soal legacy dari optionA–optionD.
      const optCount = isEngine
        ? (optsRef.current?.length ?? (liveQ as any).opts?.length ?? 0)
        : isInterest
          ? 2
          : [liveQ.optionA, liveQ.optionB, liveQ.optionC, liveQ.optionD].filter(Boolean).length;
      if (idx >= optCount) return;
      const optKey = "ABCDEF"[idx] ?? "";
      if (!optKey) return;
      if (!revealed) handleSelect(optKey);
    };
    const onEnter = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const te = e.target as HTMLElement | null;
      if (te && (te.tagName === "TEXTAREA" || te.isContentEditable)) return;
      if (done || !question || !isInterest) return;
      if (selected && !revealed && !answerMutation.isPending) handleConfirmInterest();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onEnter);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEnter);
    };
  }, [
    done,
    question,
    selected,
    revealed,
    isInterest,
    answerMutation.isPending,
    demoIdx,
    isDemo,
    // biome-ignore lint/correctness/useExhaustiveDependencies: handler demo dibuat ulang tiap render (disengaja)
    handleSelect,
    // biome-ignore lint/correctness/useExhaustiveDependencies: handler demo dibuat ulang tiap render (disengaja)
    handleConfirmInterest,
    // biome-ignore lint/correctness/useExhaustiveDependencies: konstanta demo statis
    DEMO_QUESTIONS,
    isEngine,
  ]);

  if (done) {
    return (
      <div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center overflow-y-auto bg-bg-light px-6 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex w-full max-w-sm flex-col items-center justify-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
            className="h-28 w-28 overflow-hidden rounded-3xl bg-white shadow-xl"
          >
            <Image
              src={bothDone ? "/maskot/masko-found.webp" : "/maskot/masko-thumb-up.webp"}
              alt="Maskot senang"
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          </motion.div>

          <h1 className="mt-5 font-bold font-bricolage text-2xl text-gray-900">
            {bothDone ? "Semua Test Selesai!" : "Test Selesai!"}
          </h1>
          <p className="mt-2 font-manrope text-gray-500 text-sm">
            {bothDone
              ? "Rekomendasi jurusan & kariermu sudah siap dihasilkan."
              : `Kamu dapat ${xpEarned} XP! ${streak >= 2 ? `Streak ${streak} hari 🔥` : "Ayo lanjutkan streak besok!"}`}
          </p>

          {!isEngine && isInterest && !bothDone && (
            <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 font-manrope text-sm text-violet-700">
              💡 Lanjut ke <b>Test Bakat</b> untuk dapat rekomendasi lengkap!
            </div>
          )}

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            {isEngine ? (
              (() => {
                return otherDone ? (
                  <Link
                    href={"/dashboard/student/assessment/result" as any}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
                  >
                    <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/student/assessment/take/${engine?.otherCode}`}
                    onClick={guardLink}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    Lanjut ke {engine?.otherLabel} <ArrowRight className="h-5 w-5" />
                  </Link>
                );
              })()
            ) : bothDone || (!isInterest && resultId) ? (
              <Link
                href="/dashboard/student/assessment/result"
                onClick={guardLink}
                className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
              </Link>
            ) : (
              <Link
                href="/dashboard/student/assessment"
                onClick={guardLink}
                className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Kembali ke Beranda <ArrowRight className="h-5 w-5" />
              </Link>
            )}
            <Link
              href="/dashboard/student/assessment"
              onClick={guardLink}
              className="flex items-center justify-center gap-1.5 font-manrope font-semibold text-gray-400 text-sm hover:text-gray-600"
            >
              <Home className="h-4 w-4" /> Beranda
            </Link>
          </div>
        </motion.div>

        {/* MODAL PERAYAAN brand (hand-built) */}
        {achPop && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Tutup perayaan"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setAchPop(false)}
            />
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-brand-navy text-center text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative px-6 pt-8 pb-6">
                <span className="absolute -top-8 -right-6 h-28 w-28 rounded-full bg-brand-orange/25 blur-2xl" />
                <div className="relative mx-auto h-24 w-24 overflow-hidden">
                  <Image
                    src={bothDone ? "/maskot/masko-found.webp" : "/maskot/masko-thumb-up.webp"}
                    alt="Selamat"
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-4 font-bold font-manrope text-[10px] text-brand-orange uppercase tracking-widest">
                  Pencapaian
                </p>
                <h3 className="mt-1 font-bold font-bricolage text-2xl">
                  {bothDone ? "Semua Tes Selesai!" : "Test Selesai!"}
                </h3>
                <p className="mt-2 font-manrope text-sm text-white/80">
                  +{xpEarned} <b className="text-amber-400">XP</b> · streak 🔥 {streak} hari — pertahankan!
                </p>
                <button
                  type="button"
                  onClick={() => setAchPop(false)}
                  className="mt-5 w-full rounded-2xl bg-brand-orange px-5 py-3 font-bold font-bricolage text-sm text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.99]"
                >
                  Siap, lanjut!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }
  if (isEngine && intro === true) {
    const nSec = engine?.sections ?? Math.max(1, new Set(effQs.map((q) => q.dimensionId)).size);
    return (
      <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col items-center justify-start overflow-y-auto bg-bg-light px-6 py-10 text-center sm:justify-center">
        {exitBtn}
        {exitOverlay}
        <div className="h-24 w-24 overflow-hidden">
          <Image
            src="/maskot/masko-book.webp"
            alt="Maskot"
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="mt-5 font-bold font-bricolage text-3xl text-gray-900">
          {engine?.code === "DISCOVER" ? "Tes Minat" : "Tes Bakat"}
        </h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">Sebelum mulai, ini info testnya:</p>
        <div className="mt-5 flex w-full max-w-sm flex-wrap items-center justify-center gap-2">
          <span className="rounded-xl bg-white px-3 py-2 font-manrope font-semibold text-gray-700 text-xs shadow-sm">
            📝 {effQs.length} soal
          </span>
          <span className="rounded-xl bg-white px-3 py-2 font-manrope font-semibold text-gray-700 text-xs shadow-sm">
            🗂 {nSec} bagian
          </span>
          <span className="rounded-xl bg-white px-3 py-2 font-manrope font-semibold text-gray-700 text-xs shadow-sm">
            Percobaan #{attemptNo}
          </span>
          <span className="rounded-xl bg-amber-50 px-3 py-2 font-bold font-manrope text-amber-600 text-xs shadow-sm">
            +{nSec * 10 + effQs.length} XP
          </span>
          <span className="rounded-xl bg-white px-3 py-2 font-manrope font-semibold text-gray-500 text-xs shadow-sm">
            💾 auto-simpan
          </span>
          <span className="rounded-xl bg-sky-50 px-3 py-2 font-bold font-manrope text-sky-700 text-xs shadow-sm">
            {(() => {
              const dimsWithTime = (timerSt?.dims ?? []).length;
              const hasQ = (timerSt?.qEnds ?? []).some((x: string) => !!x);
              if (!timerSt?.ok || (!dimsWithTime && !hasQ)) return "⏱ Tanpa batas waktu";
              if (dimsWithTime && hasQ) return "⏱ Waktu diatur per bagian & per soal";
              if (dimsWithTime) return `⏱ ${Number(timerSt?.dims?.[0]?.durationSeconds ?? 0)} detik / bagian`;
              return `⏱ ${Math.round(Number(timerSt?.qPerMs ?? 0) / 1000)} detik / soal`;
            })()}
          </span>
        </div>
        {(engine.secData ?? []).length > 0 && (
          <div className="mt-4 w-full max-w-sm space-y-2 text-left">
            {(engine.secData ?? []).map((sc: any, i: number) => {
              const cj = sc.contentJson ?? {};
              const body = cj.text ?? (Array.isArray(cj.items) ? cj.items.join(" · ") : "");
              return (
                <div key={sc.id ?? i} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <p className="font-bold font-manrope text-[11px] text-gray-800">{sc.title}</p>
                  {body && <p className="mt-0.5 font-manrope text-[11px] text-gray-500 leading-snug">{body}</p>}
                </div>
              );
            })}
          </div>
        )}
        {timerSt?.scope && timerSt.scope !== "none" && (
          <div className="mt-4 w-full max-w-sm rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-left">
            <p className="font-bold font-manrope text-[11px] text-sky-800">Aturan waktu</p>
            <ul className="mt-1 space-y-0.5 font-manrope text-[11px] text-sky-700">
              <li>• Waktu berjalan di server — keluar/jeda tetap berjalan, lanjut kapan saja posisi tersimpan.</li>
              <li>
                • Warna: biru normal · <b className="text-amber-600">kuning ≤20%</b> ·{" "}
                <b className="text-red-600">merah ≤10%</b>.
              </li>
              <li>• Waktu habis → jawaban tersimpan, bagian terkunci & lanjut otomatis.</li>
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setIntro(false);
          }}
          className="mt-8 w-full max-w-sm rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Mulai Tes →
        </button>
      </div>
    );
  }

  if (isEngine && secStart) {
    const __secCount = secs[dimIdxOf(secStart.eqIndex)]?.count ?? effQs.length; // dinamis dr data
    const __secIdx = dimIdxOf(secStart.eqIndex);
    const __el = (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-[90] flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-bg-light px-6 py-10 text-center"
      >
        {exitBtn}
        {exitOverlay}
        <div className="h-24 w-24 overflow-hidden">
          <Image
            src="/maskot/masko-book.webp"
            alt="Maskot"
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-5 font-bold font-manrope text-teal-600 text-xs uppercase tracking-widest">
          Bagian {__secIdx + 1} dari {totalDims}
        </p>
        <h2 className="mt-1 font-bold font-bricolage text-3xl text-gray-900">{secStart.name}</h2>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          Kamu akan mengerjakan <b>{__secCount} soal</b> pada bagian ini.
        </p>
        {(() => {
          const dimId = effQs[secStart.eqIndex]?.dimensionId;
          const ins = (engine?.instr ?? []).find((x: any) => x.dimensionId === dimId);
          if (!ins) return null;
          const cj = ins.contentJson ?? {};
          const items: string[] = Array.isArray(cj.items) ? cj.items : cj.text ? [cj.text] : [];
          return (
            <div className="mt-4 w-full max-w-sm rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-left">
              <p className="font-bold font-manrope text-[11px] text-teal-800">{ins.header ?? "Instruksi"}</p>
              {items.length > 0 && (
                <ul className="mt-1 space-y-0.5 font-manrope text-[11px] text-teal-700">
                  {items.map((it, i) => (
                    <li key={i}>• {it}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
        <button
          type="button"
          onClick={() => {
            setSecStart(null);
            setSelected(null);
            setRevealed(false);
            engineLoad(secStart.eqIndex);
          }}
          className="mt-8 w-full max-w-sm rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Mulai bagian →
        </button>
        {allowPause && dimIdxOf(secStart.eqIndex) > 0 && dimIdxOf(secStart.eqIndex) < totalDims - 1 && (
          <button
            type="button"
            onClick={keluar}
            className="mt-3 font-manrope font-semibold text-gray-400 text-sm underline-offset-2 hover:text-gray-600 hover:underline"
          >
            Berhenti dulu — lanjut kapan saja
          </button>
        )}
      </motion.div>
    );

    return typeof document === "undefined" ? null : createPortal(__el, document.body);
  }
  if (isEngine && secOverlay) {
    const __el = (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-bg-light p-4"
      >
        {exitBtn}
        {exitOverlay}
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-16 w-16 overflow-hidden rounded-2xl bg-teal-50">
            <Image
              src="/maskot/masko-thumb-up.webp"
              alt="Maskot"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </span>
          <p className="mt-3 font-bold font-manrope text-teal-600 text-xs uppercase tracking-wide">Bagian selesai</p>
          <h2 className="mt-1 font-bold font-bricolage text-2xl text-gray-900">{secOverlay.doneName} — selesai! 🎉</h2>
          <p className="mt-2 font-manrope text-gray-500 text-sm">
            <span className="font-bold text-brand-orange">+10 XP</span> · streak 🔥 {secStreak} bagian beruntun
          </p>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => {
                setSecOverlay(null);
                setSelected(null);
                setRevealed(false);
                engineBegin(secOverlay.nextEq);
              }}
              className="w-full rounded-2xl bg-brand-navy px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110"
            >
              Lanjut ke {secOverlay.nextName} →
            </button>
            {allowPause && dimIdxOf(secOverlay.nextEq) < totalDims && (
              <button
                type="button"
                onClick={keluar}
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 font-manrope font-semibold text-gray-500 text-xs hover:bg-gray-50"
              >
                ⏸ Berhenti di sini — lanjut nanti dari bagian ini
              </button>
            )}
          </div>
          <p className="mt-2 font-manrope text-[10px] text-gray-400">
            Jawabanmu tersimpan otomatis; kembali kapan saja untuk melanjutkan.
          </p>
        </div>
      </motion.div>
    );
    return typeof document === "undefined" ? null : createPortal(__el, document.body);
  }
  // Mode simulasi: pertanyaan lokal (tanpa backend)
  const liveQuestion = isDemo ? (DEMO_QUESTIONS[demoIdx] as unknown as Question) : question;
  const liveProgress = isDemo ? demoIdx + 1 : progress;
  const liveTotal = isDemo ? DEMO_QUESTIONS.length : total;
  const _livePct = liveTotal > 0 ? (liveProgress / liveTotal) * 100 : 0;

  const _imgOptions = isEngine && !!(effQs[eq] as any)?.opts?.some((o: any) => o.imageUrl);
  // Soal isian: keyboard & saringan mengikuti TIPE PENILAIAN soal (dari server), bukan selalu angka.
  //  · numeric_tolerance → angka (keypad desimal, huruf ditolak)
  //  · exact_match / keyword_match / pattern_match → teks bebas: jawaban alfa seperti antonim
  //    ("pesimis") atau campur ("MX4471") tidak lagi mustahil diketik.
  const _textNumeric = (((liveQuestion as any)?._textMode ?? "text") as string) === "numeric";
  // Maskot beragam per soal (rotasi dari koleksi assets) — nanimal di samping pertanyaan
  const _MASKOTS = [
    "/maskot/masko-book.webp",
    "/maskot/masko-compass.webp",
    "/maskot/masko-found.webp",
    "/maskot/masko-hi.webp",
    "/maskot/masko-thumb-up.webp",
  ];
  const _mascotNow = _MASKOTS[eq % _MASKOTS.length] ?? "/maskot/masko-book.webp";
  if (!liveQuestion) {
    if (isDemo) return null;
    // Loader juga full-screen (tanpa flash layout dashboard di belakang sebelum intro muncul)
    return (
      <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col items-center justify-center bg-bg-light">
        <div className="h-24 w-24 overflow-hidden rounded-2xl bg-white shadow-sm">
          <Image src="/maskot/masko-hi.webp" alt="" width={96} height={96} className="h-full w-full object-cover" />
        </div>
        <div className="mt-4 h-2 w-32 animate-pulse rounded-full bg-gray-100" />
        <p className="mt-3 font-manrope text-gray-500 text-sm">Menyiapkan soal…</p>
      </div>
    );
  }

  const progressPct = liveTotal > 0 ? (liveProgress / liveTotal) * 100 : 0;

  // ⏱ Countdown dari deadline SERVER (offset clock) + tone visual (Duolingo-style 20%/10%)
  const _nowServer = timerSt?.serverNow
    ? Number(timerSt.serverNow) + (Date.now() - Number(timerSt._localAt ?? Date.now()))
    : Date.now();
  let _remainMs: number | null = null;
  let _ratio = 1;
  {
    const dl = deadlineOf(eq);
    if (timerSt?.ok && dl.kind !== "none") {
      _remainMs = new Date(dl.endISO as string).getTime() - _nowServer;
      _ratio = dl.totalMs && dl.totalMs > 0 ? Math.max(0, _remainMs) / dl.totalMs : 0;
    }
  }
  const _tone: "none" | "normal" | "warn" | "crit" =
    _remainMs == null ? "none" : _ratio <= 0.1 ? "crit" : _ratio <= 0.2 ? "warn" : "normal";
  const _mmss =
    _remainMs != null
      ? `${String(Math.max(0, Math.floor(_remainMs / 60000))).padStart(2, "0")}:${String(Math.max(0, Math.floor((_remainMs % 60000) / 1000))).padStart(2, "0")}`
      : null;
  const _expiredDims = new Set((timerSt?.dims ?? []).filter((d: any) => d.expired).map((d: any) => d.id));

  return (
    <div className="fixed inset-0 z-[70] h-dvh overflow-hidden bg-bg-light">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pt-6 pb-5">
        <div className="flex flex-col">
          {showGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.92, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
              >
                <div className="flex items-center gap-3 border-gray-100 border-b px-5 py-4">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-brand-orange/10">
                    <Image
                      src="/maskot/masko-compass.webp"
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="font-bold font-bricolage text-brand-navy text-lg">
                      {isDemo ? "Simulasi Test — 2+2 Soal" : "Cara Main Test"}
                    </h2>
                    <p className="font-manrope text-[11px] text-muted-foreground">
                      {isDemo ? "Coba dulu tanpa disimpan" : "Panduan singkat sebelum mulai"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 px-5 py-4">
                  {[
                    [
                      "⌨️",
                      "Pilih jawaban cepat",
                      isInterest ? "Tekan tombol A / B, atau 1 / 2." : "Tekan A–F (atau 1–6) sesuai opsi.",
                    ],
                    [
                      "⏭️",
                      isInterest ? "Konfirmasi dulu" : "Lanjut otomatis",
                      isInterest
                        ? "Pilih dulu, lalu tekan Enter / tombol Lanjut."
                        : "Setelah jawab, otomatis pindah — tak perlu tombol next.",
                    ],
                    [
                      "⏱️🔥",
                      "Pantau waktu & streak",
                      "Lihat timer & api streak di pojok — jawaban benar berturut-turut = combo!",
                    ],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="font-bold font-manrope text-brand-navy text-xs">{title}</p>
                        <p className="mt-0.5 font-manrope text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-gray-100 border-t px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("mulai-test-guide-v1", "1");
                      setShowGuide(false);
                    }}
                    className="flex-1 rounded-2xl bg-brand-navy px-5 py-3 font-bold font-bricolage text-white transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    {isDemo ? "Mulai Simulasi" : "Paham, Mulai!"}
                  </button>
                  {!isDemo && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("mulai-test-guide-v1", "1");
                        setShowGuide(false);
                      }}
                      className="rounded-2xl px-5 py-3 font-manrope text-muted-foreground text-xs transition-colors hover:text-brand-navy"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* TOP BAR DUOLINGO-STYLE: keluar + segment per bagian + metrik */}
          <div className="mb-4 flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              aria-label="Keluar test"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {secs.map((sc, idx) => {
                  const done = sc.ids.filter((id) => answeredSet?.has(id)).length;
                  const pct = sc.count ? done / sc.count : 0;
                  const activeS = idx === curSec;
                  return (
                    <div
                      key={idx}
                      title={sc.name}
                      className={cn(
                        "h-2.5 flex-1 overflow-hidden rounded-full",
                        sc.ids.some((id: string) => _expiredDims.has(effQs.find((q: any) => q.id === id)?.dimensionId))
                          ? "bg-red-100"
                          : activeS
                            ? "bg-orange-100"
                            : "bg-gray-100",
                      )}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          pct > 0 ? "bg-gradient-to-r from-mentor-teal to-teal-500" : "bg-transparent",
                        )}
                        style={{ width: `${pct > 0 ? Math.max(pct * 100, 5) : 0}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-between font-manrope text-[10px] text-gray-500">
                <span className="truncate font-semibold text-gray-600">{curSecName || "Mulai"}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="font-bold text-amber-600">+{xpEarned} XP</span>
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 font-bold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    🗺 {answeredSet?.size ?? 0}/{effQs.length}
                  </button>
                  {/* (B) Elapsed time SELALU tampil (termasuk mobile); countdown tampil
                      bersamanya saat timer aktif — jadi siswa tahu berjalan & sisa waktu. */}
                  <span
                    data-testid="elapsed-chip"
                    title="Waktu berjalan"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 font-manrope font-semibold text-[10px] text-slate-600 tabular-nums sm:px-2 sm:text-[11px]"
                  >
                    <Timer className="h-3 w-3" />
                    {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
                  </span>
                  {_mmss && (
                    <span
                      data-testid="countdown-chip"
                      title="Sisa waktu"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold font-manrope text-[10px] tabular-nums sm:px-2 sm:text-[11px]",
                        _tone === "crit"
                          ? "animate-pulse bg-red-100 text-red-600"
                          : _tone === "warn"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-sky-100 text-sky-600",
                      )}
                    >
                      <Timer className="h-3 w-3" />
                      {_mmss}
                    </span>
                  )}
                  <span className="hidden sm:inline-flex">
                    <StreakFlame days={streak} showDots={false} showLabel={false} />
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* PETA SOAL (bottom sheet) — grid lengkap, dibuka via tombol 🗺 */}
          {mapOpen && (
            <div className="fixed inset-0 z-[85] flex items-end justify-center">
              <button
                type="button"
                aria-label="Tutup peta jurusan"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setMapOpen(false)}
              />
              <div className="relative max-h-[72vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <p className="font-bold font-bricolage text-gray-900">🗺 Peta Soal</p>
                  <div className="flex items-center gap-2">
                    <span className="font-manrope text-[11px] text-gray-400">
                      {answeredSet?.size ?? 0}/{effQs.length} terjawab
                    </span>
                    <button
                      type="button"
                      onClick={() => setMapOpen(false)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-teal-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  {secs.map((sc, si) => (
                    <div key={si}>
                      <p className="mb-1.5 font-bold font-manrope text-[10px] text-gray-400 uppercase tracking-wide">
                        {sc.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sc.ids.map((id, _ii) => {
                          const gi = effQs.findIndex((q: any) => q.id === id);
                          const done = answeredSet?.has(id) ?? false;
                          const active = eq === gi;
                          const locked = _expiredDims.has(effQs[gi]?.dimensionId);
                          return (
                            <button
                              type="button"
                              key={id}
                              disabled={locked}
                              title={locked ? "Waktu bagian ini habis" : `Soal ${gi + 1}`}
                              onClick={() => {
                                setSelected(null);
                                setRevealed(false);
                                setEtv("");
                                engineLoad(gi);
                                setMapOpen(false);
                              }}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold font-manrope text-[11px] transition-all ${locked ? "cursor-not-allowed bg-red-50 text-red-300" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} ${active ? "ring-2 ring-brand-orange" : ""} hover:brightness-95`}
                            >
                              {locked ? "⏳" : gi + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KONFIRMASI KELUAR (Duolingo-style): progres aman */}

          {exitOverlay}

          {/* Combo bubble */}
          {comboPop >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 shadow-lg"
            >
              <span className="text-lg">🔥</span>
              <span className="font-bold font-bricolage text-sm text-white">{comboPop} combo berturut-turut!</span>
            </motion.div>
          )}

          {/* Banner motivasi */}
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2"
            >
              <Image src="/maskot/masko-thumb-up.webp" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
              <span className="font-manrope font-semibold text-violet-700 text-xs">{banner}</span>
            </motion.div>
          )}

          {timerNotice && (
            <div className="mb-2 shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-center font-manrope font-semibold text-[11px] text-amber-700">
              {timerNotice}
            </div>
          )}

          {/* QUESTION — bubble chat maskot bertanya (tanpa label duplikat; maskot polos & lebih besar) */}
          {/* SATU BARIS di semua ukuran (permintaan analis): maskot di kiri, soal di kanan.
              Maskot dikecilkan di mobile supaya teks soal tetap lega & area opsi tidak terpotong. */}
          <div className="mb-3 flex min-h-0 flex-row items-start gap-2 sm:items-end sm:gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden sm:h-16 sm:w-16">
              <Image
                src={_mascotNow}
                alt="Maskot bertanya"
                width={64}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
            <motion.div
              key={liveQuestion.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative max-h-[30vh] min-w-0 flex-1 overflow-y-auto rounded-3xl rounded-bl-md border border-gray-100 bg-white px-4 pt-3 pb-3 shadow-sm sm:px-5 sm:pt-4 sm:pb-4"
            >
              <span className="absolute top-4 -left-1.5 hidden h-3 w-3 rotate-45 border-gray-100 border-b border-l bg-white sm:block" />
              <h2
                data-testid="question-text"
                className="font-bold font-manrope text-[17px] text-gray-900 leading-relaxed sm:text-lg sm:leading-snug"
              >
                {(liveQuestion as any)._math ? <Latex text={liveQuestion.text} /> : liveQuestion.text}
              </h2>
              {isEngine && (liveQuestion as any)._media && (
                <figure className="mt-3">
                  {/* biome-ignore lint/performance/noImgElement: media dinamis dari R2 */}
                  <img
                    src={(liveQuestion as any)._media}
                    alt={(liveQuestion as any)._mediaCap ?? "Gambar soal"}
                    className="mx-auto max-h-[24vh] w-auto rounded-xl border border-gray-100 object-contain"
                  />
                  {(liveQuestion as any)._mediaCap && (
                    <figcaption className="mt-1 text-center font-manrope text-[11px] text-gray-400">
                      {(liveQuestion as any)._mediaCap}
                    </figcaption>
                  )}
                </figure>
              )}
            </motion.div>
          </div>

          {/* Options — bila ada gambar jawaban: 2×2 grid & isi sisa tinggi (tanpa scroll) */}
          <div
            data-testid="options-area"
            // (#2) Opsi tidak boleh terpotong di layar kecil:
            //  · `content-start` (bukan center) supaya konten yang lebih tinggi dari wadah tidak terpotong di ATAS
            //  · padding bawah + safe-area supaya opsi terakhir tidak menempel/tertutup bar bawah
            //  · `overscroll-contain` agar scroll tidak "bocor" ke halaman
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
              _imgOptions ? "grid grid-cols-2 content-start gap-3" : "mt-2 space-y-3"
            } pb-[max(1rem,env(safe-area-inset-bottom))]`}
          >
            {isEngine && (effQs[eq] as any)?.questionType === "text_input" ? (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
                <p className="mb-2 font-manrope font-medium text-gray-500 text-xs">
                  {_textNumeric ? "Tulis jawaban (angka / pecahan)" : "Tulis jawaban (kata / kalimat)"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode={_textNumeric ? "decimal" : "text"}
                    autoComplete="off"
                    value={etv}
                    onChange={(e) => setEtv(_textNumeric ? e.target.value.replace(/[^\d.,/-]/g, "") : e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") engineSubmitText();
                    }}
                    placeholder={_textNumeric ? "cth: 19, 0.75, atau 3/4" : "cth: pesimis"}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-manrope text-base outline-none transition-colors focus:border-mentor-teal"
                  />
                  <button
                    type="button"
                    onClick={engineSubmitText}
                    disabled={!etv.trim() || revealed}
                    className="shrink-0 rounded-xl bg-brand-navy px-5 py-3 font-bold font-manrope text-sm text-white transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    Jawab
                  </button>
                </div>
                <p className="mt-2 font-manrope text-[10px] text-gray-400">
                  {_textNumeric
                    ? "Gunakan titik (.) utk desimal — Enter untuk mengirim."
                    : "Huruf besar/kecil tidak berpengaruh — Enter untuk mengirim."}
                </p>
              </div>
            ) : (effQs[eq] as any)?.questionType === "likert" ? (
              // Skala: SATU BARIS PER OPSI (bukan 5 sebaris) supaya emoji + caption
              // mudah dibaca & disentuh di layar sempit.
              <div className="space-y-2.5">
                {((liveQuestion as any)._optLabels ?? []).slice(0, 6).map((lab: string, i: number) => {
                  const key = "ABCDEF"[i] ?? "A";
                  const isSel = selected === key;
                  const cap = (liveQuestion as any)._optCaps?.[i] ?? "";
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => engineSelect(key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left shadow-sm transition-all active:scale-[0.99]",
                        isSel
                          ? "border-mentor-teal bg-mentor-teal/5 shadow-md"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      {/^\d+$/.test(String(lab)) ? (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center font-bold font-bricolage text-2xl text-gray-900">
                          {lab}
                        </span>
                      ) : (
                        <AnimatedEmoji emoji={String(lab)} size={44} testId="likert-emoji" />
                      )}
                      <span className="min-w-0 flex-1 font-manrope font-medium text-[15px] text-gray-800">
                        {cap ||
                          (String(lab).trim() && !/\p{Extended_Pictographic}/u.test(String(lab)) ? String(lab) : "")}
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          isSel ? "border-mentor-teal bg-mentor-teal" : "border-gray-200",
                        )}
                      >
                        {isSel && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : isInterest ? (
              <>
                {[
                  { key: "A", text: liveQuestion.optionA },
                  { key: "B", text: liveQuestion.optionB },
                ].map((opt, i) => {
                  const isSelected = selected === opt.key;
                  const oi = (liveQuestion as any)._optImgs?.[i];
                  const oic = (liveQuestion as any)._optIcons?.[i];
                  return (
                    <motion.button
                      key={opt.key}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * (i + 1) }}
                      onClick={() => handleSelect(opt.key)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                        _imgOptions && "flex-col justify-center gap-2 p-3 text-center",
                        isSelected
                          ? "border-mentor-teal bg-mentor-teal/5 shadow-md"
                          : "border-gray-200 hover:border-gray-300 active:scale-[0.99]",
                      )}
                    >
                      {oic ? (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                          {oic}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition-colors",
                            isSelected ? "bg-mentor-teal" : "bg-gray-100",
                          )}
                        >
                          {isSelected ? <Check className="h-6 w-6 text-white" /> : i === 0 ? "👷" : "🎨"}
                        </span>
                      )}
                      {oi && (
                        // biome-ignore lint/performance/noImgElement: media dinamis dari R2
                        <img
                          src={oi}
                          alt=""
                          className={cn(
                            "shrink-0 rounded-lg border border-gray-100 object-cover",
                            _imgOptions ? "h-24 w-24" : "h-10 w-14",
                          )}
                        />
                      )}
                      {String(opt.text || "").trim() && (
                        <span className="font-manrope font-medium text-[15px] text-gray-800">
                          {(liveQuestion as any)._optMath?.[i] ? <Latex text={opt.text} /> : opt.text}
                        </span>
                      )}
                    </motion.button>
                  );
                })}

                {/* Confirm button — muncul setelah pilih (interest) */}
                <motion.div initial={false} animate={{ opacity: selected ? 1 : 0, y: selected ? 0 : 8 }}>
                  {selected && !revealed && (
                    <button
                      type="button"
                      onClick={handleConfirmInterest}
                      disabled={answerMutation.isPending}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                    >
                      {answerMutation.isPending ? "Menyimpan…" : "Lanjut"} <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </motion.div>

                <p className="mt-2 text-center font-manrope text-[10px] text-muted-foreground">
                  Shortcut: tekan <b>A/B</b> lalu <b>Enter</b>
                </p>
              </>
            ) : (
              (isEngine
                ? // Engine: ikuti daftar opsi versi (maks 6). Sebelumnya di-hardcode A–D
                  // sehingga opsi ke-5 (E) & ke-6 (F) tidak pernah tampil.
                  (((liveQuestion as any)._optLabels ?? []) as string[]).map((t, i) => ["ABCDEF"[i], t])
                : [
                    ["A", liveQuestion.optionA],
                    ["B", liveQuestion.optionB],
                    ["C", liveQuestion.optionC],
                    ["D", liveQuestion.optionD],
                  ]
              )
                .filter(
                  ([k, t]: any) =>
                    String(t ?? "").trim() ||
                    (liveQuestion as any)._optImgs?.[k.charCodeAt(0) - 65] ||
                    (liveQuestion as any)._optIcons?.[k.charCodeAt(0) - 65],
                )
                .map(([key, opt]: any, i: number) => {
                  const isSelected = selected === key;
                  const oi = (liveQuestion as any)._optImgs?.[i];
                  const oic = (liveQuestion as any)._optIcons?.[i];
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 * i }}
                      onClick={() => handleSelect(key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                        _imgOptions && "flex-col justify-center gap-2 p-3 text-center",
                        isSelected
                          ? "border-mentor-teal bg-mentor-teal/5 shadow-md"
                          : "border-gray-200 hover:border-gray-300 active:scale-[0.99]",
                      )}
                    >
                      {oic ? (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-2xl shadow-sm">
                          {oic}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold font-manrope text-sm",
                            isSelected ? "bg-mentor-teal text-white" : "bg-gray-100 text-gray-500",
                          )}
                        >
                          {key}
                        </span>
                      )}
                      {oi && (
                        // biome-ignore lint/performance/noImgElement: media dinamis dari R2
                        <img
                          src={oi}
                          alt=""
                          className={cn(
                            "shrink-0 rounded-lg border border-gray-100 object-cover",
                            _imgOptions ? "h-24 w-24" : "h-10 w-14",
                          )}
                        />
                      )}
                      {String(opt ?? "").trim() && (
                        <span className="font-manrope font-medium text-[15px] text-gray-800">
                          {(liveQuestion as any)._optMath?.[i] ? <Latex text={opt} /> : opt}
                        </span>
                      )}
                    </motion.button>
                  );
                })
            )}
          </div>

          {/* Feedback singkat (Duolingo-style) — wadah tinggi TETAP agar tidak menggeser layout */}
          <div className="flex h-10 shrink-0 items-center justify-center">
            {savedFlash && (
              <p className="fade-in flex animate-in items-center justify-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 font-manrope font-semibold text-teal-700 text-xs">
                <span className="text-sm">✓</span> Jawaban tersimpan
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function _InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${last ? "" : "border-gray-50 border-b"}`}>
      <span className="font-manrope text-gray-500 text-xs">{label}</span>
      <span className="font-manrope font-semibold text-gray-800 text-xs">{value}</span>
    </div>
  );
}
