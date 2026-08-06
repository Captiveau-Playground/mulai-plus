import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { tmbAdminRouter } from "../../api/src/routers/tmb";
import { db } from "../src";
import { user } from "../src/schema/auth";
import { tmbBatches, tmbBatchStudents } from "../src/schema/tmb";

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
  await db.delete(tmbBatchStudents);
  await db.delete(tmbBatches);
  await db.delete(user).where(eq(user.id, DEMO_ADMIN));
  await db
    .insert(user)
    .values({ id: DEMO_ADMIN, name: "Admin Demo Sekolah", email: "demo-admin@tmb-e2e.id", role: "admin" });

  const school: any = await call(
    tmbAdminRouter.schools.create,
    { name: "SMAN 1 Bandung", city: "Bandung", status: "aktif" },
    { context: ctx },
  );
  const batch: any = await call(
    tmbAdminRouter.batches.create,
    { schoolId: school.id, name: "Angkatan 2026", className: "XII IPA", major: "IPA", graduationYear: 2026 },
    { context: ctx },
  );
  for (const [name, email, nis] of STUDENTS) {
    await call(tmbAdminRouter.students.add, { batchId: batch.id, name, email, nis }, { context: ctx });
  }
  const batchInfo: any = await call(tmbAdminRouter.batches.get, { id: batch.id }, { context: ctx });
  console.log(`BATCH_ID=${batch.id}`);
  console.log(`ADMIN_ID=${DEMO_ADMIN}`);
  console.log(`INVITE_CODE=${batchInfo.batch.inviteCode}`);
  console.log(`INVITE_LINK=/assessment/invite/${batchInfo.batch.inviteCode}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
