import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { tmbAdminRouter } from "../../api/src/routers/tmb";
import { db } from "../src";
import { user } from "../src/schema/auth";
import { tmbBatches, tmbBatchStudents, tmbInvitations } from "../src/schema/tmb";

const DEMO_ADMIN = "tmb-demo-admin";
const ctx = { session: { user: { id: DEMO_ADMIN, name: "Admin Demo", email: "demo@tmb.id", role: "admin" } } } as any;

const STUDENTS = [
  ["Budi Santoso", "budi@mail.com", "1001"],
  ["Siti Aminah", "siti@mail.com", "1002"],
  ["Rizky Pratama", "rizky@mail.com", "1003"],
  ["Dewi Lestari", "dewi@mail.com", "1004"],
  ["Andi Wijaya", "andi@mail.com", "1005"],
];

async function main() {
  await db.delete(tmbInvitations);
  await db.delete(tmbBatchStudents);
  await db.delete(tmbBatches);
  await db.delete(user).where(eq(user.id, DEMO_ADMIN));
  await db
    .insert(user)
    .values({ id: DEMO_ADMIN, name: "Admin Demo Sekolah", email: "demo-admin@tmb-e2e.id", role: "admin" });

  const batch: any = await call(
    tmbAdminRouter.batches.create,
    { name: "SMAN 1 Bandung — Angkatan 2026", className: "XII IPA", major: "IPA", graduationYear: 2026 },
    { context: ctx },
  );
  const ids = [];
  for (const [name, email, nis] of STUDENTS) {
    const s: any = await call(tmbAdminRouter.students.add, { batchId: batch.id, name, email, nis }, { context: ctx });
    ids.push(s.id);
  }
  const inv: any = await call(tmbAdminRouter.students.invite, { studentIds: ids }, { context: ctx });
  console.log(`BATCH_ID=${batch.id}`);
  console.log(`ADMIN_ID=${DEMO_ADMIN}`);
  for (const r of inv.results) console.log(`INVITE ${r.name} => ${r.link}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
