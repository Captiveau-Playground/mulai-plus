"use client";

// Panel "Aturan tes" — dikelompokkan jadi accordion dengan RINGKASAN di header, supaya admin
// tidak perlu membuka/membaca puluhan field sekaligus (versi sebelumnya ±2.3 layar penuh).
import { CheckCircle2, FilePlus2, Loader2, Rocket, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DimensionsCard, type DimRow } from "./dimensions-card";
import { NumberField, SegmentedField, SelectField, SwitchField } from "./field-controls";
import { type InstructionRow, type SectionRow, SectionsCard } from "./sections-card";
import { buildChecks, ValidationChecklist } from "./validation-checklist";
import { VersionList, type VersionRow } from "./version-list";

export interface SettingsPanelProps {
  assess: { id: string; name: string; code: string; family?: string | null };
  versions: VersionRow[];
  selectedVersionId?: string | null;
  canEdit: boolean;
  rules: Record<string, any>;
  onRulesChange: (updater: (r: Record<string, any>) => Record<string, any>) => void;
  dims: DimRow[];
  questions: {
    id: string;
    dimensionId: string;
    questionType: string;
    scaleId?: string | null;
    displayOrder?: number | null;
  }[];
  options: { questionId: string; label?: string | null; imageUrl?: string | null; icon?: string | null }[];
  sections: SectionRow[];
  instructions: InstructionRow[];
  gate?: { ok?: boolean; errors?: string[]; warnings?: string[] };
  onSelectVersion: (id: string) => void;
  onPreviewVersion: (v: VersionRow) => void;
  onPublishVersion: (v: VersionRow) => void;
  onSetFamily: (f: string) => void;
  /** `config` opsional = simpan nilai tertentu langsung (dipakai tombol perbaikan cepat). */
  onSaveRules: (config?: Record<string, unknown>) => void;
  onStartEdit: () => void;
  onDimsAdd: (code: string, name: string) => void;
  onDimsDelete: (id: string) => void;
  onDimsUpdate: (id: string, durationSeconds: number) => void;
  /** (#7) scope timer per dimensi */
  onDimTimerScope: (id: string, scope: "inherit" | "none" | "dimension" | "question") => void;
  onSectionSave: (s: SectionRow) => void;
  onSectionDelete: (id?: string) => void;
  onInstructionSave: (i: InstructionRow) => void;
  /** true = admin sudah menekan "Ubah" di versi live tapi belum ada perubahan tersimpan */
  pendingDraft?: boolean;
  savingRules?: boolean;
  creatingDraft?: boolean;
  addingDim?: boolean;
  /** grup yang otomatis dibuka (mis. saat admin klik error dimensi) */
  focusGroup?: string | null;
}

function GroupTrigger({ id, title, summary, warn }: { id: string; title: string; summary: string; warn?: boolean }) {
  return (
    <AccordionTrigger
      data-testid={`group-trigger-${id}`}
      className="items-center gap-2 py-2.5 hover:no-underline [&>svg]:size-3.5"
    >
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="font-bold font-bricolage text-brand-navy text-xs">{title}</span>
        <span
          className={cn(
            "truncate font-manrope font-normal text-[10px]",
            warn ? "text-amber-600" : "text-muted-foreground",
          )}
        >
          {summary}
        </span>
      </span>
    </AccordionTrigger>
  );
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    assess,
    versions,
    selectedVersionId,
    canEdit,
    rules,
    onRulesChange,
    dims,
    questions,
    options,
    sections,
    instructions,
    gate,
    savingRules,
    creatingDraft,
    addingDim,
  } = props;

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  useEffect(() => {
    if (props.focusGroup) setOpenGroups((g) => (g.includes(props.focusGroup!) ? g : [...g, props.focusGroup!]));
  }, [props.focusGroup]);

  const set = (k: string, v: unknown) => onRulesChange((r) => ({ ...r, [k]: v }));
  const num = (v: unknown, fallback: number) => (v === undefined || v === "" || v === null ? fallback : Number(v));

  const totalDim = num(rules.total_dim, dims.length);
  const resultN = num(rules.result_dim_count, 3);
  const minQ = num(rules.min_q_per_dim, 0);
  const timerOn = rules.timer_enabled === true;
  const scope = rules.timer_scope ?? "dimension";
  const questionCount = (id: string) => questions.filter((q) => q.dimensionId === id).length;
  const countByDim = Object.fromEntries(dims.map((d) => [d.id, questionCount(d.id)]));
  const dimsKurang = minQ > 0 ? dims.filter((d) => (countByDim[d.id] ?? 0) < minQ).length : 0;
  // Soal skala (likert) urutan opsinya bermakna → "Acak urutan pilihan" tidak berlaku untuknya.
  const likertCount = questions.filter((q) => q.questionType === "likert").length;
  const multiSection = (rules.section_mode ?? "none") !== "none";

  const checks = buildChecks({
    name: assess.name,
    code: assess.code,
    dimensions: dims,
    questions,
    options,
    totalDim,
    resultDimCount: resultN,
    minQPerDim: minQ,
    randomizeA: rules.randomize_a === true,
  });

  const timerSummary = !timerOn
    ? "Tanpa batas waktu"
    : scope === "dimension"
      ? `Per bagian · ${dims.filter((d) => (d.durationSeconds ?? 0) > 0).length}/${dims.length} dimensi ada durasi`
      : `Per soal · ${num(rules.time_per_question, 30)} detik/soal`;
  const scoreSummary = `${rules.scoring_method === "average" ? "Rata-rata" : rules.scoring_method === "weighted" ? "Bobot soal" : "Jumlah poin"} · top-${resultN}${minQ > 0 ? ` · min ${minQ} soal/dimensi` : ""}`;
  const experienceSummary = [
    rules.randomize_q ? "acak soal" : "soal urut",
    rules.randomize_a ? (likertCount > 0 ? "acak opsi (bentrok soal skala)" : "acak opsi") : "opsi urut",
    rules.allow_pause ? "boleh pause" : "tanpa pause",
    rules.section_mode && rules.section_mode !== "none" ? "multi-bagian" : "satu bagian",
    rules.lang === "en" ? "EN" : "ID",
  ].join(" · ");

  return (
    <div id="aturan" className="rounded-2xl border border-gray-200 bg-white">
      {props.pendingDraft && (
        <div
          className="flex items-start gap-2 border-amber-100 border-b bg-amber-50/70 px-4 py-2.5"
          data-testid="pending-draft-banner"
        >
          <FilePlus2 className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="font-manrope text-[11px] text-amber-800 leading-4">
            <b>Mode ubah</b> — draf baru dibuat otomatis saat perubahan pertama kamu simpan. Versi yang dipakai siswa
            belum berubah.
          </p>
        </div>
      )}

      {/* ── Rilis & Versi ── */}
      <div className="border-gray-100 border-b px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 font-bold font-bricolage text-brand-navy text-sm">
          <Rocket className="h-3.5 w-3.5" /> Rilis &amp; Versi
        </p>
        <VersionList
          versions={versions}
          selectedId={selectedVersionId}
          onSelect={props.onSelectVersion}
          onPreview={props.onPreviewVersion}
          onPublish={props.onPublishVersion}
          disabled={creatingDraft}
        />
        <label className="mt-3 flex items-center gap-2 border-gray-100 border-t pt-2.5" htmlFor="family">
          <span className="font-manrope font-semibold text-[11px] text-foreground">Jenis (B2C/B2B)</span>
          <select
            id="family"
            data-testid="rule-family"
            value={assess.family ?? ""}
            onChange={(e) => props.onSetFamily(e.target.value)}
            className="h-7 flex-1 rounded-lg border border-gray-200 bg-white px-2 font-manrope text-[11px] outline-none focus:border-brand-orange/50"
          >
            <option value="">Bebas (B2B / umum)</option>
            <option value="minat">Tes Minat — max 1 LIVE (B2C)</option>
            <option value="bakat">Tes Bakat — max 1 LIVE (B2C)</option>
          </select>
        </label>
      </div>

      {/* ── Grup aturan ── */}
      <Accordion className="px-4" value={openGroups} onValueChange={(v) => setOpenGroups((v as string[]) ?? [])}>
        <AccordionItem value="waktu" className="border-gray-100">
          <GroupTrigger
            id="waktu"
            title="Waktu / Timer"
            summary={timerSummary}
            warn={timerOn && scope === "dimension" && dims.some((d) => !(d.durationSeconds ?? 0))}
          />
          <AccordionContent>
            <div className="space-y-2.5">
              <SwitchField
                id="timer_enabled"
                label="Batasi waktu pengerjaan"
                hint="Server-authoritative — jeda/reload tetap dihitung, dan jawaban setelah deadline ditolak."
                checked={timerOn}
                disabled={!canEdit}
                onChange={(v) => set("timer_enabled", v)}
              />
              {timerOn && (
                <>
                  <SegmentedField
                    id="timer_scope"
                    label="Cakupan timer"
                    hint="Per bagian = waktu tiap dimensi (isi durasi di tabel Dimensi). Per soal = countdown tiap soal."
                    disabled={!canEdit}
                    value={scope}
                    onChange={(v) => set("timer_scope", v)}
                    options={[
                      ["none", "Tanpa batas"],
                      ["dimension", "Per bagian"],
                      ["question", "Per soal"],
                    ]}
                  />
                  {scope === "question" && (
                    <NumberField
                      id="time_per_question"
                      label="Detik per soal"
                      hint="Dipakai bila soal tidak punya durasi sendiri."
                      suffix="detik"
                      disabled={!canEdit}
                      value={num(rules.time_per_question, 30)}
                      onChange={(v) => set("time_per_question", v)}
                    />
                  )}
                  {scope === "dimension" && (
                    <p
                      className="rounded-lg bg-amber-50 px-2 py-1.5 font-manrope text-[10px] text-amber-700"
                      data-testid="timer-duration-warning"
                    >
                      {dims.filter((d) => !(d.durationSeconds ?? 0)).length} dimensi belum punya durasi — isi di tabel{" "}
                      <b>Dimensi</b>.
                    </p>
                  )}
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="penilaian" className="border-gray-100">
          <GroupTrigger id="penilaian" title="Penilaian" summary={scoreSummary} />
          <AccordionContent>
            <div className="space-y-2.5">
              <SelectField
                id="scoring_method"
                label="Cara nilai"
                hint="Jumlah poin = skor dijumlah. Rata-rata = dibagi banyak soal. Bobot = dikali bobot soal."
                disabled={!canEdit}
                value={rules.scoring_method ?? "sum"}
                onChange={(v) => set("scoring_method", v)}
                options={[
                  ["sum", "Jumlah poin"],
                  ["average", "Rata-rata"],
                  ["weighted", "Bobot soal"],
                ]}
              />
              <SelectField
                id="scoring_mode"
                label="Pembobotan bagian"
                hint="Likert = poin naik linier mengikuti urutan opsi (skor manual diabaikan). Bobot bebas = pakai skor tiap opsi."
                disabled={!canEdit}
                value={rules.scoring_mode ?? "free_text"}
                onChange={(v) => set("scoring_mode", v)}
                options={[
                  ["free_text", "Bobot bebas (skor manual per opsi)"],
                  ["likert", "Linear scale (skala Likert)"],
                ]}
              />
              {rules.scoring_mode === "likert" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <NumberField
                    id="likert_min"
                    label="Skala minimal"
                    disabled={!canEdit}
                    value={num(rules.likert_min, 1)}
                    onChange={(v) => set("likert_min", v)}
                  />
                  <NumberField
                    id="likert_max"
                    label="Skala maksimal"
                    disabled={!canEdit}
                    value={num(rules.likert_max, 5)}
                    onChange={(v) => set("likert_max", v)}
                  />
                </div>
              )}
              <NumberField
                id="result_dim_count"
                label="Tampilkan N kode teratas"
                hint="Berapa peringkat teratas yang ditampilkan ke siswa (cth 3 → S-I-A)."
                disabled={!canEdit}
                min={1}
                value={num(rules.result_dim_count, 3)}
                onChange={(v) => set("result_dim_count", v)}
              />
              <NumberField
                id="min_q_per_dim"
                label="Min. soal per dimensi"
                hint="Syarat jumlah soal per dimensi agar versi bisa dirilis."
                disabled={!canEdit}
                value={num(rules.min_q_per_dim, 0)}
                onChange={(v) => set("min_q_per_dim", v)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pengalaman" className="border-gray-100">
          <GroupTrigger
            id="pengalaman"
            title="Pengalaman Siswa"
            summary={experienceSummary}
            warn={(rules.randomize_a === true && likertCount > 0) || (rules.randomize_q === true && multiSection)}
          />
          <AccordionContent>
            <div className="space-y-2">
              <SwitchField
                id="randomize_q"
                label="Acak urutan soal"
                hint="Urutan soal diacak untuk setiap siswa; snapshot disimpan di sesi agar resume tetap konsisten."
                disabled={!canEdit}
                checked={rules.randomize_q === true}
                onChange={(v) => set("randomize_q", v)}
                note={
                  rules.randomize_q === true && multiSection ? (
                    <>
                      <span>⚠️ Aktif bersamaan dengan pembagian bagian — batas tiap bagian jadi tidak menentu.</span>
                      <button
                        type="button"
                        data-testid="fix-randomize_q"
                        onClick={() => {
                          set("randomize_q", false);
                          props.onSaveRules({ ...rules, randomize_q: false });
                        }}
                        className="rounded border border-amber-300 bg-white px-1.5 py-px font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Matikan acak soal
                      </button>
                    </>
                  ) : undefined
                }
              />
              <SwitchField
                id="randomize_a"
                label="Acak urutan pilihan"
                hint="Urutan opsi jawaban diacak per siswa. Tidak berlaku untuk soal skala (likert) — urutan opsinya bermakna."
                disabled={!canEdit || (likertCount > 0 && rules.randomize_a !== true)}
                checked={rules.randomize_a === true}
                onChange={(v) => set("randomize_a", v)}
                note={
                  likertCount > 0 ? (
                    rules.randomize_a === true ? (
                      <>
                        <span>
                          ⚠️ Ada <b>{likertCount} soal skala</b> — urutan opsinya bermakna dan tidak akan diacak server.
                        </span>
                        <button
                          type="button"
                          data-testid="fix-randomize_a"
                          onClick={() => {
                            set("randomize_a", false);
                            props.onSaveRules({ ...rules, randomize_a: false });
                          }}
                          className="rounded border border-amber-300 bg-white px-1.5 py-px font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          Matikan acak opsi
                        </button>
                      </>
                    ) : (
                      <span>Tidak berlaku: versi ini punya {likertCount} soal skala (urutan opsinya bermakna).</span>
                    )
                  ) : undefined
                }
              />
              <SwitchField
                id="allow_pause"
                label="Izinkan lanjut kemudian"
                hint="Siswa boleh berhenti dan melanjutkan tes lain waktu. Kalau dimatikan, tombol pause disembunyikan dan server menolak jeda."
                disabled={!canEdit}
                checked={rules.allow_pause === true}
                onChange={(v) => set("allow_pause", v)}
              />
              <SegmentedField
                id="section_mode"
                label="Pembagian bagian soal"
                hint="Pecah alur tes jadi beberapa bagian dengan checkpoint antar bagian."
                disabled={!canEdit}
                value={rules.section_mode ?? "none"}
                onChange={(v) => set("section_mode", v)}
                options={[
                  ["none", "Satu bagian"],
                  ["by_dimension", "Per dimensi"],
                  ["chunk:20", "Per 20 soal"],
                ]}
              />
              <SegmentedField
                id="lang"
                label="Bahasa antarmuka"
                hint="Bahasa tombol & label yang dilihat siswa."
                disabled={!canEdit}
                value={rules.lang ?? "id"}
                onChange={(v) => set("lang", v)}
                options={[
                  ["id", "Indonesia"],
                  ["en", "English"],
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dimensi" className="border-gray-100">
          <GroupTrigger
            id="dimensi"
            title={`Dimensi (${dims.length})`}
            summary={
              dimsKurang > 0
                ? `${dimsKurang} dimensi belum memenuhi min. ${minQ} soal`
                : `${questions.length} soal tersebar di ${dims.length} dimensi`
            }
            warn={dimsKurang > 0}
          />
          <AccordionContent>
            <DimensionsCard
              dims={dims}
              canEdit={canEdit}
              countByDim={countByDim}
              minQPerDim={minQ}
              timerScope={timerOn ? scope : undefined}
              onAdd={props.onDimsAdd}
              onDelete={props.onDimsDelete}
              onDurationChange={props.onDimsUpdate}
              onTimerScopeChange={props.onDimTimerScope}
              adding={addingDim}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="konten" className="border-gray-100 border-b-0">
          <GroupTrigger
            id="konten"
            title="Pengantar & Instruksi"
            summary={`${sections.length} pengantar · ${instructions.length} instruksi`}
          />
          <AccordionContent>
            <SectionsCard
              sections={sections}
              instructions={instructions}
              dims={dims}
              canEdit={canEdit}
              onSaveSection={props.onSectionSave}
              onDeleteSection={props.onSectionDelete}
              onSaveInstruction={props.onInstructionSave}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Aksi + status kelayakan ── */}
      <div className="space-y-2.5 border-gray-100 border-t bg-gray-50/60 px-4 py-3">
        <ValidationChecklist checks={checks} serverErrors={gate?.errors} warnings={gate?.warnings} />
        {canEdit ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            data-testid="save-rules"
            onClick={() => props.onSaveRules()}
            disabled={savingRules}
          >
            {savingRules ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}{" "}
            Simpan aturan
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            data-testid="start-edit"
            onClick={props.onStartEdit}
            disabled={creatingDraft}
          >
            {creatingDraft ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FilePlus2 className="mr-1 h-3.5 w-3.5" />
            )}{" "}
            Ubah aturan (buat draf)
          </Button>
        )}
        {gate?.ok && (
          <p className="flex items-center gap-1.5 font-manrope font-semibold text-[10px] text-teal-700">
            <ShieldCheck className="h-3 w-3" /> Verifikasi server lolos.
          </p>
        )}
        {gate?.ok === false && (
          <p className="flex items-center gap-1.5 font-manrope text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> {gate.errors?.length ?? 0} catatan dari server saat verifikasi
            terakhir.
          </p>
        )}
      </div>
    </div>
  );
}
