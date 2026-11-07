/**
 * Perhitungan analitik assessment (murni, tanpa DB) — dipakai endpoint admin
 * `tmbAdmin.analytics.*`. Semua fungsi deterministik supaya bisa diuji unit.
 */

export interface ItemQuestion {
  id: string;
  versionId: string;
  order: number;
  code?: string | null;
  text: string;
  type: string;
  dimensionId: string;
}

export interface ItemOption {
  id: string;
  questionId: string;
  value: string;
  label: string;
  score: number;
}

export interface ItemAnswer {
  sessionId: string;
  questionId: string;
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  scoreEarned?: number | null;
}

export interface ItemSession {
  id: string;
  status: string;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  studentId: string;
  /** versi soal sesi ini — dipakai menghitung "eligible" per butir */
  versionId?: string;
}

export interface ItemStat {
  questionId: string;
  versionId: string;
  order: number;
  code: string;
  text: string;
  dimensionId: string;
  type: string;
  /** jumlah sesi yang menjawab butir ini */
  answered: number;
  /** jumlah sesi dalam cakupan yang seharusnya melihat butir ini */
  eligible: number;
  /** jumlah jawaban benar (scoreEarned ≥ 1) */
  correct: number;
  /** tingkat kesulitan: proporsi benar dari yang MENJAWAB (0–1) */
  p: number | null;
  /** rerata poin jawaban (bermakna untuk butir skala/likert, mis. 1–5) */
  meanScore: number | null;
  /** daya beda point-biserial (-1..1); null bila data tidak cukup */
  discrimination: number | null;
  /** sebaran jawaban per opsi (value → jumlah) */
  options: Record<string, number>;
  /** pilihan yang tidak pernah dipilih (distractor mati) */
  deadOptions: string[];
  /** sparsity: proporsi sesi yang melewati butir ini */
  skippedRate: number | null;
  /** penanda butir bermasalah */
  flags: string[];
}

/** Median; array kosong → null. */
export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] as number) : ((v[mid - 1] as number) + (v[mid] as number)) / 2;
}

/**
 * Korelasi point-biserial: butir benar (1) vs skor total sesi (kontinu).
 * r = (M1 − M0) / SD_total × √(p·q)
 */
export function pointBiserial(pairs: { score: number; total: number }[]): number | null {
  const n = pairs.length;
  if (n < 5) return null;
  const p1 = pairs.filter((x) => x.score >= 1);
  const p0 = pairs.filter((x) => x.score < 1);
  if (!p1.length || !p0.length) return null;
  const mean = (arr: { total: number }[]) => arr.reduce((a, b) => a + b.total, 0) / arr.length;
  const m1 = mean(p1);
  const m0 = mean(p0);
  const overall = mean(pairs);
  const variance = pairs.reduce((a, b) => a + (b.total - overall) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (!sd) return null;
  const p = p1.length / n;
  const q = 1 - p;
  return Math.round(((m1 - m0) / sd) * Math.sqrt(p * q) * 1000) / 1000;
}

const round = (v: number, digits = 3) => Math.round(v * 10 ** digits) / 10 ** digits;

export interface ItemStatsInput {
  questions: ItemQuestion[];
  options: ItemOption[];
  answers: ItemAnswer[];
  /** sesi yang masuk cakupan (mis. semua sesi selesai untuk versi itu) */
  sessions: ItemSession[];
  versionId?: string;
}

/** Statistik per butir: kesulitan, daya beda, distractor, skip. */
export function computeItemStats({ questions, options, answers, sessions, versionId }: ItemStatsInput): ItemStat[] {
  const sessionsInScope = sessions.length;
  const answersBySession = new Map<string, ItemAnswer[]>();
  for (const a of answers) {
    if (!a.sessionId) continue;
    const list = answersBySession.get(a.sessionId) ?? [];
    list.push(a);
    answersBySession.set(a.sessionId, list);
  }
  // skor total per sesi (untuk point-biserial)
  const totalBySession = new Map<string, number>();
  for (const [sid, list] of answersBySession) {
    totalBySession.set(
      sid,
      list.reduce((sum, a) => sum + Number(a.scoreEarned ?? 0), 0),
    );
  }

  const optionsByQuestion = new Map<string, ItemOption[]>();
  for (const o of options) {
    const list = optionsByQuestion.get(o.questionId) ?? [];
    list.push(o);
    optionsByQuestion.set(o.questionId, list);
  }

  const scoped = questions.filter((q) => !versionId || q.versionId === versionId).sort((a, b) => a.order - b.order);

  return scoped.map((q) => {
    const isLikert = q.type === "likert";
    const items = answers.filter((a) => a.questionId === q.id);
    const answered = items.length;
    const correct = items.reduce((sum, a) => sum + (Number(a.scoreEarned ?? 0) >= 1 ? 1 : 0), 0);
    // butir skala (likert) selalu berskor → "proporsi benar" tidak bermakna
    const p = !isLikert && answered ? round(correct / answered, 3) : null;

    const discrimination = isLikert
      ? null
      : pointBiserial(
          items.map((a) => ({
            score: Number(a.scoreEarned ?? 0) >= 1 ? 1 : 0,
            total: totalBySession.get(a.sessionId) ?? 0,
          })),
        );

    const opts = optionsByQuestion.get(q.id) ?? [];
    const chosenScores = items
      .map((a) => opts.find((o) => o.id === a.selectedOptionId)?.score ?? Number(a.scoreEarned ?? 0))
      .filter((n) => Number.isFinite(n));
    const meanScore = chosenScores.length
      ? round(chosenScores.reduce((a, b) => a + b, 0) / chosenScores.length, 2)
      : null;
    const distribution: Record<string, number> = {};
    for (const o of opts) distribution[o.value] = 0;
    for (const a of items) {
      const opt = opts.find((o) => o.id === a.selectedOptionId);
      if (opt) distribution[opt.value] = (distribution[opt.value] ?? 0) + 1;
    }
    const deadOptions = opts.filter((o) => (distribution[o.value] ?? 0) === 0).map((o) => o.value);

    // eligible = sesi yang memakai VERSI butir ini (bukan semua versi dalam cakupan)
    const eligible = q.versionId
      ? sessions.filter((x) => !x.versionId || x.versionId === q.versionId).length
      : sessionsInScope;
    const skippedRate = eligible ? round(1 - answered / eligible, 3) : null;

    const flags: string[] = [];
    if (q.type !== "likert") {
      if (p !== null && p <= 0.2) flags.push("terlalu sulit");
      if (p !== null && p >= 0.95) flags.push("terlalu mudah");
      if (discrimination !== null && discrimination < 0.2) flags.push("daya beda rendah");
      // butuh cukup responden per opsi (≈4× jumlah opsi) supaya "mati" bukan sekadar sampel kecil
      const enoughForDistractor = answered >= Math.max(10, opts.length * 4);
      if (enoughForDistractor && deadOptions.length && q.type === "multiple_choice") flags.push("distractor mati");
      if (skippedRate !== null && skippedRate > 0.3) flags.push("banyak dilewati");
    }

    return {
      questionId: q.id,
      versionId: q.versionId,
      order: q.order,
      code: q.code ?? "",
      text: q.text,
      dimensionId: q.dimensionId,
      type: q.type,
      answered,
      eligible,
      correct,
      p,
      meanScore,
      discrimination,
      options: distribution,
      deadOptions,
      skippedRate,
      flags,
    };
  });
}

// ── Funnel ────────────────────────────────────────────────────────────

export interface FunnelStats {
  total: number;
  byStatus: Record<string, number>;
  completed: number;
  completionRate: number;
  medianDurationMinutes: number | null;
  p25DurationMinutes: number | null;
  p75DurationMinutes: number | null;
  timeouts: number;
  perDimension: { dimensionId: string; answered: number; reached: number; dropRate: number }[];
}

const minutes = (a: Date | string | null, b: Date | string | null): number | null => {
  if (!a || !b) return null;
  const start = a instanceof Date ? a : new Date(a);
  const end = b instanceof Date ? b : new Date(b);
  const ms = end.getTime() - start.getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
};

/** Ringkasan funnel: status, konversi, durasi, dan drop per dimensi. */
export function computeFunnel(sessions: ItemSession[], answers: ItemAnswer[], questions: ItemQuestion[]): FunnelStats {
  const byStatus: Record<string, number> = {};
  for (const s of sessions) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

  const durations = sessions
    .map((s) => minutes(s.startedAt, s.completedAt))
    .filter((v): v is number => v !== null && v > 0)
    .sort((a, b) => a - b);
  const pick = (q: number) =>
    durations.length
      ? round(durations[Math.min(durations.length - 1, Math.floor(q * durations.length))] as number, 1)
      : null;

  const completed = byStatus.completed ?? 0;
  const eligibleSessions = sessions.filter((s) => s.status === "completed" || s.status === "timeout");
  const dimOf = new Map(questions.map((q) => [q.id, q.dimensionId]));

  const reachedByDim = new Map<string, Set<string>>();
  const answeredByDim = new Map<string, Map<string, number>>();
  for (const a of answers) {
    const dim = dimOf.get(a.questionId);
    if (!dim) continue;
    const sessionsWith = answeredByDim.get(dim) ?? new Map<string, number>();
    sessionsWith.set(a.sessionId, (sessionsWith.get(a.sessionId) ?? 0) + 1);
    answeredByDim.set(dim, sessionsWith);
    const reached = reachedByDim.get(dim) ?? new Set<string>();
    reached.add(a.sessionId);
    reachedByDim.set(dim, reached);
  }

  const perDimension = [...answeredByDim.entries()].map(([dimensionId, perSession]) => {
    const answered = perSession.size;
    const reached = reachedByDim.get(dimensionId)?.size ?? 0;
    const base = Math.max(answered, eligibleSessions.length || answered);
    return {
      dimensionId,
      answered,
      reached,
      dropRate: base ? round(1 - answered / base, 3) : 0,
    };
  });

  return {
    total: sessions.length,
    byStatus,
    completed,
    completionRate: sessions.length ? round(completed / sessions.length, 3) : 0,
    medianDurationMinutes: (() => {
      const m = median(durations);
      return m === null ? null : round(m, 1);
    })(),
    p25DurationMinutes: pick(0.25),
    p75DurationMinutes: pick(0.75),
    timeouts: byStatus.timeout ?? 0,
    perDimension: perDimension.sort((a, b) => b.answered - a.answered),
  };
}

// ── Perbandingan versi ────────────────────────────────────────────────

export interface VersionStat {
  versionId: string;
  versionNumber: number | null;
  status: string;
  /** kode tes pemilik versi (mis. DISCOVER) — supaya tabel bisa dibaca saat "Semua tes" */
  testCode?: string;
  sessions: number;
  completed: number;
  completionRate: number;
  avgConfidence: number | null;
  items: number;
  /** rata-rata p dari butir yang punya jawaban */
  avgP: number | null;
  medianDurationMinutes: number | null;
}

export function computeVersionStats(input: {
  versions: { id: string; versionNumber: number | null; status: string; testCode?: string }[];
  sessions: (ItemSession & { versionId: string })[];
  itemStats: { versionId: string; p: number | null }[];
  confidences: { sessionId: string; confidence: number | null; versionId: string }[];
}): VersionStat[] {
  return input.versions
    .map((v) => {
      const vs = input.sessions.filter((s) => s.versionId === v.id);
      const completed = vs.filter((s) => s.status === "completed").length;
      const conf = input.confidences
        .filter((c) => c.versionId === v.id && c.confidence !== null)
        .map((c) => c.confidence as number);
      const ps = input.itemStats.filter((i) => i.versionId === v.id && i.p !== null).map((i) => i.p as number);
      return {
        versionId: v.id,
        versionNumber: v.versionNumber,
        status: v.status,
        testCode: v.testCode ?? "",
        sessions: vs.length,
        completed,
        completionRate: vs.length ? round(completed / vs.length, 3) : 0,
        avgConfidence: conf.length ? Math.round(conf.reduce((a, b) => a + b, 0) / conf.length) : null,
        items: input.itemStats.filter((i) => i.versionId === v.id).length,
        avgP: ps.length ? round(ps.reduce((a, b) => a + b, 0) / ps.length, 3) : null,
        medianDurationMinutes: (() => {
          const m = median(vs.map((x) => minutes(x.startedAt, x.completedAt)).filter((x): x is number => x !== null));
          return m === null ? null : round(m, 1);
        })(),
      };
    })
    .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0));
}

// ── Tren waktu ────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  started: number;
  completed: number;
  users: number;
}

const dayKey = (d: Date | string): string => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** Bucket harian + isi hari kosong supaya grafik tidak bolong. */
export function computeTimeseries(
  sessions: (ItemSession & { versionId?: string })[],
  opts?: { days?: number; now?: Date },
): TrendPoint[] {
  const days = opts?.days ?? 14;
  const now = opts?.now ?? new Date();
  const buckets = new Map<string, { started: number; completed: number; users: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(dayKey(d), { started: 0, completed: 0, users: new Set() });
  }
  for (const s of sessions) {
    if (!s.startedAt) continue;
    const key = dayKey(s.startedAt);
    const b = buckets.get(key);
    if (!b) continue;
    b.started += 1;
    b.users.add(s.studentId);
    if (s.status === "completed") {
      const ck = s.completedAt ? dayKey(s.completedAt) : key;
      const cb = buckets.get(ck) ?? b;
      cb.completed += 1;
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, started: v.started, completed: v.completed, users: v.users.size }));
}

/** Rerata yang aman (abaikan null/NaN). */
export function avgOf(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return null;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

// ── Statistik kohort (B2B: batch / sekolah) ───────────────────────────

export interface CohortStudent {
  id: string;
  name: string;
  status: string;
  resultId?: string | null;
}

export interface CohortResult {
  id: string;
  hollandCode?: string | null;
  hollandScores?: Record<string, unknown> | null;
  abilityScores?: unknown;
  confidenceScore?: string | number | null;
  differentiation?: string | null;
  createdAt?: Date | string | null;
}

export interface CohortReco {
  resultId: string;
  type: string;
  rank?: number | null;
  itemName: string;
}

export interface CohortStats {
  counts: { total: number; completed: number; inProgress: number; invited: number; completionRatePct: number };
  confidenceAvg: number | null;
  holland: { code: string; count: number; pct: number; avg: number }[];
  ability: { key: string; correct: number; total: number; pct: number }[];
  strongest: { key: string; pct: number } | null;
  weakest: { key: string; pct: number } | null;
  topMajors: { name: string; count: number; pct: number }[];
  topCareers: { name: string; count: number; pct: number }[];
  attention: { studentId: string; name: string; reasons: string[] }[];
  activeBatchIds: string[];
}

const HOLLAND = ["R", "I", "A", "S", "E", "C"] as const;

/** Ringkasan satu kohort (kelas/sekolah): kelengkapan, minat, kemampuan, rekomendasi, perhatian. */
export function computeCohortStats(input: {
  students: (CohortStudent & { batchId?: string })[];
  results: CohortResult[];
  recos: CohortReco[];
}): CohortStats {
  const byId = new Map(input.results.map((r) => [r.id, r]));
  const recosByResult = new Map<string, CohortReco[]>();
  for (const rc of input.recos) {
    const arr = recosByResult.get(rc.resultId) ?? [];
    arr.push(rc);
    recosByResult.set(rc.resultId, arr);
  }

  const hollandCount: Record<string, number> = Object.fromEntries(HOLLAND.map((k) => [k, 0]));
  const hollandSum: Record<string, number> = Object.fromEntries(HOLLAND.map((k) => [k, 0]));
  const majorCount = new Map<string, number>();
  const careerCount = new Map<string, number>();
  const abilSum = new Map<string, { correct: number; total: number }>();
  const attention: CohortStats["attention"] = [];
  const activeBatchIds = new Set<string>();
  const conf: number[] = [];
  let completed = 0;
  let inProgress = 0;

  for (const st of input.students) {
    if (st.batchId) activeBatchIds.add(st.batchId);
    if (st.status === "in_progress") inProgress++;
    const res = st.resultId ? byId.get(st.resultId) : undefined;
    if (!res) {
      if (st.status !== "completed") attention.push({ studentId: st.id, name: st.name, reasons: ["belum selesai"] });
      continue;
    }
    completed++;

    const hs = (res.hollandScores ?? {}) as Record<string, unknown>;
    for (const k of HOLLAND) hollandSum[k] = (hollandSum[k] ?? 0) + Number(hs[k] ?? 0);
    const top = String(res.hollandCode ?? "")
      .trim()
      .charAt(0)
      .toUpperCase();
    if (top in hollandCount) hollandCount[top] = (hollandCount[top] ?? 0) + 1;

    for (const rc of recosByResult.get(res.id) ?? []) {
      const rank = rc.rank ?? 99;
      if (rc.type === "major" && rank <= 3) majorCount.set(rc.itemName, (majorCount.get(rc.itemName) ?? 0) + 1);
      else if (rc.type === "career" && rank <= 3) careerCount.set(rc.itemName, (careerCount.get(rc.itemName) ?? 0) + 1);
    }

    const ab = (res.abilityScores ?? {}) as Record<string, unknown>;
    const scores = ((ab as any)?.scores ?? ab) as Record<string, unknown>;
    let weakest: { key: string; pct: number } | null = null;
    for (const [k, v] of Object.entries(scores)) {
      if (!v || typeof v !== "object") continue;
      const correct = Number((v as any).correct ?? 0);
      const total = Number((v as any).total ?? 0);
      if (!total) continue;
      const acc = abilSum.get(k) ?? { correct: 0, total: 0 };
      acc.correct += correct;
      acc.total += total;
      abilSum.set(k, acc);
      const pct = Math.round((correct / total) * 100);
      if (!weakest || pct < weakest.pct) weakest = { key: k, pct };
    }

    const c = Number(res.confidenceScore ?? 0);
    if (Number.isFinite(c) && c > 0) conf.push(c);

    const reasons: string[] = [];
    if (Number.isFinite(c) && c > 0 && c < 50) reasons.push("keyakinan rendah");
    if (
      String(res.differentiation ?? "")
        .toLowerCase()
        .startsWith("flat")
    )
      reasons.push("minat menyebar");
    if (weakest && weakest.pct < 40) reasons.push(`kemampuan ${weakest.key} terendah`);
    if (reasons.length) attention.push({ studentId: st.id, name: st.name, reasons });
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const total = input.students.length;
  const holland = HOLLAND.map((k) => ({
    code: k,
    count: hollandCount[k] ?? 0,
    pct: pct(hollandCount[k] ?? 0, completed),
    avg: completed ? Math.round(((hollandSum[k] ?? 0) / completed) * 10) / 10 : 0,
  })).sort((a, b) => b.count - a.count || b.avg - a.avg);

  const ability = [...abilSum.entries()]
    .map(([key, v]) => ({ key, correct: v.correct, total: v.total, pct: pct(v.correct, v.total) }))
    .sort((a, b) => b.pct - a.pct);

  const topOf = (m: Map<string, number>, limit = 8) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count, pct: pct(count, Math.max(1, completed)) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);

  return {
    counts: {
      total,
      completed,
      inProgress,
      invited: Math.max(0, total - completed - inProgress),
      completionRatePct: pct(completed, total),
    },
    confidenceAvg: conf.length ? Math.round(conf.reduce((a, b) => a + b, 0) / conf.length) : null,
    holland,
    ability,
    strongest: ability[0] ?? null,
    weakest: ability.length > 1 ? (ability[ability.length - 1] as { key: string; pct: number }) : null,
    topMajors: topOf(majorCount),
    topCareers: topOf(careerCount),
    attention: attention.slice(0, 60),
    activeBatchIds: [...activeBatchIds],
  };
}

/**
 * Aturan butir mana yang dihitung untuk SKOR KEMAMPUAN (tes bakat).
 * Butir skala (likert) adalah self-report dengan poin 1–5 — bukan benar/salah —
 * sehingga tidak boleh masuk skor kemampuan (bila masuk, persentase bisa >100%).
 */
export function countsForAbility(questionType: string | null | undefined, family: string | null | undefined): boolean {
  if (family !== "bakat") return true;
  return questionType !== "likert";
}

/** Persentase kemampuan aman: selalu 0–100. */
export function abilityPct(correct: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

/**
 * Poin untuk butir skala (likert) berdasarkan urutan opsi + setelan admin
 * (Penilaian → Skala minimal/maksimal). Dulu engine mengabaikan min/max dan selalu 1..n.
 */
export function likertPoint(ordinal: number, min = 1, max?: number | null): number {
  const point = min + ordinal;
  return typeof max === "number" && Number.isFinite(max) && max > min ? Math.min(max, point) : point;
}
