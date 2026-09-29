"use client";

import { useEffect, useState } from "react";

/** Pencarian sekolah — API Sekolah Mandiri + filter provinsi & jenjang (SMP ke atas). */
const SCHOOL_API = "https://api-sekolah-kita.pages.dev/api/sekolah";

export const BENTUK_ATAS = ["SMP", "MTS", "SMA", "MA", "SMK"] as const;

export function mapLevel(jenjang: string): string {
  const j = jenjang.toUpperCase();
  if (/SMK/.test(j)) return "SMK";
  if (/SMA|MA/.test(j)) return "SMA";
  if (/SMP|MTS/.test(j)) return "SMP";
  return "SMA";
}

export type SchoolSuggestion = {
  nama: string;
  kab: string;
  kec: string;
  prov: string;
  jenjang: string;
  npsn: string;
};

export function useSchoolSearch() {
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<SchoolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [provSel, setProvSel] = useState("");
  const [bentukSel, setBentukSel] = useState("");
  const [provList, setProvList] = useState<string[]>([]);

  useEffect(() => {
    fetch("https://api-sekolah-kita.pages.dev/api/rekap")
      .then((r) => r.json())
      .then((d) => setProvList(Array.isArray(d?.metadata?.provinsi) ? d.metadata.provinsi : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const kw = q.trim();
    if (kw.length < 3) {
      setSug([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ keyword: kw, limit: "8" });
        if (provSel) params.set("provinsi", provSel);
        if (bentukSel) params.set("bentuk", bentukSel);
        const r = await fetch(`${SCHOOL_API}?${params.toString()}`);
        const d = await r.json();
        const rows = (d?.data ?? [])
          .map((x: any) => ({
            nama: String(x.nama ?? ""),
            kab: String(x.nama_kabupaten ?? ""),
            kec: String(x.nama_kecamatan ?? ""),
            prov: String(x.nama_provinsi ?? ""),
            jenjang: String(x.bentuk_pendidikan_group ?? x.jenjang_pendidikan ?? x.bentuk_pendidikan ?? ""),
            npsn: String(x.npsn ?? ""),
          }))
          .filter((x: SchoolSuggestion) => {
            const j = `${x.jenjang} ${x.nama}`.toUpperCase();
            return BENTUK_ATAS.some((b) => j.includes(b)) || /(SLTP|SLTA)/i.test(j);
          });
        setSug(rows.slice(0, 8));
      } catch {
        setSug([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, provSel, bentukSel]);

  return { q, setQ, sug, open, setOpen, provSel, setProvSel, bentukSel, setBentukSel, provList };
}

/** Dropdown saran sekolah — dipakai berdampingan dengan input. */
export function SchoolSuggestions({
  search,
  onPick,
}: {
  search: ReturnType<typeof useSchoolSearch>;
  onPick: (item: SchoolSuggestion) => void;
}) {
  if (!search.open || search.sug.length === 0) return null;
  return (
    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
      {search.sug.map((sk, i) => (
        <button
          key={`${sk.npsn}-${i}`}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(sk);
          }}
          className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-navy/5 text-brand-navy">
            🏫
          </span>
          <span className="min-w-0">
            <span className="block truncate font-manrope font-medium text-text-main text-xs">{sk.nama}</span>
            <span className="block truncate font-manrope text-[10px] text-muted-foreground">
              {sk.jenjang} · {sk.kab} · {sk.kec} · {sk.prov}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
