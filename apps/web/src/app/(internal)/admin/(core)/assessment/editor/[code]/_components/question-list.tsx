"use client";

// Daftar soal di editor.
// Kalau urutan soal ber-blok per dimensi (mis. hasil seeder), daftar tampil sebagai
// collapsible per dimensi — 120 soal jadi rapi. Kalau urutannya berselang (mis. soal
// diacak / hasil drag antar dimensi), daftar kembali datar supaya tidak menyesatkan.
import { ArrowDown, ArrowUp, ChevronRight, Copy, GripVertical, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface QuestionRow {
  id: string;
  dimensionId: string;
  questionText: string;
  questionType: string;
  weight?: number | null;
  hasMathNotation?: boolean | null;
  displayOrder?: number | null;
  durationSeconds?: number | null;
  questionCode?: string | null;
}

export interface DimLite {
  id: string;
  code: string;
  name: string;
}

interface Props {
  questions: QuestionRow[];
  dims: DimLite[];
  canEdit: boolean;
  optionCountOf: (questionId: string) => number;
  textEvalOf: (questionId: string) => string | undefined;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onDragDrop: (from: number, to: number) => void;
  /** true saat daftar soal masih dimuat dari server */
  loading?: boolean;
}

/** Kelompokkan index soal menjadi blok-blok dimensi yang berurutan (kalau memang berurutan). */
function groupRuns(questions: QuestionRow[]) {
  const runs: { dimId: string; from: number; to: number }[] = [];
  for (const [i, q] of questions.entries()) {
    const last = runs[runs.length - 1];
    if (last && last.dimId === q.dimensionId) last.to = i;
    else runs.push({ dimId: q.dimensionId, from: i, to: i });
  }
  const uniqueDims = new Set(questions.map((q) => q.dimensionId)).size;
  // "berkelompok" hanya kalau tiap dimensi muncul tepat satu blok
  return { runs, grouped: questions.length > 0 && runs.length === uniqueDims };
}

export function QuestionList({
  questions,
  dims,
  canEdit,
  optionCountOf,
  textEvalOf,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onDragDrop,
  loading = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { runs, grouped } = useMemo(() => groupRuns(questions), [questions]);

  // `null` = belum disentuh admin → pakai default: banyak soal (>30) buka grup pertama saja,
  // sedikit buka semua. Dihitung saat render (data soal baru datang setelah mount).
  const [openState, setOpenState] = useState<string[] | null>(null);
  const defaultOpen = questions.length > 30 ? (runs[0] ? [runs[0].dimId] : []) : runs.map((r) => r.dimId);
  const open = openState ?? defaultOpen;
  const allOpen = runs.length > 0 && open.length >= runs.length;

  const dimOf = (id: string) => dims.find((d) => d.id === id);
  const needle = query.trim().toLowerCase();
  const matches = (q: QuestionRow) =>
    !needle ||
    q.questionText.toLowerCase().includes(needle) ||
    (q.questionCode ?? "").toLowerCase().includes(needle) ||
    (dimOf(q.dimensionId)?.name ?? "").toLowerCase().includes(needle);

  const shownCount = questions.filter(matches).length;

  const Row = ({ q, i }: { q: QuestionRow; i: number }) => {
    const dim = dimOf(q.dimensionId);
    const isText = q.questionType === "text_input";
    const detail = isText ? `Isian (${textEvalOf(q.id) ?? "?"})` : `${optionCountOf(q.id)} pilihan`;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag & drop urutan soal (tombol naik/turun tetap tersedia)
      <div
        draggable={canEdit}
        onDragStart={() => setDragIdx(i)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => dragIdx !== null && canEdit && onDragDrop(dragIdx, i)}
        onDragEnd={() => setDragIdx(null)}
        id={`q-${q.id}`}
        data-testid="question-row"
        className={cn(
          "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-all hover:bg-gray-50",
          dragIdx === i && "opacity-40",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {canEdit && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />}
          <span className="w-6 shrink-0 text-right font-manrope text-[11px] text-gray-400 tabular-nums">{i + 1}.</span>
          {q.questionCode && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono font-semibold text-[10px] text-gray-500">
              {q.questionCode}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-manrope font-medium text-gray-800 text-sm" title={q.questionText}>
              {q.questionText}
            </p>
            <p className="font-manrope text-[11px] text-muted-foreground">
              {q.durationSeconds ? `⏱ ${q.durationSeconds}s · ` : ""}
              {grouped ? detail : `${dim?.name ?? "—"} · ${detail}`}
              {" · bobot "}
              {q.weight ?? 1}
              {q.hasMathNotation ? " · LaTeX" : ""}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              title="Naik"
              data-testid={`q-up-${i}`}
              onClick={() => onMove(i, -1)}
              disabled={i === 0}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Turun"
              data-testid={`q-down-${i}`}
              onClick={() => onMove(i, 1)}
              disabled={i === questions.length - 1}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Salin soal"
              data-testid={`q-dup-${i}`}
              onClick={() => onDuplicate(q.id)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Ubah soal"
              data-testid={`q-edit-${i}`}
              onClick={() => onEdit(q.id)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Hapus soal"
              data-testid={`q-del-${i}`}
              onClick={() => onDelete(q.id)}
              className="rounded-md p-1.5 text-red-400 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-2 px-4 py-4" data-testid="question-list-loading">
        <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar: cari + buka/tutup grup */}
      <div className="flex flex-wrap items-center gap-2 border-gray-100 border-b px-4 py-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari teks / kode soal…"
            className="h-8 rounded-lg border-gray-200 pl-8 text-xs"
            data-testid="q-search"
          />
        </div>
        {needle && (
          <span className="font-manrope text-[11px] text-muted-foreground" data-testid="q-search-count">
            {shownCount} cocok
          </span>
        )}
        {grouped && runs.length > 1 && (
          <button
            type="button"
            data-testid="q-toggle-all"
            onClick={() => setOpenState(allOpen ? [] : runs.map((r) => r.dimId))}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 font-manrope font-semibold text-[11px] text-gray-600 hover:bg-gray-50"
          >
            {allOpen ? "Tutup semua" : "Buka semua"}
          </button>
        )}
      </div>

      {!grouped && questions.length > 20 && (
        <p className="border-gray-100 border-b bg-amber-50/60 px-4 py-2 font-manrope text-[11px] text-amber-700">
          Urutan soal tidak berurutan per dimensi (mis. diacak), jadi daftar ditampilkan datar tanpa pengelompokan.
        </p>
      )}

      <div className="px-2 py-2">
        {questions.length === 0 && (
          <p className="px-3 py-8 text-center font-manrope text-muted-foreground text-sm">
            Belum ada soal di versi ini.
          </p>
        )}

        {grouped
          ? runs.map((run) => {
              const dim = dimOf(run.dimId);
              const items = questions.slice(run.from, run.to + 1).map((q, k) => ({ q, i: run.from + k }));
              const visible = items.filter(({ q }) => matches(q));
              if (needle && visible.length === 0) return null;
              const isOpen = needle ? true : open.includes(run.dimId); // saat mencari, grup otomatis dibuka
              return (
                <section
                  key={run.dimId}
                  className="mb-1.5 rounded-xl border border-gray-100"
                  data-testid={`q-group-${dim?.code ?? run.dimId}`}
                >
                  <button
                    type="button"
                    data-testid={`q-group-trigger-${dim?.code ?? run.dimId}`}
                    aria-expanded={isOpen}
                    onClick={() => {
                      if (needle) return;
                      setOpenState(
                        open.includes(run.dimId) ? open.filter((x) => x !== run.dimId) : [...open, run.dimId],
                      );
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <ChevronRight
                      className={cn("h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform", isOpen && "rotate-90")}
                    />
                    <span className="rounded-md bg-brand-navy/5 px-1.5 py-0.5 font-bold font-bricolage text-[11px] text-brand-navy">
                      {dim?.code ?? "—"}
                    </span>
                    <span className="truncate font-manrope font-semibold text-gray-800 text-sm">
                      {dim?.name ?? "Tanpa dimensi"}
                    </span>
                    <span className="ml-auto shrink-0 font-manrope text-[11px] text-muted-foreground">
                      {visible.length === items.length
                        ? `${items.length} soal`
                        : `${visible.length}/${items.length} soal`}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-50 border-gray-100 border-t pb-1">
                      {visible.map(({ q, i }) => (
                        <Row key={q.id} q={q} i={i} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          : questions.map((q, i) => (matches(q) ? <Row key={q.id} q={q} i={i} /> : null))}
      </div>
    </div>
  );
}
