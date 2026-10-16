"use client";

// Dimensi = bagian tes. Ditampilkan sebagai tabel ringkas (kode · nama · jumlah soal · durasi)
// supaya admin langsung melihat kalau ada dimensi yang belum memenuhi min. soal / belum ada durasi.
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DimRow {
  id: string;
  code: string;
  name: string;
  durationSeconds?: number | null;
}

export function DimensionsCard({
  dims,
  canEdit,
  countByDim,
  minQPerDim,
  timerScope,
  onAdd,
  onDelete,
  onDurationChange,
  adding,
}: {
  dims: DimRow[];
  canEdit: boolean;
  countByDim: Record<string, number>;
  minQPerDim: number;
  timerScope?: string;
  onAdd: (code: string, name: string) => void;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, seconds: number) => void;
  adding?: boolean;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const needDuration = timerScope === "dimension";

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-left font-manrope text-[11px]">
          <thead className="bg-gray-50/80 text-gray-500">
            <tr>
              <th className="w-14 px-2 py-1.5 font-semibold">Kode</th>
              <th className="px-2 py-1.5 font-semibold">Nama dimensi</th>
              <th className="w-20 px-2 py-1.5 text-center font-semibold">Soal</th>
              <th className="w-20 px-2 py-1.5 text-center font-semibold">Durasi</th>
              {canEdit && <th className="w-8 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {dims.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                  Belum ada dimensi.
                </td>
              </tr>
            )}
            {dims.map((d) => {
              const n = countByDim[d.id] ?? 0;
              const kurang = minQPerDim > 0 && n < minQPerDim;
              const noDur = needDuration && !(d.durationSeconds && d.durationSeconds > 0);
              return (
                <tr key={d.id} className="border-gray-50 border-t" data-testid={`dim-row-${d.code}`}>
                  <td className="px-2 py-1.5 font-semibold text-gray-700">{d.code}</td>
                  <td className="px-2 py-1.5 text-gray-700">
                    {d.name}
                    {(kurang || noDur) && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] text-amber-600">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {kurang ? `butuh ≥${minQPerDim} soal` : "isi durasi"}
                      </span>
                    )}
                  </td>
                  <td className={cn("px-2 py-1.5 text-center", kurang ? "font-bold text-amber-600" : "text-gray-500")}>
                    {n}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {canEdit ? (
                      <span className="inline-flex items-center gap-0.5" title="Durasi timer bagian ini (detik)">
                        <input
                          type="number"
                          min={0}
                          max={3600}
                          defaultValue={d.durationSeconds ?? 0}
                          data-testid={`dim-duration-${d.code}`}
                          onBlur={(e) => {
                            const v = Math.max(0, Math.min(3600, Number(e.target.value) || 0));
                            if (v !== (d.durationSeconds ?? 0)) onDurationChange(d.id, v);
                          }}
                          className="w-12 rounded border border-gray-200 px-1 py-0.5 text-right font-manrope text-[10px] outline-none focus:border-brand-orange/50"
                        />
                        <span className="text-[9px] text-gray-400">s</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">{d.durationSeconds ?? 0}s</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        title={`Hapus dimensi ${d.code}`}
                        data-testid={`dim-delete-${d.code}`}
                        onClick={() => onDelete(d.id)}
                        className="rounded p-1 text-red-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex gap-1.5">
          <Input
            className="h-8 w-20 text-xs"
            placeholder="Kode"
            data-testid="dim-add-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          />
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Nama dimensi (cth: Realistic)"
            data-testid="dim-add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            size="sm"
            className="h-8 shrink-0 bg-brand-navy text-xs hover:bg-brand-navy-light"
            data-testid="dim-add-submit"
            disabled={!code.trim() || !name.trim() || adding}
            onClick={() => {
              onAdd(code.trim(), name.trim());
              setCode("");
              setName("");
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
          </Button>
        </div>
      )}
    </div>
  );
}
