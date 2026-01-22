import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";

console.log("CWD:", process.cwd());
const envPath = path.resolve(process.cwd(), "apps/server/.env");
console.log("Env Path:", envPath);
console.log("Exists:", fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
console.log("Dotenv result error:", result.error);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function main() {
  const { db } = await import("../src");
  const { program } = await import("../src/schema/programs");

  const programs = await db.select().from(program);
  for (const p of programs) {
    if (!p.slug) {
      let slug = slugify(p.name);
      if (!slug) slug = `program-${p.id}`;

      console.log(`Updating ${p.name} -> ${slug}`);
      await db.update(program).set({ slug }).where(eq(program.id, p.id));
    }
  }

  console.log("Applying constraints...");
  try {
    await db.execute(sql`ALTER TABLE "program" ALTER COLUMN "slug" SET NOT NULL`);
    console.log("Set NOT NULL");
  } catch (e) {
    console.log("NOT NULL might already exist or failed:", e.message);
  }

  try {
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "program_slug_unique" ON "program" ("slug")`);
    // Or ADD CONSTRAINT
    // Drizzle usually uses CONSTRAINT for unique.
    // await db.execute(sql`ALTER TABLE "program" ADD CONSTRAINT "program_slug_unique" UNIQUE ("slug")`);
    // But IF NOT EXISTS is harder with ADD CONSTRAINT in Postgres without a block.
    // Let's try to just run it and catch error.
    await db.execute(sql`ALTER TABLE "program" ADD CONSTRAINT "program_slug_unique" UNIQUE ("slug")`);
    console.log("Added UNIQUE constraint");
  } catch (e) {
    console.log("Constraint might already exist or failed:", e.message);
  }

  console.log("Done");
  process.exit(0);
}

main().catch(console.error);
