// (M5.1) Notifikasi khusus modul assessment (tes minat & bakat):
//  • hasil siswa siap
//  • kelas selesai 100% → admin sekolah & guru BK
//  • pengingat kelas yang jadwalnya segera berakhir & masih ada peserta tertinggal
import { and, db, eq, inArray, ne } from "@mulai-plus/db/db";
import { assessmentOrgMembers, assessmentOrgs } from "@mulai-plus/db/schema/assessment";
import { tmbBatches, tmbBatchStudents } from "@mulai-plus/db/schema/tmb";
import { notifyUser, notifyUsers, todayKey } from "./notify-user";

const BASE = () => (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");

/** Anggota aktif (admin & guru BK) sebuah sekolah — penerima notifikasi operasional. */
async function schoolMemberIds(schoolId: string | null): Promise<string[]> {
  if (!schoolId) return [];
  const org = await db.query.assessmentOrgs.findFirst({
    where: eq(assessmentOrgs.schoolId, schoolId),
    columns: { id: true },
  });
  if (!org) return [];
  const members = await db.query.assessmentOrgMembers.findMany({
    where: and(eq(assessmentOrgMembers.orgId, org.id), eq(assessmentOrgMembers.status, "aktif")),
    columns: { userId: true },
  });
  return members.map((m) => m.userId);
}

/** (M5.1) Siswa menyelesaikan tes → beri tahu hasilnya siap (maks 1×/hari/user). */
export async function notifyResultReady(userId: string, code: string | null) {
  if (!userId || userId.startsWith("preview-")) return;
  await notifyUser({
    userId,
    title: "Hasil tesmu sudah siap 🎉",
    message:
      "Kamu sudah menyelesaikan tes. Buka halaman hasil untuk melihat kode minat, skor per dimensi, dan rekomendasi jurusan.",
    type: "success",
    link: "/dashboard/student/assessment",
    dedupeKey: `result-ready:${userId}:${code ?? "x"}:${todayKey()}`,
  });
}

/**
 * (M5.1) Bila seluruh peserta kelas sudah selesai → beri tahu admin sekolah & guru BK.
 * Idempoten per kelas (satu notifikasi untuk selamanya).
 */
export async function notifyBatchComplete(batchId: string): Promise<{ notified: number; completed: boolean }> {
  const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, batchId) });
  if (!batch) return { notified: 0, completed: false };
  const rows = await db.query.tmbBatchStudents.findMany({
    where: eq(tmbBatchStudents.batchId, batchId),
    columns: { status: true },
  });
  if (!rows.length) return { notified: 0, completed: false };
  const done = rows.filter((r) => r.status === "completed").length;
  if (done < rows.length) return { notified: 0, completed: false };

  const ids = await schoolMemberIds(batch.schoolId);
  const notified = await notifyUsers(ids, {
    title: `Kelas ${batch.className ?? batch.name ?? ""} sudah 100% selesai`,
    message: `${done} dari ${rows.length} peserta telah menyelesaikan tes. Laporan insight & rekap kelas sudah bisa diunduh.`,
    type: "success",
    link: `/sekolah/kelas/${batchId}/laporan`,
    dedupeKeyBase: `batch-complete:${batchId}`,
    email: {
      subject: `Kelas ${batch.className ?? batch.name ?? ""} selesai 100%`,
      html: `<div style="font-family:system-ui,sans-serif">
        <h2>Kelas ${batch.className ?? batch.name ?? ""} selesai 100%</h2>
        <p>${done} dari ${rows.length} peserta telah menyelesaikan tes minat &amp; bakat.</p>
        <p><a href="${BASE()}/sekolah/kelas/${batchId}/laporan" style="background:#0f766e;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">Buka laporan kelas</a></p>
      </div>`,
    },
  });
  return { notified, completed: true };
}

/**
 * (M5.1) Pengingat kelas yang jadwalnya berakhir ≤3 hari lagi dan masih ada
 * peserta belum selesai. Dedupe harian per kelas → aman dipanggil cron tiap hari.
 */
export async function runBatchReminders(windowDays = 3): Promise<{
  batches: number;
  notified: number;
  details: Array<{ batchId: string; className: string | null; pending: number }>;
}> {
  const now = new Date();
  const limit = new Date(now.getTime() + windowDays * 86400000);

  const batches = await db.query.tmbBatches.findMany({
    where: eq(tmbBatches.scheduleMode, "scheduled"),
  });
  const due = batches.filter((b) => {
    if (!b.windowEnd) return false;
    const end = new Date(b.windowEnd);
    return end > now && end <= limit;
  });
  if (!due.length) return { batches: 0, notified: 0, details: [] };

  const ids = due.map((b) => b.id);
  const rows = await db.query.tmbBatchStudents.findMany({
    where: and(inArray(tmbBatchStudents.batchId, ids), ne(tmbBatchStudents.status, "completed")),
    columns: { batchId: true, status: true },
  });

  const details: Array<{ batchId: string; className: string | null; pending: number }> = [];
  let notified = 0;
  for (const b of due) {
    const pending = rows.filter((r) => r.batchId === b.id).length;
    if (!pending) continue;
    const members = await schoolMemberIds(b.schoolId);
    const end = b.windowEnd
      ? new Date(b.windowEnd).toLocaleDateString("id-ID", { day: "2-digit", month: "long" })
      : "—";
    const n = await notifyUsers(members, {
      title: `Pengingat: ${pending} peserta belum menyelesaikan tes`,
      message: `Kelas ${b.className ?? b.name ?? ""} berakhir ${end}. Masih ada ${pending} peserta yang belum menyelesaikan tes — kirim pengingat dari halaman kelas.`,
      type: "warning",
      link: `/sekolah/kelas/${b.id}`,
      dedupeKeyBase: `batch-reminder:${b.id}:${todayKey(now)}`,
    });
    notified += n;
    details.push({ batchId: b.id, className: b.className ?? b.name ?? null, pending });
  }
  return { batches: due.length, notified, details };
}
