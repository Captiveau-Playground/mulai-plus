"use client";

// (M4.1 → disederhanakan) Tim sekolah: SATU role "Sekolah" untuk semua anggota.
// Semua anggota bisa mengelola kelas/peserta/jadwal dan melihat hasil/laporan.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailPlus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const ROLE_LABEL: Record<string, { label: string; cls: string }> = {
  school_admin: { label: "Sekolah", cls: "bg-brand-navy/10 text-brand-navy" },
};

const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  pending: "Menunggu persetujuan",
  ditolak: "Ditolak",
};

export default function SchoolTeamPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ ...orpc.school.team.queryOptions({ input: {} }) });
  const d: any = data;
  const [email, setEmail] = useState("");

  const undang = useMutation({
    ...orpc.school.invitePeer.mutationOptions(),
    onSuccess: (r: any) => {
      if (!r?.ok) {
        notify.error(
          r?.error === "sudah_anggota"
            ? "Email ini sudah jadi anggota tim"
            : r?.error === "sudah_diundang"
              ? "Email ini sudah diundang"
              : r?.error === "hanya_admin"
                ? "Hanya admin sekolah yang bisa mengundang"
                : "Gagal mengundang",
        );
        return;
      }
      notify.success("Undangan dibuat — minta rekan membuka portal sekolah dengan email tersebut");
      setEmail("");
      qc.invalidateQueries({ queryKey: orpc.school.team.queryKey({ input: {} }) });
    },
    onError: () => notify.error("Gagal mengundang"),
  });

  const batalkan = useMutation({
    ...orpc.school.revokeInvite.mutationOptions(),
    onSuccess: () => {
      notify.success("Undangan dibatalkan");
      qc.invalidateQueries({ queryKey: orpc.school.team.queryKey({ input: {} }) });
    },
    onError: () => notify.error("Gagal membatalkan undangan"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!d?.ok) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="rounded-xl bg-amber-50 p-4 font-manrope text-amber-800 text-sm" data-testid="team-error">
          Tim sekolah belum tersedia. Pastikan pendaftaran sekolah sudah disetujui.
        </p>
      </div>
    );
  }

  const canManage = !!d.me?.canManage;

  return (
    <div className="w-full p-4 pb-16 sm:p-6">
      <h1 className="font-bricolage font-extrabold text-2xl text-brand-navy">Tim Sekolah</h1>
      <p className="mt-1 font-manrope text-gray-600 text-sm">
        Semua anggota tim sekolah bisa mengelola kelas, peserta, jadwal, dan melihat hasil/laporan.
      </p>

      {/* Anggota */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full" data-testid="team-members">
          <thead className="bg-gray-50">
            <tr className="text-left font-manrope text-[10px] text-gray-500 uppercase">
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Peran</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {d.members.map((m: any) => {
              const r = ROLE_LABEL[m.role] ?? { label: m.role, cls: "bg-gray-100 text-gray-600" };
              return (
                <tr key={m.userId} data-testid="team-row" className="border-gray-50 border-t">
                  <td className="px-3 py-3 font-manrope text-sm">
                    <p className="font-semibold text-gray-800">{m.name}</p>
                    <p className="text-[10px] text-gray-500">{m.email ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-manrope font-semibold text-[10px] ${r.cls}`}
                    >
                      {m.role === "school_admin" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <UserRound className="h-3 w-3" />
                      )}
                      {r.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-manrope text-[11px] text-gray-600">
                    {STATUS_LABEL[m.status] ?? m.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Undangan pending */}
      {d.invites.length > 0 && (
        <section className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-3" data-testid="team-invites">
          <h2 className="font-bold font-bricolage text-amber-900 text-sm">Undangan menunggu</h2>
          <ul className="mt-1.5 space-y-1">
            {d.invites.map((i: any) => (
              <li key={i.id} className="flex items-center justify-between gap-2 font-manrope text-xs">
                <span className="truncate text-gray-800">
                  {i.email} <span className="text-[10px] text-gray-500">· {ROLE_LABEL[i.role]?.label ?? i.role}</span>
                </span>
                {canManage && (
                  <button
                    type="button"
                    data-testid="revoke-invite"
                    onClick={() => batalkan.mutate({ id: i.id })}
                    className="shrink-0 rounded-lg border border-amber-200 px-2 py-0.5 font-semibold text-[10px] text-amber-800 hover:bg-amber-100"
                  >
                    <Trash2 className="mr-0.5 inline h-3 w-3" /> Batalkan
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Form undang */}
      {canManage ? (
        <section className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-1 font-bold font-bricolage text-brand-navy text-sm">
            <MailPlus className="h-4 w-4" /> Undang rekan
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="peer-email" className="font-manrope text-gray-700 text-sm">
                Email rekan
              </Label>
              <Input
                id="peer-email"
                data-testid="peer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guru.bk@sekolah.sch.id"
                className="mt-1 min-h-11"
              />
            </div>
            <Button
              data-testid="invite-peer"
              onClick={() => undang.mutate({ email })}
              disabled={undang.isPending || !email.includes("@")}
              className="min-h-11 rounded-xl px-4 font-bold font-manrope text-sm"
            >
              {undang.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Undang
            </Button>
          </div>
          <p className="mt-2 font-manrope text-[10px] text-gray-500">
            Rekan harus punya akun MULAI+ dengan email tersebut, lalu membuka portal sekolah untuk mengaktifkan akses.
          </p>
        </section>
      ) : null}
    </div>
  );
}
