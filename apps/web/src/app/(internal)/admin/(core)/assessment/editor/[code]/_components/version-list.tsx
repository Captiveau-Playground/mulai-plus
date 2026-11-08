"use client";

// Rilis & Versi — hanya versi yang actionable (live + draf) yang selalu tampil.
// Versi lama disembunyikan di balik "Versi lama (N)" supaya panel tidak makin panjang
// ke bawah saat versi bertambah.
import { ChevronRight, Eye, History, Rocket } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface VersionRow {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt?: string | null;
}

function relative(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "hari ini";
  if (diff === 1) return "kemarin";
  if (diff < 30) return `${diff} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function statusBadge(status: string) {
  if (status === "live") return { label: "aktif utk siswa", cls: "bg-teal-500/10 text-teal-700 border-teal-500/20" };
  if (status === "draft")
    return { label: "draf · belum dirilis", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
  return { label: "lama", cls: "bg-gray-100 text-gray-500 border-gray-200" };
}

export function VersionList({
  versions,
  selectedId,
  onSelect,
  onPreview,
  onPublish,
  disabled,
}: {
  versions: VersionRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onPreview: (v: VersionRow) => void;
  onPublish: (v: VersionRow) => void;
  disabled?: boolean;
}) {
  const [showOld, setShowOld] = useState(false);

  if (versions.length === 0) {
    return <p className="font-manrope text-[11px] text-muted-foreground">Belum ada versi.</p>;
  }

  // "aktif" = live + draf (yang masih bisa dipakai/dikerjakan)
  const active = versions
    .filter((v) => v.status === "live" || v.status === "draft")
    .sort((a, b) => b.versionNumber - a.versionNumber);
  const old = versions
    .filter((v) => v.status !== "live" && v.status !== "draft")
    .sort((a, b) => b.versionNumber - a.versionNumber);

  const Row = ({ v, compact = false }: { v: VersionRow; compact?: boolean }) => {
    const st = statusBadge(v.status);
    const selected = selectedId === v.id;
    const isLive = v.status === "live";
    const when = relative(v.publishedAt);
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border transition-colors",
          compact ? "border-transparent px-2 py-1 hover:bg-gray-50" : "bg-white px-2.5 py-1.5",
          !compact && (selected ? "border-teal-500/40 bg-teal-500/5" : "border-gray-100 hover:bg-gray-50"),
        )}
        data-testid={`version-row-${v.versionNumber}`}
      >
        {!compact && (
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              isLive ? "bg-teal-500" : v.status === "draft" ? "bg-amber-400" : "bg-gray-300",
            )}
          />
        )}
        <button
          type="button"
          onClick={() => onSelect(v.id)}
          className="min-w-0 flex-1 text-left"
          title="Lihat isi versi ini"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn("font-manrope font-semibold text-[11px]", compact ? "text-gray-600" : "text-gray-800")}>
              v{v.versionNumber}
            </span>
            <Badge variant="outline" className={cn("px-1.5 py-0 font-semibold text-[9px]", st.cls)}>
              {st.label}
            </Badge>
            {when && <span className="font-manrope text-[9px] text-muted-foreground">{when}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPreview(v)}
          title="Lihat sebagai siswa (versi ini)"
          data-testid={`version-preview-${v.versionNumber}`}
          className="shrink-0 rounded-md border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {!isLive && (
          <Button
            size="sm"
            variant={v.status === "draft" ? "default" : "outline"}
            disabled={disabled}
            data-testid={`version-publish-${v.versionNumber}`}
            onClick={() => onPublish(v)}
            className={cn(
              "h-6 shrink-0 px-2 text-[10px]",
              v.status === "draft" && "bg-brand-navy hover:bg-brand-navy-light",
            )}
          >
            {v.status === "draft" ? <Rocket className="mr-1 h-3 w-3" /> : <History className="mr-1 h-3 w-3" />}
            {v.status === "draft" ? "Rilis" : "Rilis ulang"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5" data-testid="version-list">
      {active.map((v) => (
        <Row key={v.id} v={v} />
      ))}

      {old.length > 0 && (
        <div className="border-gray-100 border-t pt-1.5">
          <button
            type="button"
            data-testid="version-old-toggle"
            aria-expanded={showOld}
            onClick={() => setShowOld((s) => !s)}
            className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 font-manrope font-semibold text-[11px] text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showOld && "rotate-90")} />
            Versi lama ({old.length})
            <span className="ml-auto font-normal text-[10px] text-muted-foreground">
              {showOld ? "sembunyikan" : "lihat"}
            </span>
          </button>
          {showOld && (
            <div className="mt-0.5 space-y-0.5" data-testid="version-old-list">
              {old.map((v) => (
                <Row key={v.id} v={v} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
