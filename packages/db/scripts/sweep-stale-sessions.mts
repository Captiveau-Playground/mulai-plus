/**
 * Bersihkan sesi tes TANPA timer yang ditinggalkan (status → `abandoned`).
 *
 *   cd packages/db
 *   bun --env-file=../../apps/server/.env scripts/sweep-stale-sessions.mts --dry
 *   bun --env-file=../../apps/server/.env scripts/sweep-stale-sessions.mts            # eksekusi
 *
 * Aturan (sama dengan runtime `pending`):
 *  - hanya status in_progress/paused,
 *  - tidak punya `timer` di configJson (yang bertimer ditangani deadline/timeout),
 *  - aktivitas terakhir (startedAt atau answeredAt terakhir) lebih tua dari N hari
 *    (env ASSESSMENT_STALE_DAYS, default 7).
 *
 * Sesi yang di-abandon TIDAK dibuatkan hasil (tidak mengarang profil dari jawaban parsial).
 * Jawaban tetap tersimpan untuk audit.
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { and, eq, inArray, lt, sql } = await import("drizzle-orm");
const schema = await import("../src/schema");
const { isStaleUntimedSession, staleDaysFromEnv } = await import("../../api/src/lib/assessment-analytics");
const { finalizeSession } = await import("../../api/src/routers/discover");

const DRY = process.argv.includes("--dry");
const days = staleDaysFromEnv(process.env as Record<string, string | undefined>);

async function main() {
  const sessions = await db.query.assessmentSessions.findMany({
    where: and(inArray(schema.assessmentSessions.status, ["in_progress", "paused"] as any)),
    orderBy: (t: any) => [t.startedAt],
  });

  const lastAnswerBySession = new Map<string, Date>();
  if (sessions.length) {
    const rows = await db
      .select({
        sessionId: schema.assessmentAnswers.sessionId,
        last: sql<Date>`max(${schema.assessmentAnswers.answeredAt})`.as("last"),
      })
      .from(schema.assessmentAnswers)
      .where(
        inArray(
          schema.assessmentAnswers.sessionId,
          sessions.map((s) => s.id),
        ),
      )
      .groupBy(schema.assessmentAnswers.sessionId);
    for (const r of rows) if (r.last) lastAnswerBySession.set(r.sessionId, new Date(r.last));
  }

  const stale = sessions.filter((s) =>
    isStaleUntimedSession({
      status: s.status,
      configJson: s.configJson,
      startedAt: s.startedAt,
      lastAnsweredAt: lastAnswerBySession.get(s.id) ?? null,
      days,
    }),
  );

  const withTimer = sessions.filter((s) => ((s.configJson as any)?.timer ?? null) != null);
  const expiredTimed = withTimer.filter((s) => {
    const t = (s.configJson as any)?.timer ?? {};
    const times = [t.expectedEndISO, ...(t.dims ?? []).map((d: any) => d.endISO), ...(t.qEnds ?? [])]
      .filter(Boolean)
      .map((x: string) => new Date(x).getTime())
      .filter((n: number) => Number.isFinite(n));
    return times.length > 0 && Date.now() > Math.max(...times) + 15_000;
  });
  console.log(
    `sesi aktif: ${sessions.length} · bertimer: ${withTimer.length} (deadline lewat: ${expiredTimed.length})`,
  );
  console.log(`ambang: ${days} hari · akan di-abandon: ${stale.length}`);

  if (!stale.length) {
    console.log("tidak ada yang perlu dibersihkan");
    process.exit(0);
  }
  if (DRY) {
    for (const s of stale.slice(0, 10))
      console.log(`  (dry) ${s.id} · ${s.status} · mulai ${s.startedAt?.toISOString?.() ?? s.startedAt}`);
    console.log("(dry run — tidak menulis)");
    process.exit(0);
  }

  // 1) sesi bertimer yang deadline-nya sudah lewat → finalisasi (timeout + hasil), sama seperti runtime
  let closedTimed = 0;
  for (const s of expiredTimed) {
    await finalizeSession(s);
    closedTimed++;
  }
  if (closedTimed) console.log(`✅ ${closedTimed} sesi bertimer ditutup (timeout + hasil)`);

  // 2) sesi tanpa timer yang ditinggalkan → abandoned
  let done = 0;
  for (const s of stale) {
    await db
      .update(schema.assessmentSessions)
      .set({ status: "abandoned" as never, completedAt: new Date() })
      .where(and(eq(schema.assessmentSessions.id, s.id), eq(schema.assessmentSessions.status, s.status)));
    done++;
  }
  console.log(`✅ ${done} sesi ditandai abandoned`);

  const left = await db.query.assessmentSessions.findMany({
    where: inArray(schema.assessmentSessions.status, ["in_progress", "paused"] as any),
    columns: { id: true },
  });
  console.log(`sisa sesi aktif: ${left.length}`);
  void lt;
  process.exit(0);
}

main().catch((e) => {
  console.error("sweep gagal:", e);
  process.exit(1);
});
