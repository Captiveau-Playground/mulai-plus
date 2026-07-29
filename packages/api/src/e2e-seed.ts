import { seedAll } from "./src/__tests__/integration/seed";

async function main() {
  console.log("🌱 Seeding E2E test data...");
  await seedAll();
  console.log("✅ Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
