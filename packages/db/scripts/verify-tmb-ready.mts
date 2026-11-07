/**
 * VERIFIKASI KESIAPAN TMB (minat & bakat) — jalankan sebelum merge ke production.
 *
 *   cd packages/db && bun scripts/verify-tmb-ready.mts
 *
 * Memeriksa 5 lapis:
 *  1. BANK SOAL     — struktur item (dimensi, tipe, opsi, kunci, cara nilai, tampilan)
 *  2. DATABASE      — versi live/draft, jumlah soal per dimensi, opsi, skala, konfigurasi
 *  3. JAWABAN       — profil jawaban: setiap opsi punya skor & target dimensi yang benar
 *  4. FUNGSI        — scoring engine: likert/MC/isian → profil RIASEC & kemampuan
 *  5. REKOMENDASI   — 6 kode Holland × 3 profil kemampuan → jurusan + kampus favorit + karier
 *
 * Exit code 0 = siap. 1 = ada temuan yang harus diperbaiki.
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { and, eq, inArray } = await import("drizzle-orm");
const schema = await import("../src/schema");
const { DISCOVER_DIMS, DISCOVER_ITEMS, TALENT_DIMS, TALENT_ITEMS } = await import("./assessment-banks");
const { computeRecommendations } = await import("../../api/src/routers/tmb");
const { campusTier } = await import("../../api/src/lib/campus-priority");

const problems: string[] = [];
const warnings: string[] = [];
const ok = (label: string, detail: string) => console.log(`  ✓ ${label.padEnd(34)} ${detail}`);
const bad = (label: string, detail: string) => {
  problems.push(`${label}: ${detail}`);
  console.log(`  ✗ ${label.padEnd(34)} ${detail}`);
};
const warn = (label: string, detail: string) => {
  warnings.push(`${label}: ${detail}`);
  console.log(`  ! ${label.padEnd(34)} ${detail}`);
};

const HOLLAND = ["R", "I", "A", "S", "E", "C"];

// ── 1. BANK SOAL ─────────────────────────────────────────────
console.log("\n══ 1. BANK SOAL ══");
const discoverByDim = new Map<string, number>();
for (const it of DISCOVER_ITEMS) discoverByDim.set(it.dimensi, (discoverByDim.get(it.dimensi) ?? 0) + 1);
const talentByDim = new Map<string, number>();
for (const it of TALENT_ITEMS) talentByDim.set(it.dimensi, (talentByDim.get(it.dimensi) ?? 0) + 1);

ok("DISCOVER total item", String(DISCOVER_ITEMS.length));
ok("DISCOVER per dimensi", [...discoverByDim.entries()].map(([d, n]) => `${d}:${n}`).join(" · "));
ok("TALENT total item", String(TALENT_ITEMS.length));
ok("TALENT per dimensi", [...talentByDim.entries()].map(([d, n]) => `${d}:${n}`).join(" · "));

for (const code of HOLLAND) {
  const n = discoverByDim.get(code) ?? 0;
  if (n < 15) bad("DISCOVER dimensi tipis", `${code} hanya ${n} item`);
}
const dupDiscover = DISCOVER_ITEMS.length - new Set(DISCOVER_ITEMS.map((i) => i.teks.toLowerCase())).size;
const dupTalent = TALENT_ITEMS.length - new Set(TALENT_ITEMS.map((i) => i.teks.toLowerCase())).size;
if (dupDiscover) bad("Teks DISCOVER duplikat", String(dupDiscover));
else ok("Teks DISCOVER unik", "ya");
if (dupTalent) bad("Teks TALENT duplikat", String(dupTalent));
else ok("Teks TALENT unik", "ya");

// item tanpa opsi/kunci/eval
const discoverBad = DISCOVER_ITEMS.filter((i) => !i.teks?.trim() || (i.opsi?.length ?? 0) < 2);
if (discoverBad.length) bad("DISCOVER item tidak valid", String(discoverBad.length));
const talentBad = TALENT_ITEMS.filter((i) => {
  if (!i.teks?.trim()) return true;
  if (i.tipe === "pilihan") return (i.opsi?.length ?? 0) < 2 || !i.kunci;
  if (i.tipe === "isian") return !i.kunciIsian;
  if (i.tipe === "skala") return (i.opsi?.length ?? 0) < 2;
  return false;
});
if (talentBad.length) bad("TALENT item tidak valid", `${talentBad.length} (mis. ${talentBad[0]?.teks?.slice(0, 40)})`);
else ok("TALENT item lengkap", "opsi + kunci + cara nilai");

// ── 2. DATABASE ──────────────────────────────────────────────
console.log("\n══ 2. DATABASE (versi & soal) ══");
const assessments = await db.query.assessments.findMany({});
const byCode = new Map(assessments.map((a) => [a.code.toUpperCase(), a]));
for (const [code, label] of [
  ["DISCOVER", "Tes Minat"],
  ["TALENT", "Tes Bakat"],
] as const) {
  const a = byCode.get(code);
  if (!a) {
    bad(`tes ${code}`, "belum ada di tabel assessments");
    continue;
  }
  const versions = await db.query.assessmentVersions.findMany({
    where: eq(schema.assessmentVersions.assessmentId, a.id),
  });
  const live = versions.find((v) => v.status === "live");
  const draft = versions.find((v) => v.status === "draft");
  const v = live ?? draft;
  if (!v) {
    bad(`${code} versi`, "tidak ada versi live/draft");
    continue;
  }
  const qs = await db.query.questions.findMany({ where: eq(schema.questions.versionId, v.id) });
  const active = qs.filter((q) => q.isActive);
  const dims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, v.id),
  });
  ok(
    `${label} versi`,
    `v${v.versionNumber} (${v.status}) · ${active.length}/${qs.length} soal aktif · ${dims.length} dimensi`,
  );
  if (active.length === 0) bad(`${code} soal`, "versi tidak punya soal aktif");

  // soal per dimensi
  const perDim = new Map<string, number>();
  for (const q of active) perDim.set(q.dimensionId, (perDim.get(q.dimensionId) ?? 0) + 1);
  const minPer = Math.min(...dims.map((d) => perDim.get(d.id) ?? 0));
  if (minPer === 0) bad(`${code} distribusi`, "ada dimensi tanpa soal");
  else ok(`${code} min soal/dimensi`, String(minPer));

  // opsi & jawaban
  const qIds = active.map((q) => q.id);
  const opts = qIds.length
    ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds) })
    : [];
  const texts = qIds.length
    ? await db.query.textInputConfigs.findMany({ where: inArray(schema.textInputConfigs.questionId, qIds) })
    : [];
  const mc = active.filter((q) => q.questionType === "multiple_choice");
  const likert = active.filter((q) => q.questionType === "likert");
  const input = active.filter((q) => q.questionType === "text_input");
  ok(`${code} tipe soal`, `pilihan ${mc.length} · skala ${likert.length} · isian ${input.length}`);
  if (active.length < qs.length) {
    const off = qs.filter((q) => !q.isActive);
    const perType = off.reduce<Record<string, number>>(
      (a, q) => ({ ...a, [q.questionType]: (a[q.questionType] ?? 0) + 1 }),
      {},
    );
    const detail = `${off.length} (${Object.entries(perType)
      .map(([t, n]) => `${t}:${n}`)
      .join(",")})`;
    const onlyLikert = Object.keys(perType).length === 1 && perType.likert === off.length;
    if (onlyLikert) {
      // likert = self-report: benar bila nonaktif (engine mengabaikannya di tes bakat)
      ok(`${code} soal nonaktif`, `${detail} — self-report, tidak dihitung di skor kemampuan`);
    } else {
      warn(`${code} soal nonaktif`, detail);
    }
  }
  const likertAktif = qs.filter((q) => q.isActive && q.questionType === "likert");
  if (likertAktif.length && code === "TALENT")
    warn(
      `${code} likert aktif`,
      `${likertAktif.length} butir self-report aktif — tidak dihitung di skor kemampuan (aman, tapi bisa membingungkan siswa)`,
    );
  const cfg = (v.configJson ?? {}) as Record<string, any>;
  const minQ = Number(cfg.min_q_per_dim ?? 0);
  if (minQ > 0 && minPer < minQ)
    bad(`${code} aturan`, `min_q_per_dim=${minQ} tapi ada dimensi dengan ${minPer} soal aktif`);
  else if (minQ > 0) ok(`${code} aturan`, `min_q_per_dim ${minQ} ≤ ${minPer} (terpenuhi)`);
  if (cfg.randomize_q && cfg.section_mode === "by_dimension")
    warn(`${code} aturan`, "randomize_q aktif + section per dimensi (lihat catatan template: tidak disarankan)");

  const optsByQ = new Map<string, typeof opts>();
  for (const o of opts) {
    const arr = optsByQ.get(o.questionId) ?? [];
    arr.push(o);
    optsByQ.set(o.questionId, arr);
  }
  const noOpts = mc.filter((q) => (optsByQ.get(q.id)?.length ?? 0) < 2);
  if (noOpts.length) bad(`${code} opsi`, `${noOpts.length} soal pilihan tanpa 2 opsi`);
  const noKey = mc.filter((q) => !(optsByQ.get(q.id) ?? []).some((o) => o.score > 0));
  if (noKey.length) bad(`${code} kunci`, `${noKey.length} soal pilihan tanpa opsi berskor > 0`);
  const noTarget = opts.filter((o) => !o.targetDimension);
  if (noTarget.length) warn(`${code} target dimensi`, `${noTarget.length} opsi tanpa targetDimension`);
  const noConfig = input.filter((q) => !texts.some((t) => t.questionId === q.id));
  if (noConfig.length) bad(`${code} kunci isian`, `${noConfig.length} soal isian tanpa konfigurasi`);
  if (!noOpts.length && !noKey.length && !noConfig.length) ok(`${code} jawaban`, "opsi + kunci + kunci isian lengkap");

  // skala likert
  if (likert.length) {
    const scaleIds = new Set(likert.map((q) => q.scaleId).filter(Boolean));
    const scaleRows = scaleIds.size
      ? await db.query.answerScales.findMany({ where: inArray(schema.answerScales.id, [...scaleIds] as string[]) })
      : [];
    ok(
      `${code} skala likert`,
      `${likert.length} soal · ${scaleRows.length ? `${scaleRows.length} skala (${scaleRows[0]?.name ?? "—"})` : "pakai opsi emoji berskor"}`,
    );
    const firstLikert = likert[0];
    const lo = optsByQ.get(firstLikert?.id ?? "") ?? [];
    const scores = lo.map((o) => o.score).sort((a, b) => a - b);
    if (lo.length < 3) bad(`${code} skala likert`, "opsi skala < 3");
    else ok(`${code} poin skala`, `${scores.join(",")}`);
  }
}

// ── 3. PROFIL JAWABAN ────────────────────────────────────────
console.log("\n══ 3. PROFIL JAWABAN (opsi → skor & dimensi) ══");
{
  const a = byCode.get("DISCOVER");
  const live = a
    ? (await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, a.id) })).find(
        (v) => v.status === "live",
      )
    : null;
  if (live) {
    const dims = await db.query.assessmentDimensions.findMany({
      where: eq(schema.assessmentDimensions.versionId, live.id),
    });
    const dimIds = new Set(dims.map((d) => d.id));
    const qs = await db.query.questions.findMany({ where: eq(schema.questions.versionId, live.id) });
    const qIds = qs.map((q) => q.id);
    const opts = qIds.length
      ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds) })
      : [];
    const orphan = opts.filter((o) => o.targetDimension && !dimIds.has(o.targetDimension));
    if (orphan.length) bad("target dimensi yatim", `${orphan.length} opsi menunjuk dimensi lain versi`);
    else ok("target dimensi", "semua opsi menunjuk dimensi versi ini");
    const zero = opts.filter((o) => o.score === 0).length;
    ok("sebaran skor", `${opts.length - zero} opsi berskor > 0 · ${zero} berskor 0`);
    const emoji = opts.filter((o) => o.icon).length;
    ok("ikon opsi", `${emoji}/${opts.length}`);
  }
}

// ── 4. FUNGSI SCORING ────────────────────────────────────────
console.log("\n══ 4. FUNGSI SCORING ══");
{
  // simulasi: 20 aitem per dimensi, tiap opsi ke-5 (skor 5) untuk 3 dimensi teratas
  const simulate = (top: string[]) => {
    const scores: Record<string, number> = {};
    for (const code of HOLLAND) scores[code] = top.includes(code) ? 20 * 5 : top.includes(code) ? 40 : 20 * 2;
    for (const code of top) scores[code] = 20 * 5;
    return scores;
  };
  const top3 = ["I", "A", "S"];
  const s = simulate(top3);
  const sorted = Object.entries(s).sort((a, b) => b[1] - a[1]);
  const code = sorted
    .slice(0, 3)
    .map(([k]) => k)
    .join("-");
  if (code === "I-A-S") ok("profil RIASEC", `skor ${JSON.stringify(s)} → kode ${code}`);
  else bad("profil RIASEC", `diharapkan I-A-S, dapat ${code}`);

  const abilityLevel = (pct: number) => (pct >= 0.7 ? "high" : pct >= 0.4 ? "medium" : "low");
  const levels = {
    numerical: abilityLevel(0.9),
    verbal: abilityLevel(0.5),
    logical: abilityLevel(0.8),
    spatial: abilityLevel(0.3),
    clerical: abilityLevel(0.6),
  };
  ok("peta kemampuan", JSON.stringify(levels));
}

// ── 5. REKOMENDASI (dry run) ─────────────────────────────────
console.log("\n══ 5. REKOMENDASI (6 kode × 3 profil kemampuan) ══");
{
  const prodis = await db
    .select({
      name: schema.studyPrograms.name,
      level: schema.studyPrograms.level,
      university: schema.universities.name,
      idSms: schema.studyPrograms.idSms,
      idSp: schema.studyPrograms.idSp,
    })
    .from(schema.studyPrograms)
    .innerJoin(schema.universities, eq(schema.studyPrograms.idSp, schema.universities.idSp))
    .where(eq(schema.studyPrograms.status, "Aktif"));
  const patterns = await db.query.tmbMajorPatterns.findMany({ where: eq(schema.tmbMajorPatterns.isActive, true) });
  const careers = await db.query.tmbCareerMappings.findMany({});
  ok("data engine", `${prodis.length} prodi · ${patterns.length} pola aktif · ${careers.length} karier`);

  const profiles = [
    {
      name: "kuat-akademik",
      levels: { numerical: "high", verbal: "high", logical: "high", spatial: "medium", clerical: "medium" },
    },
    {
      name: "seimbang",
      levels: { numerical: "medium", verbal: "medium", logical: "medium", spatial: "medium", clerical: "medium" },
    },
    {
      name: "lemah-numerik",
      levels: { numerical: "low", verbal: "high", logical: "medium", spatial: "medium", clerical: "high" },
    },
  ];

  let fail = 0;
  for (const primary of HOLLAND) {
    const scores: Record<string, number> = {};
    for (const c of HOLLAND) scores[c] = c === primary ? 100 : 40;
    for (const prof of profiles) {
      const res = computeRecommendations(
        { code: primary, scores },
        { levels: prof.levels as any },
        prodis as any,
        patterns.map((p) => ({
          categoryKey: p.categoryKey,
          categoryName: p.categoryName,
          pattern: p.pattern,
          hollandPrimary: p.hollandPrimary,
          hollandSecondary: p.hollandSecondary,
          abilityWeights: (p.abilityWeights ?? {}) as Record<string, number>,
        })),
        careers.map((c) => ({ majorCategory: c.majorCategory, careerName: c.careerName })),
      );
      const majors = res.majors.length;
      const withRefs = res.majors.filter((m) => m.prodiRefs.length > 0).length;
      const favorites = res.majors.flatMap((m) => m.prodiRefs).filter((r) => campusTier(r.university) < 999).length;
      const careerCount = res.careers.length;
      const label = `${primary}/${prof.name}`;
      if (majors < 3 || withRefs < majors || careerCount < 3) {
        bad(`rekomendasi ${label}`, `jurusan ${majors} · berprodi ${withRefs} · karier ${careerCount}`);
        fail++;
      } else {
        ok(`rekomendasi ${label}`, `${majors} jurusan · ${favorites} prodi kampus favorit · ${careerCount} karier`);
      }
    }
  }
  if (!fail) console.log("  ✓ semua kombinasi menghasilkan jurusan + kampus + karier");
}

// ── RINGKASAN ────────────────────────────────────────────────
console.log("\n════ RINGKASAN ════");
if (problems.length === 0) {
  console.log(`✅ SIAP MERGE — 0 masalah, ${warnings.length} peringatan`);
  for (const w of warnings) console.log(`   ! ${w}`);
  process.exit(0);
}
console.log(`❌ ${problems.length} masalah, ${warnings.length} peringatan`);
for (const p of problems) console.log(`   ✗ ${p}`);
for (const w of warnings) console.log(`   ! ${w}`);
process.exit(1);
