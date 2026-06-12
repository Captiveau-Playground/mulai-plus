import { studyPrograms, universities } from "@mulai-plus/db/schema/pddikti";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

// Lightweight DB connection for server components
// Uses process.env directly (not @mulai-plus/env/server which needs all vars)
function getDb() {
  const globalForDb = globalThis as unknown as { _pddiktiPool?: pg.Pool };
  if (!globalForDb._pddiktiPool) {
    globalForDb._pddiktiPool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return drizzle(globalForDb._pddiktiPool, { schema: { universities, studyPrograms } });
}

export async function getUniversityBySlug(slug: string) {
  const db = getDb();
  const all = await db
    .select({ idSp: universities.idSp, name: universities.name })
    .from(universities)
    .where(eq(universities.status, "Aktif"));
  return (
    all.find((u) => {
      const candidate =
        u.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        u.idSp.substring(0, 6);
      return candidate === slug;
    }) ?? null
  );
}

export async function getProgramById(id: string) {
  const db = getDb();
  const [prog] = await db
    .select({ name: studyPrograms.name, level: studyPrograms.level })
    .from(studyPrograms)
    .where(eq(studyPrograms.idSms, id))
    .limit(1);
  return prog ?? null;
}

export async function getUniversityById(id: string) {
  const db = getDb();
  const [uni] = await db
    .select({ idSp: universities.idSp, name: universities.name })
    .from(universities)
    .where(eq(universities.idSp, id))
    .limit(1);
  return uni ?? null;
}
