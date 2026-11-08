#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Guard anti-rahasia untuk pre-commit (dipanggil lint-staged dengan daftar file).
//
// Kenapa ada: kredensial Neon pernah ikut ter-commit di `apps/server/tests/*.ts`
// sehingga bocor ke GitHub (alert Neon, harus dirotasi). Guard ini mencegah
// terulang dengan menolak commit yang memuat pola kredensial.
//
// Pakai manual: node scripts/check-secrets.mjs <file...>
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";

const SKIP_EXT =
  /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|eot|lock|pdf|xlsx?|docx?|pptx?|mov|mp4|webm|zip|gz|map)$/i;

const PATTERNS = [
  {
    re: /postgres(ql)?:\/\/[^:@\s"']+:[^@\s"']+@(?![^@\s"']*(localhost|127\.0\.0\.1|host\.docker\.internal))/i,
    label: "connection string database berisi password (host non-lokal)",
  },
  { re: /npg_[A-Za-z0-9]{8,}/, label: "password Neon (npg_…)" },
  { re: /(sk|rk)_(live|test)_[A-Za-z0-9]{10,}/, label: "API key Stripe" },
  { re: /\bAKIA[0-9A-Z]{12,}\b/, label: "AWS access key" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "private key" },
  { re: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/, label: "GitHub token" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, label: "Slack token" },
  {
    re: /discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{20,}/,
    label: "Discord webhook",
  },
  { re: /sbp_[A-Za-z0-9]{20,}/, label: "Supabase secret key" },
  { re: /midtrans[_-]?server[_-]?key\s*[=:]\s*["']?[A-Za-z0-9-]{10,}/i, label: "Midtrans server key" },
];

const mask = (line) =>
  line
    .trim()
    .slice(0, 160)
    .replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@");

const files = process.argv.slice(2).filter((f) => !SKIP_EXT.test(f));
let found = false;

for (const file of files) {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // file dihapus/biner
  }
  if (text.includes("\u0000")) continue; // biner
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        found = true;
        console.error(`\n🚨 ${file}:${i + 1} — terdeteksi ${p.label}`);
        console.error(`   ${mask(line)}`);
      }
    }
  }
}

if (found) {
  console.error("\n❌ Commit dibatalkan: hapus rahasia di atas dan pakai environment variable.");
  console.error("   Contoh: process.env.DATABASE_URL (lihat .env.example).");
  console.error("   Kalau kredensial SUDAH pernah ter-commit, ROTASI dulu di provider —");
  console.error("   menghapus dari file saja tidak cukup (history git masih menyimpannya).\n");
  process.exit(1);
}
