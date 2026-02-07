import { isNull } from "drizzle-orm";
import { db } from "./src/index";
import { program } from "./src/schema/programs";

async function main() {
  console.log("Checking programs in DB...");
  const allPrograms = await db.select().from(program);
  console.log("Total programs found:", allPrograms.length);

  const activePrograms = await db.select().from(program).where(isNull(program.deletedAt));
  console.log("Active programs (deletedAt is null):", activePrograms.length);

  allPrograms.forEach((p) => {
    console.log(`Program: ${p.name} (ID: ${p.id}), deletedAt: ${p.deletedAt}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
