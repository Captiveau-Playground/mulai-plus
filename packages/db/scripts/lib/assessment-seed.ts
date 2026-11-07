/**
 * Lib seed assessment — dipakai `seed-assessment-prod.mts` dan `seed-assessment-catalog.mts`.
 * Tidak melakukan I/O CLI; semua fungsi menerima `db` supaya bisa dipakai ulang & diuji.
 */

import { eq, inArray, sql } from "drizzle-orm";
import { CAREER_PROFILES, MAJOR_PATTERNS } from "../../../api/src/lib/assessment-catalog";
import { db as defaultDb, schema } from "../../src";
import { DISCOVER_CONFIG, TALENT_CONFIG, TALENT_DIMS, TALENT_ITEMS, type TemplateRow } from "../assessment-banks";
import { nanoidish as id } from "../lib-id";
import { LIKERT, DIMS as RIASEC_DIMS, ITEMS as RIASEC_ITEMS } from "../seed-discover-riasec";

export type Db = typeof defaultDb;

const PRESENTATION: Record<string, string> = {
  standar: "standard_option_card",
  emoji: "emoji_option",
  gambar: "image_option",
  banding: "visual_comparison",
};
const EVAL: Record<string, "exact_match" | "numeric_tolerance" | "keyword_match" | "pattern_match"> = {
  persis: "exact_match",
  angka: "numeric_tolerance",
  kata: "keyword_match",
  pola: "pattern_match",
};

export type SeedLog = (msg: string) => void;
const noop: SeedLog = () => {};

// ── Katalog jurusan & karier ────────────────────────────────────────────

export async function seedCatalog(db: Db = defaultDb, log: SeedLog = noop) {
  let inserted = 0;
  let updated = 0;
  for (const pat of MAJOR_PATTERNS) {
    const existing = await db.query.tmbMajorPatterns.findFirst({
      where: eq(schema.tmbMajorPatterns.categoryKey, pat.key),
    });
    const values = {
      categoryKey: pat.key,
      categoryName: pat.name,
      pattern: pat.pattern,
      hollandPrimary: pat.hollandPrimary,
      hollandSecondary: pat.hollandSecondary,
      abilityWeights: pat.abilityWeights as Record<string, number>,
      isActive: true,
    };
    if (existing) {
      await db.update(schema.tmbMajorPatterns).set(values).where(eq(schema.tmbMajorPatterns.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.tmbMajorPatterns).values({ id: id(), ...values });
      inserted++;
    }
  }

  const keys = MAJOR_PATTERNS.map((p) => p.key);
  await db.delete(schema.tmbCareerMappings).where(inArray(schema.tmbCareerMappings.majorCategory, keys));
  let careers = 0;
  for (const key of keys) {
    for (const name of CAREER_PROFILES[key] ?? []) {
      await db.insert(schema.tmbCareerMappings).values({ id: id(), majorCategory: key, careerName: name });
      careers++;
    }
  }

  // pola lama di luar katalog ⇒ nonaktifkan (jangan dihapus: riwayat hasil tetap terbaca)
  const all = await db.query.tmbMajorPatterns.findMany({ columns: { id: true, categoryKey: true } });
  const stale = all.filter((p) => !keys.includes(p.categoryKey));
  for (const s of stale) {
    await db.update(schema.tmbMajorPatterns).set({ isActive: false }).where(eq(schema.tmbMajorPatterns.id, s.id));
  }

  // ── petakan prodi → kategori (sekali di sini, bukan saat siswa menyelesaikan tes) ──
  const mapped = await backfillProdiCategories(db, log);

  log(
    `katalog: ${inserted} pola baru · ${updated} diperbarui · ${stale.length} dinonaktifkan · ` +
      `${careers} karier · ${mapped.updated}/${mapped.total} prodi dipetakan`,
  );
  return { patterns: MAJOR_PATTERNS.length, careers, inserted, updated, stale: stale.length, prodiMapped: mapped };
}

// ── Assessment & versi ──────────────────────────────────────────────────

const ASSESSMENT_META = {
  DISCOVER: {
    name: "MULAI Discover™",
    family: "minat" as const,
    description: "Tes minat Holland (RIASEC) — 120 aitem skala emoji.",
  },
  TALENT: {
    name: "MULAI Talent™",
    family: "bakat" as const,
    description: "Tes bakat/kemampuan — 120 soal (pilihan ganda, isian, skala).",
  },
};

export async function ensureAssessment(db: Db, code: "DISCOVER" | "TALENT", log: SeedLog = noop) {
  const meta = ASSESSMENT_META[code];
  const existing = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, code) });
  if (existing) {
    log(`${code}: assessment sudah ada (${existing.name})`);
    return existing;
  }
  const idNew = id();
  await db.insert(schema.assessments).values({
    id: idNew,
    code,
    name: meta.name,
    family: meta.family,
    description: meta.description,
  });
  log(`${code}: assessment DIBUAT (${meta.name})`);
  const created = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, idNew) });
  if (!created) throw new Error(`gagal membuat assessment ${code}`);
  return created;
}

/** Versi target: draft terbaru → atau buat baru (v1 / live+1). Tidak pernah memilih versi live. */
export async function ensureDraftVersion(
  db: Db,
  assessmentId: string,
  opts: { fresh?: boolean } = {},
  log: SeedLog = noop,
) {
  const versions = await db.query.assessmentVersions.findMany({
    where: eq(schema.assessmentVersions.assessmentId, assessmentId),
  });
  const draft = versions.filter((v) => v.status === "draft").sort((a, b) => b.versionNumber - a.versionNumber)[0];

  if (draft && !opts.fresh) {
    log(`versi draft v${draft.versionNumber} dipakai`);
    return draft;
  }
  if (draft && opts.fresh) {
    log(`draft v${draft.versionNumber} sudah ada → dipakai ulang (mode fresh hanya membuat bila belum ada)`);
    return draft;
  }
  const maxNumber = versions.reduce((m, v) => Math.max(m, v.versionNumber), 0);
  const live = versions.find((v) => v.status === "live");
  const versionNumber = maxNumber + 1;
  const newId = id();
  await db.insert(schema.assessmentVersions).values({
    id: newId,
    assessmentId,
    versionNumber,
    status: "draft",
    configJson: live?.configJson ?? { total_dim: 0, result_dim_count: 3, min_q_per_dim: 4 },
  });
  log(`versi draft BARU v${versionNumber} dibuat`);
  const createdVersion = await db.query.assessmentVersions.findFirst({
    where: eq(schema.assessmentVersions.id, newId),
  });
  if (!createdVersion) throw new Error(`gagal membuat versi draft ${code ?? ""}`.trim());
  return createdVersion;
}

// ── Dimensi ─────────────────────────────────────────────────────────────

async function ensureDimensions(db: Db, versionId: string, code: "DISCOVER" | "TALENT") {
  const existing = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, versionId),
  });
  const map: Record<string, string> = {};

  const specs =
    code === "DISCOVER"
      ? RIASEC_DIMS.map((d, i) => ({
          code: d.code,
          name: d.name,
          shortName: d.short,
          description: d.desc,
          displayOrder: i,
          durationSeconds: null as number | null,
        }))
      : TALENT_DIMS.map((c, i) => ({
          code: c,
          name: c.charAt(0).toUpperCase() + c.slice(1),
          shortName: c.slice(0, 3).toUpperCase(),
          description: `Kemampuan ${c}`,
          displayOrder: i,
          durationSeconds: 600,
        }));

  for (const s of specs) {
    const found = existing.find((d) => d.code === s.code);
    if (found) {
      map[s.code] = found.id;
      await db
        .update(schema.assessmentDimensions)
        .set({
          name: s.name,
          shortName: s.shortName,
          description: s.description,
          displayOrder: s.displayOrder,
          isActive: true,
        })
        .where(eq(schema.assessmentDimensions.id, found.id));
    } else {
      const did = id();
      map[s.code] = did;
      await db.insert(schema.assessmentDimensions).values({
        id: did,
        versionId,
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        description: s.description,
        displayOrder: s.displayOrder,
        isActive: true,
        ...(code === "TALENT" ? { durationSeconds: 600, timerScope: "dimension" as never } : {}),
      });
    }
  }
  return map;
}

// ── Soal ────────────────────────────────────────────────────────────────

async function ensureDefaultScale(db: Db) {
  const found = await db.query.answerScales.findFirst({
    where: eq(schema.answerScales.name, "Skala Bawaan (A-F, 1 poin)"),
  });
  if (found) return found.id;
  const scaleId = "defscale0a0b0c0d0e0f0010";
  await db
    .insert(schema.answerScales)
    .values({ id: scaleId, name: "Skala Bawaan (A-F, 1 poin)", description: "default" })
    .onConflictDoNothing();
  return scaleId;
}

async function insertRow(db: Db, versionId: string, dimId: string, row: TemplateRow, order: number, scaleId: string) {
  const qid = id();
  const type = row.tipe === "pilihan" ? "multiple_choice" : row.tipe === "isian" ? "text_input" : "likert";
  await db.insert(schema.questions).values({
    id: qid,
    versionId,
    dimensionId: dimId,
    scaleId: type === "multiple_choice" ? scaleId : null,
    questionCode: null,
    questionText: row.teks,
    questionType: type as never,
    presentationMode: (PRESENTATION[row.tampilan ?? "standar"] ?? "standard_option_card") as never,
    weight: row.bobot ?? 1,
    displayOrder: order,
    isActive: true,
  });

  if (type === "likert") {
    const given = row.opsi ?? [];
    const captions = given.length >= 3 ? given : LIKERT.map((l) => l.caption);
    for (const [i, caption] of captions.entries()) {
      await db.insert(schema.questionOptions).values({
        id: id(),
        questionId: qid,
        optionValue: "ABCDEF"[i] ?? String(i + 1),
        targetDimension: dimId,
        label: caption,
        icon: LIKERT[i]?.emoji ?? "•",
        imageCaption: caption,
        score: i + 1,
        displayOrder: i,
      });
    }
    return qid;
  }

  if (type === "multiple_choice") {
    const opts = (row.opsi ?? []).filter((o) => o.trim().length > 0);
    const keyIdx = Math.max(0, (row.kunci ?? "A").toUpperCase().charCodeAt(0) - 65);
    for (const [i, label] of opts.entries()) {
      await db.insert(schema.questionOptions).values({
        id: id(),
        questionId: qid,
        optionValue: String.fromCharCode(65 + i),
        targetDimension: dimId,
        label,
        score: i === keyIdx ? 1 : 0,
        displayOrder: i,
      });
    }
    return qid;
  }

  await db.insert(schema.textInputConfigs).values({
    id: id(),
    questionId: qid,
    evaluationType: (EVAL[row.caraNilai ?? "persis"] ?? "exact_match") as never,
    answerKey: row.kunciIsian ?? "",
    numericTolerance: row.caraNilai === "angka" ? (row.toleransi ?? "0.01") : null,
  });
  return qid;
}

export async function seedQuestions(
  db: Db,
  code: "DISCOVER" | "TALENT",
  versionId: string,
  opts: { replace?: boolean } = {},
  log: SeedLog = noop,
) {
  const dimMap = await ensureDimensions(db, versionId, code);
  const scaleId = await ensureDefaultScale(db);

  const existing = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, versionId),
    columns: { id: true },
  });
  if (existing.length > 0) {
    if (!opts.replace) {
      log(`${code}: versi sudah berisi ${existing.length} soal → dilewati (pakai --replace untuk menimpa DRAFT)`);
      return { inserted: 0, skipped: existing.length };
    }
    const ids = existing.map((q) => q.id);
    await db.delete(schema.questionOptions).where(inArray(schema.questionOptions.questionId, ids));
    await db.delete(schema.textInputConfigs).where(inArray(schema.textInputConfigs.questionId, ids));
    await db.delete(schema.questions).where(eq(schema.questions.versionId, versionId));
    log(`${code}: ${ids.length} soal draft lama dihapus (replace)`);
  }

  const rows: { dim: string; row: TemplateRow }[] =
    code === "DISCOVER"
      ? Object.entries(RIASEC_ITEMS).flatMap(([dim, items]) =>
          items.map(([code2, text]) => ({
            dim,
            row: {
              teks: text,
              dimensi: dim,
              tipe: "skala" as const,
              opsi: LIKERT.map((l) => l.caption),
              tampilan: "emoji",
              bobot: 1,
              _code: code2,
            } as TemplateRow,
          })),
        )
      : TALENT_ITEMS.filter((r) => r.tipe !== "skala").map((r) => ({ dim: r.dimensi, row: r }));

  let inserted = 0;
  let order = 0;
  for (const { dim, row } of rows) {
    const dimId = dimMap[dim];
    if (!dimId) continue;
    const qid = await insertRow(db, versionId, dimId, row, order, scaleId);
    // kode soal (DISCOVER: R1..C20) untuk analitik & ekspor
    const qcode = (row as unknown as { _code?: string })._code;
    if (qcode) await db.update(schema.questions).set({ questionCode: qcode }).where(eq(schema.questions.id, qid));
    order++;
    inserted++;
  }
  log(`${code}: ${inserted} soal ditanam (${Object.keys(dimMap).length} dimensi)`);
  return { inserted, skipped: 0 };
}

// ── Konfigurasi, pengantar, instruksi ───────────────────────────────────

export async function seedVersionMeta(db: Db, code: "DISCOVER" | "TALENT", versionId: string, log: SeedLog = noop) {
  const version = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, versionId) });
  if (!version) return;

  const configRows = code === "DISCOVER" ? DISCOVER_CONFIG : TALENT_CONFIG;
  const desired = Object.fromEntries(configRows.map((c) => [c.key, c.value]));
  const current = (version.configJson ?? {}) as Record<string, unknown>;
  const changed = Object.entries(desired).filter(([k, v]) => current[k] !== v);
  if (changed.length) {
    await db
      .update(schema.assessmentVersions)
      .set({ configJson: { ...current, ...desired } })
      .where(eq(schema.assessmentVersions.id, versionId));
    log(`${code}: config disesuaikan (${changed.map(([k]) => k).join(", ")})`);
  }

  const sections = await db.query.assessmentSections.findMany({
    where: eq(schema.assessmentSections.versionId, versionId),
  });
  if (sections.length === 0) {
    await db.insert(schema.assessmentSections).values(
      (code === "DISCOVER"
        ? [
            {
              title: "Apa itu Tes Minat?",
              contentType: "description",
              contentJson: {
                text: "MULAI Discover™ mengukur minatmu berbasis teori Holland (RIASEC). Tiga kode minat dominan menjadi dasar rekomendasi jurusan & karier.",
              },
            },
            {
              title: "Cara kerja",
              contentType: "bullet_list",
              contentJson: {
                items: [
                  "Jawab 120 pernyataan aktivitas",
                  "Pilih emoji sesuai seberapa suka kamu melakukannya",
                  "Langsung dapat kode minat + rekomendasi jurusan",
                ],
              },
            },
          ]
        : [
            {
              title: "Apa itu Tes Bakat?",
              contentType: "description",
              contentJson: {
                text: "MULAI Talent™ mengukur kemampuan berpikir: verbal, numerik, logika, spasial, dan ketelitian. Hasilnya dipakai untuk merekomendasikan jurusan & karier.",
              },
            },
            {
              title: "Cara mengerjakan",
              contentType: "bullet_list",
              contentJson: {
                items: [
                  "120 soal, dibagi per bagian (dimensi)",
                  "Ada soal pilihan ganda, isian singkat, dan skala",
                  "Kerjakan tanpa alat bantu; jawaban tersimpan otomatis",
                ],
              },
            },
          ]
      ).map((s, i) => ({
        id: id(),
        versionId,
        title: s.title,
        contentType: s.contentType as never,
        contentJson: s.contentJson,
        displayOrder: i,
        visibility: true,
      })) as never,
    );
    log(`${code}: pengantar ditambahkan`);
  }

  const dims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, versionId),
  });
  const existingInstr = dims.length
    ? await db.query.dimensionInstructions.findMany({
        where: inArray(
          schema.dimensionInstructions.dimensionId,
          dims.map((d) => d.id),
        ),
      })
    : [];
  if (dims.length && existingInstr.length === 0) {
    for (const d of dims) {
      await db.insert(schema.dimensionInstructions).values({
        id: id(),
        dimensionId: d.id,
        header: `Bagian ${d.name}`,
        contentType: "bullet_list",
        contentJson: {
          items:
            code === "DISCOVER"
              ? [
                  "Baca setiap pernyataan",
                  "Nilai seberapa suka kamu melakukannya",
                  "Tidak ada jawaban benar atau salah",
                ]
              : [
                  "Baca setiap soal dengan teliti",
                  "Tidak ada nilai minus untuk jawaban salah",
                  "Kerjakan secepat dan seteliti mungkin",
                ],
        },
      } as never);
    }
    log(`${code}: ${dims.length} instruksi dimensi ditambahkan`);
  }
}

/** Ringkasan isi versi (dipakai laporan & gate). */
export async function summarizeVersion(db: Db, versionId: string) {
  const questions = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, versionId),
    columns: { id: true, dimensionId: true, questionType: true, isActive: true },
  });
  const dims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, versionId),
  });
  const ids = questions.map((q) => q.id);
  const [options, texts] = await Promise.all([
    ids.length ? db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, ids) }) : [],
    ids.length ? db.query.textInputConfigs.findMany({ where: inArray(schema.textInputConfigs.questionId, ids) }) : [],
  ]);
  const perDim = dims.map((d) => ({
    code: d.code,
    total: questions.filter((q) => q.dimensionId === d.id).length,
    active: questions.filter((q) => q.dimensionId === d.id && q.isActive).length,
  }));
  const perType = ["multiple_choice", "text_input", "likert"].map((t) => ({
    type: t,
    n: questions.filter((q) => q.questionType === t).length,
  }));
  const missingKeys = questions.filter(
    (q) => q.questionType === "text_input" && !texts.some((t) => t.questionId === q.id),
  ).length;
  return {
    questions: questions.length,
    active: questions.filter((q) => q.isActive).length,
    perDim,
    perType,
    options: options.length,
    textConfigs: texts.length,
    missingTextConfigs: missingKeys,
  };
}

/**
 * Isi `study_programs.major_category_key` berdasarkan Pola Jurusan aktif.
 * Regex dijalankan sekali per prodi (15 ribu), lalu di-update per batch 2.000 baris.
 * Idempotent: hanya menulis yang berubah.
 */
export async function backfillProdiCategories(
  db: Db = defaultDb,
  log: SeedLog = noop,
): Promise<{ total: number; updated: number; unmatched: number }> {
  // Kolom bisa belum ada kalau migrasi 0045 belum dijalankan → jangan gagalkan seed.
  try {
    await db.execute(sql`select major_category_key from ${schema.studyPrograms} limit 1` as any);
  } catch {
    log("kolom major_category_key belum ada — jalankan migrasi 0045 (seed katalog tetap aman)");
    return { total: 0, updated: 0, unmatched: 0 };
  }
  const patterns = await db.query.tmbMajorPatterns.findMany({
    where: eq(schema.tmbMajorPatterns.isActive, true),
    columns: { categoryKey: true, pattern: true },
  });
  const compiled: { key: string; re: RegExp }[] = [];
  for (const p of patterns) {
    try {
      compiled.push({ key: p.categoryKey, re: new RegExp(p.pattern, "i") });
    } catch {
      log(`pola "${p.categoryKey}" tidak valid — dilewati`);
    }
  }

  const prodis = await db
    .select({
      idSms: schema.studyPrograms.idSms,
      name: schema.studyPrograms.name,
      current: schema.studyPrograms.majorCategoryKey,
    })
    .from(schema.studyPrograms)
    .where(eq(schema.studyPrograms.status, "Aktif"));

  const updates: { id: string; key: string }[] = [];
  let unmatched = 0;
  for (const p of prodis) {
    let key: string | null = null;
    for (const c of compiled) {
      if (c.re.test(p.name)) {
        key = c.key;
        break;
      }
    }
    if (!key) {
      unmatched++;
      continue;
    }
    if (p.current !== key) updates.push({ id: p.idSms, key });
  }

  const CHUNK = 2000;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    const values = slice.map((u) => `('${u.id.replace(/'/g, "''")}','${u.key.replace(/'/g, "''")}')`).join(",");
    await db.execute(
      sql`update ${schema.studyPrograms} as sp
          set major_category_key = v.key
          from (values ${sql.raw(values)}) as v(id, key)
          where sp.id_sms = v.id` as any,
    );
  }
  log(`prodi: ${updates.length} diperbarui dari ${prodis.length} (tak cocok ${unmatched})`);
  return { total: prodis.length, updated: updates.length, unmatched };
}
