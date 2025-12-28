import { sql } from "drizzle-orm";
import { db } from ".";

const main = async () => {
  console.log("Fixing role 'user' -> 'student'...");
  await db.execute(sql`UPDATE "user" SET role = 'student' WHERE role = 'user'`);
  console.log("Fixed.");
  process.exit(0);
};

main();
