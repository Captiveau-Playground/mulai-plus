import type { MindElixirData } from "mind-elixir";

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
      hyperLink: pr.link,
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
 * Bangun MindElixirData dari HASIL TEST (Journey 1):
 * root = profil Holland → cabang = jurusan (confidence) → daun = prodi (hyperlink) + karier.
 */
export function buildResultMindMap(
  hollandCode: string,
  majors: {
    itemName: string;
    confidence: string;
    categoryKey?: string;
    prodiRefs?: FutureCareerProdi[];
  }[],
  careers: { itemName: string; categoryKey?: string }[],
): MindElixirData {
  const children = majors.map((m, i) => {
    const leaves: MindElixirData["nodeData"]["children"] = [];
    for (const pr of (m.prodiRefs ?? []).slice(0, 3)) {
      leaves.push({
        id: `m${i}-p-${leaves.length}`,
        topic: truncate(`${pr.prodi}${pr.level ? ` (${pr.level})` : ""}`, 30),
        tags: [pr.university.slice(0, 24)],
        hyperLink: pr.link,
      });
    }
    for (const c of careers.filter((x) => x.categoryKey === m.categoryKey).slice(0, 2)) {
      leaves.push({
        id: `m${i}-c-${leaves.length}`,
        topic: truncate(c.itemName, 24),
        style: { fontWeight: "600" },
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

  return {
    nodeData: {
      id: "root",
      topic: `Profil ${hollandCode}`,
      children,
    },
    direction: 1,
  };
}
