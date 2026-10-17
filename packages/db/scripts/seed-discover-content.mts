/** Fase 1 — tambahkan Intro sections & Dimension instructions utk DISCOVER (live v1, idempotent). */
import { db, eq, schema } from "@mulai-plus/db";
const id = (n = 24) => "c" + Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "DISCOVER") });
const v = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.assessmentId, a!.id) });
let sec = 0, ins = 0;
const withId = (rows: any[]) => rows.map((r) => ({ id: r.id, ...r }));
const sections = await db.query.assessmentSections.findMany({ where: eq(schema.assessmentSections.versionId, v!.id) });
if (sections.length === 0) {
  await db.insert(schema.assessmentSections).values(withId([
    { id: id(), versionId: v!.id, title: "Apa itu Tes Minat?", contentType: "description", contentJson: { text: "MULAI Discover™ mengukur minat kamu berbasis teori Holland (RIASEC). Hasilnya — 3 kode minat dominan — jadi dasar rekomendasi jurusan & karier." }, displayOrder: 0, visibility: true },
    { id: id(), versionId: v!.id, title: "Cara kerja", contentType: "bullet_list", contentJson: { items: ["Jawab ~3 menit tanpa tekanan waktu", "Pilih yang paling mendekati dirimu", "Langsung dapat kode minat (S-I-A) + rekomendasi jurusan"] }, displayOrder: 1, visibility: true },
  ] as any));
  sec = 2;
}
const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, v!.id) });
const haveIns = await db.query.dimensionInstructions.findMany({ where: eq(schema.dimensionInstructions.dimensionId, dims[0]?.id ?? "_") });
if (dims.length && haveIns.length === 0) {
  for (const d of dims) {
    await db.insert(schema.dimensionInstructions).values({ id: id(), dimensionId: d.id, header: `Bagian ${d.name}`, contentType: "bullet_list", contentJson: { items: ["Baca pernyataan lalu pilih opsi yang paling sesuai", "Tidak ada jawaban benar/salah", "Jawab sejujur mungkin"] } });
    ins++;
  }
}
console.log(`✅ DISCOVER content: sections=${sec}, instructions=${ins}`);
process.exit(0);
