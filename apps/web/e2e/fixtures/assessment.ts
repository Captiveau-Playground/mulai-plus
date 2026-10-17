// Fixture assessment: bikin/isi/hapus tes uji lewat RPC admin (dari konteks browser yang login).
// Semua data uji memakai kode unik (prefix E2E) supaya tidak menyentuh tes produksi (DISCOVER/TALENT).
import type { Page } from "@playwright/test";
import { adminRpc } from "../helpers/api";
import { runTag } from "../helpers/env";

export interface Dim {
  id: string;
  code: string;
  name: string;
  durationSeconds?: number | null;
}
export interface Qn {
  id: string;
  questionType: string;
  questionText: string;
  dimensionId: string;
  weight?: number;
  displayOrder?: number;
}
export interface Content {
  questions: Qn[];
  options: any[];
  textConfigs: any[];
  dimensions: Dim[];
  scales: any[];
}

export interface QuestionInput {
  dimensionId: string;
  questionText: string;
  questionType: "multiple_choice" | "likert" | "text_input";
  options?: {
    optionValue?: string;
    label?: string;
    score?: number;
    imageUrl?: string | null;
    imageCaption?: string | null;
    icon?: string | null;
  }[];
  textEval?: { evaluationType: string; answerKey: string; numericTolerance?: string } | null;
  presentationMode?: string;
  weight?: number;
  durationSeconds?: number | null;
  hasMathNotation?: boolean;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  displayOrder?: number;
}

export async function createAssessment(
  page: Page,
  input: { code: string; name: string; description?: string; family?: "minat" | "bakat" | null },
) {
  const r = await adminRpc<{ ok: boolean; assessmentId: string; versionId: string; error?: string }>(
    page,
    "discoverAdmin/create",
    input,
  );
  if (!r.ok || !r.assessmentId) throw new Error(`create assessment gagal: ${JSON.stringify(r)}`);
  return { assessmentId: r.assessmentId, versionId: r.versionId };
}

export async function removeAssessment(page: Page, assessmentId: string) {
  return adminRpc(page, "discoverAdmin/remove", { id: assessmentId });
}

export async function summaries(page: Page) {
  const r = await adminRpc<{ items: any[] }>(page, "discoverAdmin/summaries");
  return r.items ?? [];
}

export async function versionOf(page: Page, code: string, status?: string) {
  const items = await summaries(page);
  const assess = items.find((x) => x.code === code);
  const versions: any[] = assess?.versions ?? [];
  return {
    assessment: assess,
    versions,
    version: status
      ? versions.find((v) => v.status === status)
      : (versions.find((v) => v.status === "draft") ?? versions[0]),
  };
}

export async function contentOf(page: Page, versionId: string): Promise<Content> {
  const r = await adminRpc<Content>(page, "discoverAdmin/versions/contentList", { versionId });
  return {
    questions: r.questions ?? [],
    options: r.options ?? [],
    textConfigs: r.textConfigs ?? [],
    dimensions: r.dimensions ?? [],
    scales: r.scales ?? [],
  };
}

export async function addDimension(
  page: Page,
  versionId: string,
  code: string,
  name: string,
  durationSeconds?: number,
) {
  const r = await adminRpc(page, "discoverAdmin/versions/dimsAdd", { versionId, code, name });
  if (!r.ok) throw new Error(`dimsAdd gagal: ${JSON.stringify(r)}`);
  const c = await contentOf(page, versionId);
  const dim = c.dimensions.find((d) => d.code === code);
  if (!dim) throw new Error(`dimensi ${code} tidak muncul setelah dimsAdd`);
  if (durationSeconds != null) {
    await adminRpc(page, "discoverAdmin/versions/dimsUpdate", { dimensionId: dim.id, durationSeconds });
  }
  return dim.id;
}

export async function configUpdate(page: Page, versionId: string, config: Record<string, unknown>) {
  return adminRpc(page, "discoverAdmin/versions/configUpdate", { versionId, config });
}

export async function saveQuestion(page: Page, versionId: string, input: QuestionInput) {
  const options = input.questionType === "text_input" ? [] : (input.options ?? []);
  // displayOrder wajib unik per dimensi (dicek gate saat publish).
  // Bila tidak disebut, pakai jumlah soal saat ini (perilaku yang benar).
  const displayOrder = input.displayOrder ?? (await contentOf(page, versionId)).questions.length;
  const r = await adminRpc<{ ok?: boolean }>(page, "discoverAdmin/versions/contentSave", {
    versionId,
    questionData: {
      dimensionId: input.dimensionId,
      questionText: input.questionText,
      questionType: input.questionType,
      hasMathNotation: input.hasMathNotation ?? false,
      mediaUrl: input.mediaUrl ?? null,
      mediaCaption: input.mediaCaption ?? null,
      presentationMode: input.presentationMode ?? "standard_option_card",
      weight: input.weight ?? 1,
      durationSeconds: input.durationSeconds ?? null,
      displayOrder,
      isActive: true,
      options: options.map((o, i) => ({
        optionValue: o.optionValue ?? "ABCDEF"[i],
        label: o.label ?? "",
        score: o.score ?? 0,
        imageUrl: o.imageUrl ?? null,
        imageCaption: o.imageCaption ?? null,
        icon: o.icon ?? null,
        displayOrder: i,
      })),
      textEval: input.questionType === "text_input" ? (input.textEval ?? null) : null,
    },
  });
  if (r.ok === false) throw new Error(`contentSave gagal: ${JSON.stringify(r)}`);
  return r;
}

export async function saveSection(
  page: Page,
  versionId: string,
  s: { title: string; contentType?: string; contentJson?: any; displayOrder?: number },
) {
  const r = await adminRpc(page, "discoverAdmin/versions/sectionSave", {
    versionId,
    title: s.title,
    contentType: s.contentType ?? "description",
    contentJson: s.contentJson ?? { text: "" },
    displayOrder: s.displayOrder ?? 0,
    visibility: true,
  });
  if (r.ok === false) throw new Error(`sectionSave gagal: ${JSON.stringify(r)}`);
  return r;
}

export async function saveInstruction(
  page: Page,
  dimensionId: string,
  i: { header: string; contentType?: string; contentJson?: any },
) {
  const r = await adminRpc(page, "discoverAdmin/versions/instrSave", {
    dimensionId,
    header: i.header,
    contentType: i.contentType ?? "bullet_list",
    contentJson: i.contentJson ?? { items: [] },
  });
  if (r.ok === false) throw new Error(`instrSave gagal: ${JSON.stringify(r)}`);
  return r;
}

export async function validate(page: Page, versionId: string) {
  return adminRpc<{ ok: boolean; errors: string[]; warnings: string[] }>(page, "discoverAdmin/versions/validate", {
    versionId,
  });
}

export async function publish(page: Page, versionId: string) {
  return adminRpc<{ ok: boolean; errors?: string[] }>(page, "discoverAdmin/versions/publish", { versionId });
}

export async function createDraft(page: Page, code: string) {
  return adminRpc<{ ok: boolean; versionId: string; versionNumber: number }>(
    page,
    "discoverAdmin/versions/createDraft",
    { code },
  );
}

/**
 * Bangun tes uji yang LENGKAP & SIAP RILIS — mencakup semua tipe soal.
 * Dipakai sisi admin (gate/publish) maupun sisi user (engine).
 */
export async function buildReadyAssessment(
  page: Page,
  opts: { code: string; name?: string; timer?: Record<string, unknown>; minQPerDim?: number; sectionMode?: string },
) {
  const { code } = opts;
  const { assessmentId, versionId } = await createAssessment(page, {
    code,
    name: opts.name ?? `E2E Assessment ${code}`,
  });
  const d1 = await addDimension(page, versionId, "D1", "Dimensi Satu", 60);
  const d2 = await addDimension(page, versionId, "D2", "Dimensi Dua", 60);

  await configUpdate(page, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    scoring_method: "sum",
    randomize_q: false,
    randomize_a: false,
    allow_pause: true,
    section_mode: opts.sectionMode ?? "none",
    ...(opts.timer ?? {}),
  });

  // pilihan ganda (bobot bebas)
  await saveQuestion(page, versionId, {
    dimensionId: d1,
    questionText: "MC-1: mana yang paling kamu suka?",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "Sains", score: 3 },
      { optionValue: "B", label: "Seni", score: 0 },
    ],
  });
  // skala (likert)
  await saveQuestion(page, versionId, {
    dimensionId: d1,
    questionText: "LIKERT-1: seberapa suka kamu bekerja dalam tim?",
    questionType: "likert",
    options: [1, 2, 3, 4, 5].map((v) => ({ optionValue: "ABCDE"[v - 1], label: String(v), score: v })),
  });
  // isian numerik dengan toleransi
  await saveQuestion(page, versionId, {
    dimensionId: d2,
    questionText: "TEXT-NUM: hasil dari 3/4?",
    questionType: "text_input",
    textEval: { evaluationType: "numeric_tolerance", answerKey: "0.75", numericTolerance: "0.01" },
  });
  // isian persis (exact match, pecahan harus setara)
  await saveQuestion(page, versionId, {
    dimensionId: d2,
    questionText: "TEXT-EXACT: tulis 'Jakarta'",
    questionType: "text_input",
    textEval: { evaluationType: "exact_match", answerKey: "Jakarta" },
  });
  // publikasi
  const gate = await validate(page, versionId);
  if (!gate.ok) throw new Error(`fixture belum valid: ${JSON.stringify(gate.errors)}`);
  const pub = await publish(page, versionId);
  if (!pub.ok) throw new Error(`fixture gagal publish: ${JSON.stringify(pub.errors)}`);
  return { assessmentId, versionId, dims: { d1, d2 } };
}

/* ───────────────────────── fixture sisi UI siswa ───────────────────────── */

export interface UiFixture {
  code: string;
  versionId: string;
  total: number;
  dims: { d1: string; d2: string };
}

/**
 * Tes uji untuk halaman preview siswa: 2 dimensi, 4 soal (pilihan ganda emoji, likert,
 * isian numerik, isian persis) + pengantar & instruksi.
 * `first` menentukan tipe soal yang tampil paling awal (engine selalu mulai dari soal pertama).
 */
export async function buildUiFixture(
  page: Page,
  opts?: {
    first?: "mc" | "likert" | "text";
    timer?: Record<string, unknown>;
    allowPause?: boolean;
    withSections?: boolean;
  },
): Promise<UiFixture> {
  const first = opts?.first ?? "mc";
  const { code } = runTag("E2EUI");
  const { versionId } = await createAssessment(page, { code, name: `E2E UI ${code}` });
  const d1 = await addDimension(page, versionId, "D1", "Dimensi Kreatif");
  const d2 = await addDimension(page, versionId, "D2", "Dimensi Analitis");
  await configUpdate(page, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    scoring_method: "sum",
    section_mode: "by_dimension",
    allow_pause: opts?.allowPause ?? true,
    lang: "id",
    ...(opts?.timer ?? {}),
  });

  const mc = {
    dimensionId: d1,
    questionText: "Kamu lebih suka bekerja dengan…",
    questionType: "multiple_choice" as const,
    presentationMode: "emoji_option",
    options: [
      { optionValue: "A", label: "Data dan eksperimen", icon: "🔬", score: 2 },
      { optionValue: "B", label: "Ide kreatif dan visual", icon: "🎨", score: 0 },
    ],
  };
  const likert = {
    dimensionId: d1,
    questionText: "Seberapa nyaman kamu bekerja dalam tim?",
    questionType: "likert" as const,
    options: [1, 2, 3, 4, 5].map((v) => ({ optionValue: "ABCDE"[v - 1], label: String(v), score: v })),
  };
  const textNum = {
    // section_mode = by_dimension → runtime mengelompokkan soal per dimensi. Supaya soal yang
    // diminta "pertama" benar-benar tampil pertama, soal isian ditaruh di dimensi pertama.
    dimensionId: first === "text" ? d1 : d2,
    questionText: "Hasil dari 3/4 adalah…",
    questionType: "text_input" as const,
    textEval: { evaluationType: "numeric_tolerance", answerKey: "0.75", numericTolerance: "0.01" },
  };
  const textExact = {
    dimensionId: d2,
    questionText: "Ibu kota Indonesia adalah…",
    questionType: "text_input" as const,
    textEval: { evaluationType: "exact_match", answerKey: "jakarta" },
  };

  const order =
    first === "likert"
      ? [likert, mc, textNum, textExact]
      : first === "text"
        ? [textNum, mc, likert, textExact]
        : [mc, likert, textNum, textExact];
  for (const q of order) await saveQuestion(page, versionId, q);

  if (opts?.withSections !== false) {
    await saveSection(page, versionId, {
      title: "Sebelum mulai",
      contentType: "description",
      contentJson: { text: "Tes ini mengukur minat & cara berpikirmu." },
      displayOrder: 0,
    });
    await saveSection(page, versionId, {
      title: "Cara menjawab",
      contentType: "bullet_list",
      contentJson: { items: ["Tidak ada jawaban benar atau salah", "Jawab sejujur mungkin"] },
      displayOrder: 1,
    });
    await saveInstruction(page, d1, {
      header: "Bagian Dimensi Kreatif",
      contentType: "bullet_list",
      contentJson: { items: ["Pilih yang paling menggambarkan dirimu"] },
    });
  }

  const gate = await validate(page, versionId);
  if (!gate.ok) throw new Error(`fixture UI belum valid: ${JSON.stringify(gate.errors)}`);
  if (!(await publish(page, versionId)).ok) throw new Error("fixture UI gagal publish");

  return { code, versionId, total: order.length, dims: { d1, d2 } };
}

/** Fixture ringkas: n soal pilihan ganda dalam 1 dimensi + konfigurasi bebas. */
export async function buildSimpleAssessment(
  page: Page,
  opts: { name: string; questionCount?: number; optionCount?: number; config?: Record<string, unknown> },
) {
  const { code } = runTag("E2EWR");
  const { versionId } = await createAssessment(page, { code, name: `${opts.name} ${code}` });
  const d1 = await addDimension(page, versionId, "D1", "Dimensi Satu");
  const optionCount = opts.optionCount ?? 3;
  await configUpdate(page, versionId, {
    total_dim: 1,
    result_dim_count: 1,
    min_q_per_dim: 1,
    scoring_method: "sum",
    ...(opts.config ?? {}),
  });
  for (let i = 0; i < (opts.questionCount ?? 4); i++) {
    await saveQuestion(page, versionId, {
      dimensionId: d1,
      questionText: `Soal ${i + 1}`,
      questionType: "multiple_choice",
      options: Array.from({ length: optionCount }, (_, j) => ({
        optionValue: "ABCDF"[j] ?? String(j),
        label: `Opsi ${j + 1}`,
        score: j === 0 ? 1 : 0,
      })),
    });
  }
  const gate = await validate(page, versionId);
  if (!gate.ok) throw new Error(`fixture belum valid: ${JSON.stringify(gate.errors)}`);
  if (!(await publish(page, versionId)).ok) throw new Error("fixture gagal publish");
  return { code, versionId, d1 };
}
