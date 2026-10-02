import { db, eq, and, inArray } from "@mulai-plus/db/db";
import { schema } from "@mulai-plus/db/db";

/**
 * Publish & Gatekeeper untuk Assessment Engine (Fase 0).
 * Dipisah dari router agar bisa diuji langsung (tanpa auth/atakan orpc).
 */

/** Gatekeeper v1 — daftar error actionable; publish ditolak bila ada error. */
export async function validatePublish(versionId: string): Promise<{ ok: boolean; errors: string[]; details?: { kind: "question" | "dimension" | "config"; id?: string; message: string }[] }> {
  const errors: string[] = [];
  const details: { kind: "question" | "dimension" | "config"; id?: string; message: string }[] = [];
  const v = await db.query.assessmentVersions.findFirst({
    where: eq(schema.assessmentVersions.id, versionId),
  });
  if (!v) return { ok: false, errors: ["version_not_found"] };
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, v.assessmentId) });
  if (!a || !a.name || !a.code) { errors.push("Assessment wajib punya nama & kode."); details.push({ kind: "config", message: "Assessment wajib punya nama & kode." }); }
  const cfg = (v.configJson ?? {}) as any;
  const totalDim = Number(cfg.total_dim ?? 0);
  const resultCount = Number(cfg.result_dim_count ?? 0);
  const minQ = Number(cfg.min_q_per_dim ?? 0);
  if (!totalDim) errors.push("total_dim tidak valid.");
  if (!resultCount || resultCount > totalDim) errors.push(`result_dim_count (${resultCount}) harus ≤ total_dim (${totalDim}).`);

  const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, versionId) });
  const activeDims = dims.filter((d) => d.isActive);
  if (activeDims.length !== totalDim)
    errors.push(`Dimensi aktif (${activeDims.length}) harus sesuai total_dim (${totalDim}).`);

  const questions = await db.query.questions.findMany({ where: eq(schema.questions.versionId, versionId) });
  const activeQs = questions.filter((q) => q.isActive);
  const qIds = activeQs.map((q) => q.id);
  const opts = qIds.length
    ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds) })
    : [];
  const orderSeen = new Set<string>();
  for (const q of activeQs) {
    if (!q.dimensionId) { errors.push(`Soal ${q.questionCode ?? q.id} belum punya dimensi.`); details.push({ kind: "question", id: q.id, message: `Soal ${q.questionCode ?? q.id} belum punya dimensi.` }); }
    if (!q.scaleId && q.questionType === "multiple_choice") { errors.push(`Soal ${q.questionCode ?? q.id} belum punya answer scale.`); details.push({ kind: "question", id: q.id, message: `Soal ${q.questionCode ?? q.id} belum punya answer scale.` }); }
    const o = opts.filter((x) => x.questionId === q.id);
    if (q.questionType === "multiple_choice" && o.length < 2) { errors.push(`Soal "${q.questionCode ?? q.id}" butuh minimal 2 opsi aktif (kini ${o.length}).`); details.push({ kind: "question", id: q.id, message: `Soal "${q.questionCode ?? q.id}" butuh minimal 2 opsi aktif (kini ${o.length}).` }); }
    if (q.questionType !== "text_input")
      for (const oo of o) if (!oo.label) errors.push(`Opsi pada soal ${q.questionCode ?? q.id} harus punya label.`);
    const key = `${q.dimensionId}:${q.displayOrder}`;
    if (orderSeen.has(key)) { errors.push(`Soal "${q.questionCode ?? q.id}" punya nomor urut sama dgn soal lain dalam dimensi — rapikan urutan pakai tombol ↑↓ / drag.`); details.push({ kind: "question", id: q.id, message: `Nomor urut soal "${q.questionCode ?? q.id}" bertabrakan dengan soal lain — rapikan urutan.` }); }
    orderSeen.add(key);
  }
  if (minQ > 0) {
    const perDim = new Map<string, number>();
    for (const q of activeQs) perDim.set(q.dimensionId, (perDim.get(q.dimensionId) ?? 0) + 1);
    for (const d of activeDims) {
      const n = perDim.get(d.id) ?? 0;
      if (n < minQ) errors.push(`Dimensi ${d.name} (${d.code}) butuh minimal ${minQ} soal aktif (kini ${n}).`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Publish versi → live; versi live lain → archived. Gatekeeper dulu. */
export async function publishVersion(versionId: string): Promise<{ ok: boolean; versionId?: string; errors?: string[] }> {
  const v = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, versionId) });
  if (!v) return { ok: false, errors: ["version_not_found"] };
  const check = await validatePublish(versionId);
  if (!check.ok) return { ok: false, errors: check.errors };
  // B2C policy: hanya satu versi LIVE per keluarga (minat | bakat)
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, v.assessmentId) });
  if (a?.family) {
    const fam = await db.query.assessments.findMany({ where: eq(schema.assessments.family, a.family) });
    for (const o of fam) {
      if (o.id === a.id) continue;
      const ol = await db.query.assessmentVersions.findFirst({
        where: and(eq(schema.assessmentVersions.assessmentId, o.id), eq(schema.assessmentVersions.status, "live")),
      });
      if (ol) return { ok: false, errors: [`Hanya satu tes ${a.family === "minat" ? "Minat" : "Bakat"} yang boleh LIVE untuk pengguna umum (B2C). Tes lain ("${o.name}") masih LIVE — nonaktifkan rilis itu dulu.`] };
    }
  }
  await db
    .update(schema.assessmentVersions)
    .set({ status: "archived" })
    .where(and(eq(schema.assessmentVersions.assessmentId, v.assessmentId), eq(schema.assessmentVersions.status, "live")));
  await db
    .update(schema.assessmentVersions)
    .set({ status: "live", publishedAt: new Date() })
    .where(eq(schema.assessmentVersions.id, versionId));
  return { ok: true, versionId };
}