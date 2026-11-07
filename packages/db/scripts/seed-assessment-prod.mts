/**
 * SEEDER PRODUKSI TMB — bank soal (DISCOVER minat + TALENT bakat) + katalog jurusan & karier.
 *
 * Dijalankan SETELAH merge staging → production, sekali jalan, idempotent.
 *
 *   cd packages/db
 *   bun --env-file=../../apps/server/.env scripts/seed-assessment-prod.mts --dry     # lihat rencana
 *   bun --env-file=../../apps/server/.env scripts/seed-assessment-prod.mts --yes     # eksekusi
 *
 * Opsi:
 *   --dry                  hanya menampilkan rencana (tidak menulis apa pun)
 *   --yes                  wajib bila DATABASE_URL bukan localhost (pengaman produksi)
 *   --code=DISCOVER,TALENT pilih tes (default keduanya)
 *   --replace              timpa isi DRAFT (soal lama di draft dihapus dulu). Versi LIVE tidak pernah disentuh.
 *   --catalog-only         hanya jurusan/karier
 *   --questions-only       hanya bank soal (skip katalog)
 *   --publish              promosikan draft yang selesai menjadi LIVE (versi live lama → archived)
 *                          butuh --yes; hanya untuk draft yang lolos ringkasan (tanpa soal isian tanpa kunci)
 *   --new-version          buat draft baru (v berikutnya) meski sudah ada draft
 *   --self-test            uji mesin seed di assessment sementara (dibuat & dihapus lagi)
 *
 * Keamanan:
 *   - Tidak pernah menulis ke versi berstatus `live` (selalu draft).
 *   - `--publish` memverifikasi kelengkapan dulu (opsi + kunci + text_input_configs).
 *   - Gagal cepat (exit 1) kalau ada masalah; ringkasan ditulis di akhir.
 */
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: "../../apps/server/.env" });

const args = new Set(process.argv.slice(2));
const has = (f: string) => args.has(f);
const argValue = (prefix: string) => [...args].find((a) => a.startsWith(`${prefix}=`))?.split("=")[1] ?? undefined;

const DRY = has("--dry");
const YES = has("--yes");
const REPLACE = has("--replace");
const PUBLISH = has("--publish");
const NEW_VERSION = has("--new-version");
const SELF_TEST = has("--self-test");
const CATALOG_ONLY = has("--catalog-only");
const QUESTIONS_ONLY = has("--questions-only");
const codes = (argValue("--code") ?? "DISCOVER,TALENT")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter((c): c is "DISCOVER" | "TALENT" => c === "DISCOVER" || c === "TALENT");

const dbUrl = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(dbUrl);
const dbHost = (() => {
  try {
    return new URL(dbUrl).host;
  } catch {
    return "(tidak terbaca)";
  }
})();

const log = (m: string) => console.log(m);

function head(t: string) {
  console.log(`\n── ${t} ──`);
}

/** Uji end-to-end mesin seed tanpa menyentuh tes asli (assessment sementara, lalu dihapus). */
async function selfTest(db: any, seed: any, schema: any, eqFn: any) {
  const CODE = "SELFTEST_SEED";
  const existing = await db.query.assessments.findFirst({ where: eqFn(schema.assessments.code, CODE) });
  if (existing) await db.delete(schema.assessments).where(eqFn(schema.assessments.id, existing.id));

  const idNew = `selftest-${Date.now().toString(36)}`;
  await db.insert(schema.assessments).values({
    id: idNew,
    code: CODE,
    name: "Self Test",
    family: "minat",
    description: "sementara",
  });
  const version = await seed.ensureDraftVersion(db, idNew, {}, () => {});
  const res = await seed.seedQuestions(db, "DISCOVER", version.id, { replace: true }, () => {});
  await seed.seedVersionMeta(db, "DISCOVER", version.id, () => {});
  const summary = await seed.summarizeVersion(db, version.id);

  const problems: string[] = [];
  if (res.inserted !== 120) problems.push(`soal=${res.inserted} (harus 120)`);
  if (summary.perDim.length !== 6) problems.push(`dimensi=${summary.perDim.length} (harus 6)`);
  if (summary.perDim.some((d: any) => d.total !== 20)) problems.push("distribusi dimensi bukan 20/20");
  if (summary.perType.find((t: any) => t.type === "likert")?.n !== 120) problems.push("tipe likert bukan 120");
  const cfg = (await db.query.assessmentVersions.findFirst({ where: eqFn(schema.assessmentVersions.id, version.id) }))
    ?.configJson as Record<string, unknown>;
  if (Number(cfg?.total_dim) !== 6) problems.push(`config total_dim=${cfg?.total_dim}`);

  await db.delete(schema.assessments).where(eqFn(schema.assessments.id, idNew));

  // ── TALENT (pilihan ganda + isian + kunci isian) pada assessment sementara ──
  const CODE2 = "SELFTEST_TALENT";
  const existing2 = await db.query.assessments.findFirst({ where: eqFn(schema.assessments.code, CODE2) });
  if (existing2) await db.delete(schema.assessments).where(eqFn(schema.assessments.id, existing2.id));
  const idNew2 = `selftest-t-${Date.now().toString(36)}`;
  await db.insert(schema.assessments).values({
    id: idNew2,
    code: CODE2,
    name: "Self Test Bakat",
    family: "bakat",
    description: "sementara",
  });
  const version2 = await seed.ensureDraftVersion(db, idNew2, {}, () => {});
  const res2 = await seed.seedQuestions(db, "TALENT", version2.id, { replace: true }, () => {});
  await seed.seedVersionMeta(db, "TALENT", version2.id, () => {});
  const summary2 = await seed.summarizeVersion(db, version2.id);

  if (res2.inserted !== 100) problems.push(`talent soal=${res2.inserted} (harus 100)`);
  if (summary2.perDim.length !== 5) problems.push(`talent dimensi=${summary2.perDim.length} (harus 5)`);
  if (summary2.perType.find((t: any) => t.type === "multiple_choice")?.n !== 60)
    problems.push("talent pilihan ganda bukan 60");
  if (summary2.perType.find((t: any) => t.type === "text_input")?.n !== 40) problems.push("talent isian bukan 40");
  if (summary2.textConfigs !== 40) problems.push(`talent kunci isian=${summary2.textConfigs} (harus 40)`);
  if (summary2.missingTextConfigs !== 0) problems.push(`talent ${summary2.missingTextConfigs} isian tanpa kunci`);

  // bersihkan (cascade ke versi/dimensi/soal/opsi/config)
  await db.delete(schema.assessments).where(eqFn(schema.assessments.id, idNew2));

  if (problems.length) {
    console.log("✗ SELF-TEST GAGAL:", problems.join(" · "));
    process.exit(1);
  }
  console.log(
    "✅ SELF-TEST LULUS · DISCOVER: 120 soal (6×20, likert) · TALENT: 100 soal (60 PG + 40 isian, 40 kunci) · config total_dim benar · data uji dihapus lagi",
  );
}

async function main() {
  console.log("=== SEED PRODUKSI TMB ===");
  console.log(`target DB : ${dbHost}${isLocal ? " (lokal)" : " (NON-LOKAL)"}`);
  console.log(
    `mode      : ${DRY ? "DRY RUN" : "WRITE"}${REPLACE ? " · replace draft" : ""}${PUBLISH ? " · publish" : ""}`,
  );
  console.log(`tes       : ${CATALOG_ONLY ? "(katalog saja)" : codes.join(", ")}`);

  if (!dbUrl) {
    console.error("✗ DATABASE_URL kosong. Jalankan dengan --env-file=../../apps/server/.env");
    process.exit(1);
  }
  if (!isLocal && !YES && !DRY) {
    console.error(
      "\n✗ Ini database NON-LOKAL. Tambahkan --yes kalau benar-benar ingin menulis ke produksi.\n" +
        "  Saran: jalankan --dry dulu untuk melihat rencana.",
    );
    process.exit(1);
  }
  if (PUBLISH && !YES) {
    console.error("✗ --publish butuh --yes (merilis versi baru ke siswa).");
    process.exit(1);
  }

  const { db } = await import("../src");
  const schema = await import("../src/schema");
  const seed = await import("./lib/assessment-seed");

  if (SELF_TEST) {
    const schema = await import("../src/schema");
    await selfTest(db, seed, schema, eq);
    return;
  }

  // ── 1) Katalog jurusan & karier ───────────────────────────────────────
  if (!QUESTIONS_ONLY) {
    head("Katalog jurusan & karier");
    if (DRY) {
      const { MAJOR_PATTERNS, CAREER_PROFILES } = await import("../../api/src/lib/assessment-catalog");
      const careers = Object.values(CAREER_PROFILES).reduce((a, b) => a + b.length, 0);
      log(`(dry) akan upsert ${MAJOR_PATTERNS.length} pola jurusan + ${careers} karier`);
    } else {
      await seed.seedCatalog(db, log);
    }
  }

  if (CATALOG_ONLY) {
    console.log("\n(dry run selesai)" && "selesai (katalog saja)");
    return;
  }

  // ── 2) Bank soal per tes ──────────────────────────────────────────────
  const report: Record<string, Awaited<ReturnType<typeof seed.summarizeVersion>> | null> = {};

  for (const code of codes) {
    head(`Tes ${code}`);
    if (DRY) {
      log(`(dry) akan memastikan assessment + versi draft, lalu menanam bank soal ${code}`);
      continue;
    }

    const assessment = await seed.ensureAssessment(db, code, log);
    const version = await seed.ensureDraftVersion(db, assessment.id, { fresh: NEW_VERSION }, log);

    if (version.status === "live") {
      console.error(`✗ versi target ${code} v${version.versionNumber} berstatus LIVE — batal (tidak menulis ke live).`);
      process.exit(1);
    }

    await seed.seedQuestions(db, code, version.id, { replace: REPLACE }, log);
    await seed.seedVersionMeta(db, code, version.id, log);

    const summary = await seed.summarizeVersion(db, version.id);
    report[`${code} v${version.versionNumber} (${version.status})`] = summary;
  }

  // ── 3) Ringkasan + gate ───────────────────────────────────────────────
  if (Object.keys(report).length) {
    head("Ringkasan");
    let problems = 0;
    for (const [label, s] of Object.entries(report)) {
      if (!s) continue;
      const dims = s.perDim.map((d) => `${d.code}=${d.total}`).join(" ");
      const types = s.perType.map((t) => `${t.type}=${t.n}`).join(" ");
      console.log(`${label}`);
      console.log(`  soal ${s.questions} (aktif ${s.active}) · opsi ${s.options} · kunci isian ${s.textConfigs}`);
      console.log(`  dimensi: ${dims}`);
      console.log(`  tipe:    ${types}`);
      if (s.questions === 0) {
        problems++;
        console.log("  ✗ TIDAK ADA SOAL");
      }
      if (s.missingTextConfigs > 0) {
        problems++;
        console.log(`  ✗ ${s.missingTextConfigs} soal isian tanpa kunci`);
      }
      const emptyDim = s.perDim.filter((d) => d.total === 0);
      if (emptyDim.length) {
        problems++;
        console.log(`  ✗ dimensi tanpa soal: ${emptyDim.map((d) => d.code).join(",")}`);
      }
    }

    if (problems) {
      console.log(`\n❌ ${problems} masalah — periksa sebelum publish.`);
      process.exit(1);
    }
    console.log("\n✅ Bank soal lengkap.");

    // ── 4) Publish (opsional) ───────────────────────────────────────────
    if (PUBLISH) {
      const { assessmentVersions } = await import("../src/schema");
      head("Publish");
      for (const code of codes) {
        const assessment = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, code) });
        if (!assessment) continue;
        const versions = await db.query.assessmentVersions.findMany({
          where: eq(assessmentVersions.assessmentId, assessment.id),
        });
        const draft = versions.filter((v) => v.status === "draft").sort((a, b) => b.versionNumber - a.versionNumber)[0];
        if (!draft) {
          console.log(`${code}: tidak ada draft untuk dipublish`);
          continue;
        }
        await db
          .update(assessmentVersions)
          .set({ status: "archived" })
          .where(eq(assessmentVersions.assessmentId, assessment.id));
        await db
          .update(assessmentVersions)
          .set({ status: "live", publishedAt: new Date() })
          .where(eq(assessmentVersions.id, draft.id));
        console.log(`🚀 ${code} v${draft.versionNumber} sekarang LIVE`);
      }
    }
  }

  console.log("\nSelesai. Jalankan `bun scripts/verify-tmb-ready.mts` untuk gate kesiapan.");
}

main().catch((e) => {
  console.error("SEED GAGAL:", e);
  process.exit(1);
});
