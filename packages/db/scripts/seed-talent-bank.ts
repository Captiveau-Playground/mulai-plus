/**
 * Seeder bank item TALENT (Tes Bakat) — 120 soal dari `assessment-banks.ts`.
 *
 * Tipe soal dicampur (pilihan ganda, isian dengan 4 mode penilaian, dan skala emoji)
 * supaya semua mode jawaban benar-benar terpakai di satu tes.
 *
 * Pemakaian (dari folder packages/db):
 *   bun --env-file=../../apps/server/.env scripts/seed-talent-bank.ts
 *   bun --env-file=../../apps/server/.env scripts/seed-talent-bank.ts --force --publish
 *
 * Idempotent: kalau versi target sudah punya soal, berhenti (kecuali --force).
 */
import { db, desc, eq, schema } from "@mulai-plus/db";
import { TALENT_CONFIG, TALENT_DIMS, TALENT_ITEMS, type TemplateRow } from "./assessment-banks";
import { nanoidish } from "./lib-id";

const id = () => nanoidish();

const EMOJI = ["😡", "🙁", "😐", "🙂", "😍"];

const PRESENTATION: Record<string, string> = {
  standar: "standard_option_card",
  emoji: "emoji_option",
  gambar: "image_option",
  banding: "visual_comparison",
};

const EVAL: Record<string, string> = {
  persis: "exact_match",
  angka: "numeric_tolerance",
  kata: "keyword_match",
  pola: "pattern_match",
};

async function main() {
  const force = process.argv.includes("--force");
  const publish = process.argv.includes("--publish");

  const assess = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "TALENT") });
  if (!assess) throw new Error("Assessment TALENT tidak ditemukan.");

  const versions = await db.query.assessmentVersions.findMany({
    where: eq(schema.assessmentVersions.assessmentId, assess.id),
    orderBy: (t) => [desc(t.versionNumber)],
  });
  const target = versions.find((v) => v.status === "draft") ?? versions[0];
  if (!target) throw new Error("TALENT belum punya versi.");
  console.log(`Target: TALENT v${target.versionNumber} (${target.status})`);

  const existing = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, target.id),
    columns: { id: true },
  });
  let skipSeed = false;
  if (existing.length > 0 && !force) {
    console.log(`⏭ Versi ini sudah punya ${existing.length} soal — seed dilewati (pakai --force untuk menimpa).`);
    skipSeed = true;
  }
  if (existing.length > 0 && force) {
    for (const q of existing)
      await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
    for (const q of existing)
      await db.delete(schema.textInputConfigs).where(eq(schema.textInputConfigs.questionId, q.id));
    await db.delete(schema.questions).where(eq(schema.questions.versionId, target.id));
    console.log(`🗑  ${existing.length} soal lama dihapus.`);
  }

  // Dimensi (kode HARUS tetap sama — dipakai Pola Jurusan)
  const existingDims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, target.id),
  });
  const dimId: Record<string, string> = {};
  for (const [i, code] of TALENT_DIMS.entries()) {
    const found = existingDims.find((d) => d.code === code);
    if (found) {
      dimId[code] = found.id;
      await db
        .update(schema.assessmentDimensions)
        .set({ displayOrder: i, isActive: true })
        .where(eq(schema.assessmentDimensions.id, found.id));
    } else {
      const did = id();
      dimId[code] = did;
      await db.insert(schema.assessmentDimensions).values({
        id: did,
        versionId: target.id,
        code,
        name: code.charAt(0).toUpperCase() + code.slice(1),
        shortName: code.slice(0, 3).toUpperCase(),
        displayOrder: i,
        isActive: true,
      });
    }
  }

  // Skala bawaan untuk pilihan ganda
  let scaleId =
    (await db.query.answerScales.findFirst({ where: eq(schema.answerScales.name, "Skala Bawaan (A-F, 1 poin)") }))
      ?.id ?? null;
  if (!scaleId) {
    scaleId = "defscale0a0b0c0d0e0f0010";
    await db
      .insert(schema.answerScales)
      .values({ id: scaleId, name: "Skala Bawaan (A-F, 1 poin)", description: "default" })
      .onConflictDoNothing();
  }

  let inserted = 0;
  let order = 0;
  for (const code of TALENT_DIMS) {
    const rows = (TALENT_ITEMS as TemplateRow[]).filter((r) => r.dimensi === code);
    for (const r of rows) {
      const qid = id();
      const type = r.tipe === "pilihan" ? "multiple_choice" : r.tipe === "isian" ? "text_input" : "likert";
      await db.insert(schema.questions).values({
        id: qid,
        versionId: target.id,
        dimensionId: dimId[code]!,
        scaleId: type === "multiple_choice" ? scaleId : null,
        questionCode: `${code.slice(0, 3).toUpperCase()}-${String(order + 1).padStart(3, "0")}`,
        questionText: r.teks,
        questionType: type as never,
        presentationMode: (PRESENTATION[r.tampilan ?? "standar"] ?? "standard_option_card") as never,
        weight: r.bobot ?? 1,
        displayOrder: order++,
        isActive: true,
      });

      if (type === "pilihan") {
        const opts = r.opsi ?? [];
        const keyIdx = r.kunci ? r.kunci.toUpperCase().charCodeAt(0) - 65 : 0;
        for (let oi = 0; oi < opts.length; oi++) {
          await db.insert(schema.questionOptions).values({
            id: id(),
            questionId: qid,
            optionValue: String.fromCharCode(65 + oi),
            targetDimension: dimId[code]!,
            label: opts[oi]!,
            score: oi === keyIdx ? 1 : 0,
            displayOrder: oi,
          });
        }
      } else if (type === "skala") {
        const levels = r.opsi ?? [];
        for (const [oi, caption] of levels.entries()) {
          await db.insert(schema.questionOptions).values({
            id: id(),
            questionId: qid,
            optionValue: String.fromCharCode(65 + oi),
            targetDimension: dimId[code]!,
            label: caption,
            icon: EMOJI[oi] ?? "•",
            imageCaption: caption,
            score: oi + 1,
            displayOrder: oi,
          });
        }
      } else {
        const ev = EVAL[r.caraNilai ?? "persis"] ?? "exact_match";
        await db.insert(schema.textInputConfigs).values({
          id: id(),
          questionId: qid,
          evaluationType: ev as never,
          answerKey: r.kunciIsian ?? "",
          numericTolerance: ev === "numeric_tolerance" ? (r.toleransi ?? "0.01") : null,
        });
      }
      inserted++;
    }
  }
  if (!skipSeed) console.log(`✅ ${inserted} soal TALENT ditambahkan (pilihan/isian/skala).`);

  // Konfigurasi versi sesuai bank
  const desired = Object.fromEntries(TALENT_CONFIG.map((c) => [c.key, c.value]));
  const current = (target.configJson ?? {}) as Record<string, unknown>;
  const changed = Object.entries(desired).filter(([k, v]) => current[k] !== v);
  if (changed.length) {
    await db
      .update(schema.assessmentVersions)
      .set({ configJson: { ...current, ...desired } })
      .where(eq(schema.assessmentVersions.id, target.id));
    console.log(`⚙️  config disesuaikan: ${changed.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}`);
  }

  // Pengantar + instruksi per dimensi
  const sections = await db.query.assessmentSections.findMany({
    where: eq(schema.assessmentSections.versionId, target.id),
  });
  if (sections.length === 0 && !skipSeed) {
    await db.insert(schema.assessmentSections).values([
      {
        id: id(),
        versionId: target.id,
        title: "Apa itu Tes Bakat?",
        contentType: "description",
        contentJson: {
          text: "MULAI Talent™ mengukur kemampuan berpikir: verbal, numerik, logika, spasial, dan ketelitian. Hasilnya dipakai untuk merekomendasikan jurusan & karier.",
        },
        displayOrder: 0,
        visibility: true,
      },
      {
        id: id(),
        versionId: target.id,
        title: "Cara mengerjakan",
        contentType: "bullet_list",
        contentJson: {
          items: [
            "120 soal, dibagi per bagian (dimensi)",
            "Ada soal pilihan ganda, isian singkat, dan skala",
            "Kerjakan tanpa alat bantu; jawaban tersimpan otomatis",
          ],
        },
        displayOrder: 1,
        visibility: true,
      },
    ] as never);
    console.log("✅ 2 pengantar ditambahkan.");
  }
  const ins = await db.query.dimensionInstructions.findMany({
    where: eq(schema.dimensionInstructions.dimensionId, dimId[TALENT_DIMS[0]!]!),
  });
  if (ins.length === 0) {
    for (const code of TALENT_DIMS) {
      await db.insert(schema.dimensionInstructions).values({
        id: id(),
        dimensionId: dimId[code]!,
        header: `Bagian ${code.charAt(0).toUpperCase() + code.slice(1)}`,
        contentType: "bullet_list",
        contentJson: {
          items: [
            "Baca setiap soal dengan teliti",
            "Tidak ada nilai minus untuk jawaban salah",
            "Kerjakan secepat dan seteliti mungkin",
          ],
        },
      } as never);
    }
    console.log("✅ 5 instruksi dimensi ditambahkan.");
  }

  // Ringkasan kelayakan
  const qs = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, target.id),
    columns: { id: true, dimensionId: true, questionType: true },
  });
  const perDim = TALENT_DIMS.map((c) => `${c}=${qs.filter((q) => q.dimensionId === dimId[c]).length}`).join(" ");
  const perType = ["multiple_choice", "text_input", "likert"]
    .map((t) => `${t}=${qs.filter((q) => q.questionType === t).length}`)
    .join(" ");
  console.log(`\nRingkasan: ${qs.length} soal · ${perDim}\n           ${perType}`);

  if (publish) {
    await db
      .update(schema.assessmentVersions)
      .set({ status: "archived" })
      .where(eq(schema.assessmentVersions.assessmentId, assess.id));
    await db
      .update(schema.assessmentVersions)
      .set({ status: "live", publishedAt: new Date() })
      .where(eq(schema.assessmentVersions.id, target.id));
    console.log(`🚀 TALENT v${target.versionNumber} sekarang LIVE.`);
  } else {
    console.log("\nBelum dirilis (tambah --publish).");
  }
}

if (import.meta.main) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("gagal:", e?.message ?? e);
      process.exit(1);
    });
}
