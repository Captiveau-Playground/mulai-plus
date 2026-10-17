"use client";

// Pengantar (sections) + instruksi per dimensi — ditampilkan sebagai kartu, bukan deretan input.
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "./field-controls";

export interface SectionRow {
  id?: string;
  title: string;
  contentType: string;
  contentJson?: { text?: string; items?: string[] };
  displayOrder?: number;
  visibility?: boolean;
}

export interface InstructionRow {
  id?: string;
  dimensionId: string;
  header?: string | null;
  contentType?: string;
  contentJson?: { items?: string[]; text?: string };
}

const CONTENT_TYPES: [string, string][] = [
  ["description", "Deskripsi"],
  ["bullet_list", "Poin"],
  ["cards", "Kartu"],
];

export function SectionsCard({
  sections,
  instructions,
  dims,
  canEdit,
  onSaveSection,
  onDeleteSection,
  onSaveInstruction,
}: {
  sections: SectionRow[];
  instructions: InstructionRow[];
  dims: { id: string; name: string }[];
  canEdit: boolean;
  onSaveSection: (s: SectionRow) => void;
  onDeleteSection: (id?: string) => void;
  onSaveInstruction: (i: InstructionRow) => void;
}) {
  const sectionText = (sc: SectionRow) => sc.contentJson?.text ?? (sc.contentJson?.items ?? []).join("\n");

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="font-manrope font-semibold text-[11px] text-gray-700">
            Pengantar <span className="font-normal text-muted-foreground">({sections.length})</span>
          </p>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              data-testid="section-add"
              onClick={() =>
                onSaveSection({ title: "Pengantar baru", contentType: "description", contentJson: { text: "" } })
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Tambah
            </Button>
          )}
        </div>
        <div className="space-y-1.5">
          {sections.length === 0 && (
            <p className="font-manrope text-[10px] text-muted-foreground">Belum ada pengantar.</p>
          )}
          {sections.map((sc, i) => (
            <div
              key={sc.id ?? i}
              className="rounded-lg border border-gray-100 bg-gray-50/40 p-2"
              data-testid={`section-row-${i}`}
            >
              <div className="flex gap-1.5">
                <DebouncedInput
                  idKey={sc.id ?? `s${i}`}
                  testId={`section-title-${i}`}
                  className="h-7 flex-1 text-xs"
                  placeholder="Judul pengantar"
                  disabled={!canEdit}
                  value={sc.title}
                  onCommit={(v) => onSaveSection({ ...sc, title: v })}
                />
                <select
                  className="h-7 rounded-lg border border-gray-200 bg-white px-1.5 font-manrope text-[10px]"
                  data-testid={`section-type-${i}`}
                  disabled={!canEdit}
                  value={sc.contentType}
                  onChange={(e) => onSaveSection({ ...sc, contentType: e.target.value })}
                >
                  {CONTENT_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                {canEdit && (
                  <button
                    type="button"
                    title="Hapus pengantar"
                    data-testid={`section-delete-${i}`}
                    onClick={() => onDeleteSection(sc.id)}
                    className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <DebouncedInput
                idKey={`${sc.id ?? `s${i}`}-c`}
                testId={`section-content-${i}`}
                className="mt-1.5 h-7 w-full text-xs"
                placeholder="Isi (deskripsi / satu poin per baris)"
                disabled={!canEdit}
                value={sectionText(sc)}
                onCommit={(v) =>
                  onSaveSection({
                    ...sc,
                    contentJson:
                      sc.contentType === "description" ? { text: v } : { items: v.split("\n").filter(Boolean) },
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1.5 font-manrope font-semibold text-[11px] text-gray-700">Instruksi per dimensi</p>
        <div className="space-y-1.5">
          {dims.map((d, i) => {
            const ins = instructions.find((x) => x.dimensionId === d.id);
            return (
              <div key={d.id} className="rounded-lg border border-gray-100 bg-white p-2">
                <p className="mb-1 font-manrope font-semibold text-[10px] text-gray-500">{d.name}</p>
                <DebouncedInput
                  idKey={ins?.id ?? d.id}
                  testId={`instr-${i}`}
                  className="h-7 text-xs"
                  placeholder="Judul instruksi (cth: Bagian Realistic)"
                  disabled={!canEdit}
                  value={ins?.header ?? ""}
                  onCommit={(v) =>
                    onSaveInstruction({
                      ...ins,
                      dimensionId: d.id,
                      header: v || d.name,
                      contentType: ins?.contentType ?? "bullet_list",
                      contentJson: ins?.contentJson ?? { items: [] },
                    })
                  }
                />
              </div>
            );
          })}
          {dims.length === 0 && (
            <p className="font-manrope text-[10px] text-muted-foreground">Tambahkan dimensi dulu.</p>
          )}
        </div>
      </section>
    </div>
  );
}
