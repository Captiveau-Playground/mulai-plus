"use client";

// Verifikasi pendaftaran sekolah (B2B): admin MULAI+ menyetujui / menolak
// pendaftaran. Setelah disetujui, akun pendaftar naik jadi `school_admin` dan
// sekolahnya tersambung ke data batch/roster yang sudah ada.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, Mail, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssessmentPageHeader } from "@/components/admin/assessment-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const STATUS = [
  { value: "pending", label: "Menunggu" },
  { value: "aktif", label: "Aktif" },
  { value: "ditolak", label: "Ditolak" },
  { value: "nonaktif", label: "Nonaktif" },
] as const;

const fmt = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function VerifikasiSekolahPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS)[number]["value"]>("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const list = useQuery(orpc.schoolAdmin.registrations.queryOptions({ input: { status } }));
  const items: any[] = list.data?.items ?? [];

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: orpc.schoolAdmin.registrations.key() });
  };

  const approve = useMutation({
    ...orpc.schoolAdmin.approve.mutationOptions(),
    onSuccess: async (r: any) => {
      notify.success(
        r?.roleChanged
          ? "Sekolah diaktifkan — akun pendaftar kini berperan sebagai Admin Sekolah"
          : "Sekolah diaktifkan",
      );
      await invalidate();
    },
    onError: (e: any) => notify.error(e?.message ?? "Gagal menyetujui"),
  });

  const reject = useMutation({
    ...orpc.schoolAdmin.reject.mutationOptions(),
    onSuccess: async () => {
      notify.success("Pendaftaran ditolak");
      setRejectId(null);
      setNote("");
      await invalidate();
    },
    onError: (e: any) => notify.error(e?.message ?? "Gagal menolak"),
  });

  return (
    <div className="px-4 py-5 sm:px-6" data-testid="school-queue">
      <AssessmentPageHeader
        title="Verifikasi Sekolah"
        description="Setujui pendaftaran sekolah mitra B2B. Setelah disetujui, akun PIC menjadi Admin Sekolah dan bisa melihat peserta, hasil, dan insight sekolahnya."
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUS.map((s) => (
          <button
            key={s.value}
            type="button"
            data-testid={`status-filter-${s.value}`}
            onClick={() => setStatus(s.value)}
            className={`rounded-full px-3 py-1.5 font-manrope font-semibold text-xs transition-colors ${
              status === s.value ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto font-manrope text-gray-400 text-xs">
          {list.isLoading ? "memuat…" : `${items.length} sekolah`}
        </span>
      </div>

      {list.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-gray-200 border-dashed bg-white p-8 text-center">
          <Clock className="mx-auto h-6 w-6 text-gray-300" />
          <p className="mt-2 font-manrope font-semibold text-gray-700 text-sm">
            {status === "pending" ? "Tidak ada pendaftaran yang menunggu" : "Tidak ada data"}
          </p>
          {status === "pending" && (
            <p className="mt-1 font-manrope text-gray-500 text-xs">
              Pendaftaran baru akan muncul di sini dan dikirim juga ke notifikasi Discord.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {items.map((it) => {
            const busy = approve.isPending || reject.isPending;
            return (
              <div
                key={it.id}
                data-testid="pending-row"
                className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold font-bricolage text-base text-gray-900">{it.name}</p>
                    <p className="font-manrope text-gray-500 text-xs">
                      {[it.type, it.city, it.npsn ? `NPSN ${it.npsn}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-gray-600">
                    {fmt(it.createdAt)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 rounded-2xl bg-gray-50 p-3">
                  <p className="font-manrope font-semibold text-gray-700 text-xs">
                    PIC: {it.picName ?? "-"}
                    {it.picPosition ? ` · ${it.picPosition}` : ""}
                  </p>
                  <p className="flex items-center gap-1.5 font-manrope text-[11px] text-gray-500">
                    <Phone className="h-3 w-3" /> {it.picPhone ?? "-"}
                    {it.picEmail && (
                      <>
                        <Mail className="ml-2 h-3 w-3" /> {it.picEmail}
                      </>
                    )}
                  </p>
                  <p className="font-manrope text-[11px] text-gray-500">
                    Akun pendaftar: <b className="text-gray-700">{it.user?.name ?? "-"}</b> · {it.user?.email ?? "-"} ·{" "}
                    role: {it.user?.role ?? "-"}
                  </p>
                  {it.note && <p className="font-manrope text-[11px] text-amber-700">Catatan: {it.note}</p>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {it.status === "pending" ? (
                    <>
                      <Button
                        data-testid={`approve-${it.id}`}
                        disabled={busy}
                        onClick={() => approve.mutate({ orgId: it.id })}
                        className="rounded-xl bg-teal-600 px-4 py-2 font-bold font-manrope text-white text-xs hover:bg-teal-700 disabled:opacity-50"
                      >
                        {approve.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}{" "}
                        Setujui
                      </Button>
                      <Button
                        data-testid={`reject-${it.id}`}
                        disabled={busy}
                        onClick={() => {
                          setRejectId(it.id);
                          setNote("");
                        }}
                        className="rounded-xl bg-gray-100 px-4 py-2 font-bold font-manrope text-gray-700 text-xs hover:bg-gray-200 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Tolak
                      </Button>
                    </>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-manrope font-semibold text-[11px] text-gray-600">
                      Status: {it.status}
                    </span>
                  )}
                  <Link
                    href="/admin/assessment/schools"
                    className="ml-auto font-manrope font-semibold text-mentor-teal text-xs hover:underline"
                  >
                    Daftar sekolah →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog tolak */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bricolage">Tolak pendaftaran sekolah?</DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Tuliskan alasan singkat — akan tampil di dashboard sekolah agar PIC tahu langkah berikutnya.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="cth: Data sekolah belum bisa diverifikasi — mohon lengkapi NPSN & surat tugas."
            className="rounded-xl"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRejectId(null)} className="rounded-xl">
              Batal
            </Button>
            <Button
              data-testid="reject-confirm"
              disabled={reject.isPending}
              onClick={() => rejectId && reject.mutate({ orgId: rejectId, note: note.trim() || undefined })}
              className="rounded-xl bg-red-600 font-bold font-manrope text-white text-xs hover:bg-red-700"
            >
              {reject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Tolak pendaftaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
