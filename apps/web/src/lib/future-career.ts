import type { MindElixirData } from "mind-elixir";
import { buildUtmUrl } from "@/lib/utm";

export interface FutureCareerProdi {
  prodi: string;
  level: string | null;
  university: string;
  link: string;
}

export interface FutureCareerPath {
  categoryKey: string;
  categoryName: string;
  careerName: string;
  matchScore: number;
  prodis: FutureCareerProdi[];
  otherCareers: string[];
}

export interface FutureCareerFit {
  hasResult: boolean;
  score: number | null;
  level: "cocok" | "cukup" | "kurang" | null;
  suggestedMajors: string[];
}

export interface FutureCareerResult {
  query: string;
  matched: boolean;
  paths: FutureCareerPath[];
  fit: FutureCareerFit | null;
  suggestions: string[];
}

// Warna cabang — palet brand MULAI+
const BRANCH_COLORS = ["#1a1f6d", "#0d9488", "#fe9114", "#7c3aed", "#db2777"];

function truncate(topic: string, max = 46) {
  return topic.length > max ? `${topic.slice(0, max - 1)}…` : topic;
}

/**
 * Bangun MindElixirData dari hasil rekomendasi karir impian:
 * root = karir impian → cabang = jurusan → daun = karier lain + prodi (hyperlink)
 */
export function buildCareerMindMap(query: string, paths: FutureCareerPath[]): MindElixirData {
  const children = paths.map((p, i) => {
    const careerNodes = p.otherCareers.map((c, j) => ({
      id: `${p.categoryKey}-career-${j}`,
      topic: truncate(c, 32),
      style: { fontWeight: "500" } as const,
    }));
    const prodiNodes = p.prodis.slice(0, 4).map((pr, j) => ({
      id: `${p.categoryKey}-prodi-${j}`,
      topic: truncate(`${pr.prodi}${pr.level ? ` (${pr.level})` : ""}`, 30),
      tags: [pr.university.slice(0, 24)],
      hyperLink: withResultUtm(pr.link, "career_dream"),
    }));
    return {
      id: `cat-${p.categoryKey}`,
      topic: truncate(p.categoryName, 28),
      branchColor: BRANCH_COLORS[i % BRANCH_COLORS.length],
      expanded: i === 0,
      children: [...careerNodes, ...prodiNodes],
    };
  });

  return {
    nodeData: {
      id: "root",
      topic: truncate(query, 34),
      children,
    },
    direction: 1,
  };
}

/**
 * UTM untuk link prodi yang dibuka dari halaman hasil / karir impian.
 * Memakai util resmi `buildUtmUrl` (satu sumber aturan UTM di aplikasi).
 */
export function resultUtm(link: string, slot = "mindmap"): string {
  if (!link) return link;
  const [base, hash = ""] = link.split("#");
  const url = buildUtmUrl(base ?? link, {
    source: "result",
    medium: "app",
    campaign: "tmb_result",
    content: slot,
  });
  return hash ? `${url}#${hash}` : url;
}

/** Alias lama (dipakai halaman Karir Impian). */
export const withResultUtm = resultUtm;

type ProdiRef = { prodi: string; level?: string | null; university: string; link: string };

function prodiNode(id: string, pr: ProdiRef, slot: string): MindElixirData["nodeData"] {
  return {
    id,
    topic: truncate(`${pr.prodi}${pr.level ? ` (${pr.level})` : ""}`, 30),
    tags: [pr.university.slice(0, 24)],
    hyperLink: withResultUtm(pr.link, slot),
  };
}

/**
 * Bangun MindElixirData dari HASIL TEST (Journey 1):
 * root = profil Holland → cabang = jurusan (confidence) → daun = prodi (hyperlink) + KARIER,
 * dan setiap KARIER punya anak PRODI sendiri (jalur kuliahnya) — jadi tidak ada node karier
 * yang "berhenti" tanpa informasi jurusan. Satu karier bisa dicapai dari >1 prodi.
 */
export function buildResultMindMap(
  hollandCode: string,
  majors: {
    itemName: string;
    confidence: string;
    categoryKey?: string;
    prodiRefs?: ProdiRef[];
  }[],
  careers: { itemName: string; categoryKey?: string; prodiRefs?: ProdiRef[]; confidence?: string | null }[],
): MindElixirData {
  /**
   * Struktur (sesuai permintaan produk): PROFIL → keilmuan/topik → karier → jurusan (prodi).
   *
   * Aturan:
   * • Setiap KARIER wajib punya jurusan/prodi (minimal 1). Karier yang berbagi keilmuan boleh
   *   menampilkan prodi yang sama — itu memang jalur kuliahnya (bukan "loop"), karena cabang
   *   keilmuan sendiri TIDAK lagi mendaftar prodi.
   * • Duplikat hanya dibuang DI DALAM satu karier (prodi sama kampus berbeda → tampil sekali).
   * • Keilmuan tanpa karier menampilkan prodi langsung agar cabang tidak kosong.
   */
  const nameKey = (pr: ProdiRef) => pr.prodi.trim().toLowerCase();
  const prodiLeaves = (pool: ProdiRef[], idPrefix: string, slot: string, limit = 3) => {
    const leaves: MindElixirData["nodeData"][] = [];
    const seen = new Set<string>();
    for (const pr of pool) {
      if (leaves.length >= limit) break;
      const k = nameKey(pr);
      if (seen.has(k)) continue;
      seen.add(k);
      leaves.push(prodiNode(`${idPrefix}-p${leaves.length}`, pr, slot));
    }
    return leaves;
  };

  const children: MindElixirData["nodeData"][] = majors.map((m, i) => {
    const inCategory = careers.filter((c) => c.categoryKey === m.categoryKey).slice(0, 2);
    const branchColor = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const careerKids: MindElixirData["nodeData"][] = inCategory.map((c, j) => {
      const own = (c.prodiRefs ?? []) as ProdiRef[];
      const pool = own.length ? own : ((m.prodiRefs ?? []) as ProdiRef[]);
      const leaves = prodiLeaves(pool, `m${i}-c${j}`, `career_${c.itemName.slice(0, 20)}`);
      const conf = Number(String(c.confidence ?? "").replace("%", ""));
      if (Number.isFinite(conf) && conf > 0) {
        leaves.push({ id: `m${i}-c${j}-fit`, topic: `Kecocokan profil ${Math.round(conf)}%` });
      }
      return {
        id: `m${i}-c${j}`,
        topic: truncate(c.itemName, 28),
        expanded: j === 0,
        children: leaves.length ? leaves : undefined,
      };
    });
    const kids = careerKids.length
      ? careerKids
      : prodiLeaves((m.prodiRefs ?? []) as ProdiRef[], `m${i}`, `major_${i + 1}`);
    return {
      id: `m-${i}`,
      topic: `${m.itemName} · ${m.confidence}%`,
      branchColor,
      expanded: i === 0,
      children: kids.length ? kids : undefined,
    };
  });

  return {
    nodeData: {
      id: "root",
      topic: `Profil ${hollandCode}`,
      children,
    },
    direction: 1,
  };
}
