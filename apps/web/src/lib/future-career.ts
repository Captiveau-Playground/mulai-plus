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
  careers: { itemName: string; categoryKey?: string; prodiRefs?: ProdiRef[] }[],
): MindElixirData {
  const children: MindElixirData["nodeData"][] = majors.map((m, i) => {
    const leaves: MindElixirData["nodeData"]["children"] = [];
    const shownProdi = new Set<string>();
    for (const pr of (m.prodiRefs ?? []).slice(0, 3)) {
      leaves.push(prodiNode(`m${i}-p-${leaves.length}`, pr, `major_${i + 1}`));
      shownProdi.add(`${pr.prodi}@${pr.university}`);
    }
    const catCareers = careers.filter((x) => x.categoryKey === m.categoryKey).slice(0, 2);
    for (const c of catCareers) {
      // prodi untuk karier ini: pakai prodiRefs karier (dari kategorinya). Kalau kosong,
      // pakai prodi jurusan induk supaya cabang tetap punya jalur kuliah.
      // Prodi untuk karier ini (dari kategorinya). Prodi yang sudah tampil di jurusan induk
      // dilewati supaya peta tidak mengulang kampus yang sama; kalau semua sudah tampil,
      // tampilkan satu sebagai jangkar jalur kuliah.
      const pool = (c.prodiRefs?.length ? c.prodiRefs : (m.prodiRefs ?? [])) as ProdiRef[];
      const fresh = pool.filter((pr) => !shownProdi.has(`${pr.prodi}@${pr.university}`));
      const path = (fresh.length ? fresh : pool).slice(0, 2);
      const kids = path.map((pr, j) =>
        prodiNode(`m${i}-c${leaves.length}-p${j}`, pr, `career_${c.itemName.slice(0, 20)}`),
      );
      leaves.push({
        id: `m${i}-c-${leaves.length}`,
        topic: truncate(c.itemName, 26),
        style: { fontWeight: "600" },
        expanded: false,
        children: kids.length ? kids : undefined,
      });
    }
    return {
      id: `m-${i}`,
      topic: `${m.itemName} · ${m.confidence}%`,
      branchColor: BRANCH_COLORS[i % BRANCH_COLORS.length],
      expanded: i === 0,
      children: leaves.length > 0 ? leaves : undefined,
    };
  });

  // Karier yang kategorinya tidak masuk top-5 jurusan tetap ditampilkan sebagai cabang
  // "Karier lain" lengkap dengan jalur prodinya (tidak hilang dari peta).
  const shown = new Set(majors.map((m) => m.categoryKey));
  // Hanya karier yang punya jalur prodi (supaya tidak ada node tanpa informasi jurusan).
  const orphans = careers.filter((c) => !shown.has(c.categoryKey) && (c.prodiRefs ?? []).length > 0).slice(0, 4);
  if (orphans.length) {
    children.push({
      id: "other-careers",
      topic: "Karier lain",
      branchColor: BRANCH_COLORS[4],
      expanded: false,
      children: orphans.map((c, i) => ({
        id: `oc-${i}`,
        topic: truncate(c.itemName, 26),
        style: { fontWeight: "600" },
        children: (c.prodiRefs ?? [])
          .slice(0, 2)
          .map((pr, j) => prodiNode(`oc-${i}-p${j}`, pr, `career_other_${i + 1}`)),
      })),
    });
  }

  return {
    nodeData: {
      id: "root",
      topic: `Profil ${hollandCode}`,
      children,
    },
    direction: 1,
  };
}
