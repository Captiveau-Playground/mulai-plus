"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Fingerprint, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthorizePage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const roleLabel: Record<string, string> = {
  program_manager: "Program Manager",
  founder: "Founder",
};

export default function AdminESignPage() {
  const { isAuthorized, isLoading: authLoading } = useAuthorizePage({
    admin_dashboard: ["access"],
  });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    ...orpc.esign.listSignatures.queryOptions({
      input: { limit: 100, offset: 0 },
    }),
  });

  const { data: stats } = useQuery({
    ...orpc.esign.getStats.queryOptions({}),
  });

  const items = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, limit: 50, offset: 0 };

  const filtered = items.filter(
    (s: any) =>
      !search ||
      s.signerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      s.mentorName?.toLowerCase().includes(search.toLowerCase()) ||
      s.programName?.toLowerCase().includes(search.toLowerCase()) ||
      s.batchName?.toLowerCase().includes(search.toLowerCase()) ||
      s.documentId?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageState isLoading={authLoading} isAuthorized={isAuthorized}>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="internal-page-title">E-Signatures</h1>
          <p className="internal-page-desc">Kelola dan pantau tanda tangan digital yang telah diterbitkan.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <p className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">Total</p>
            <p className="mt-1 font-bold font-bricolage text-2xl text-text-main md:text-3xl">{stats?.total ?? 0}</p>
            <p className="mt-0.5 font-manrope text-text-muted-custom text-xs">tanda tangan diterbitkan</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <p className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
              Terverifikasi
            </p>
            <p className="mt-1 font-bold font-bricolage text-2xl text-green-600 md:text-3xl">
              {stats?.totalVerified ?? 0}
            </p>
            <p className="mt-0.5 font-manrope text-text-muted-custom text-xs">sudah diverifikasi</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <p className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
              Role Distribution
            </p>
            <div className="mt-2 space-y-1">
              {(stats?.roleDistribution ?? []).map((r: any) => (
                <div key={r.role} className="flex items-center justify-between">
                  <span className="font-manrope text-text-main text-xs">{roleLabel[r.role] || r.role}</span>
                  <span className="font-manrope font-semibold text-text-main text-xs">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <p className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
              Terbaru
            </p>
            <div className="mt-2 space-y-1">
              {(stats?.recent ?? []).slice(0, 3).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="max-w-[120px] truncate font-manrope text-text-main text-xs">{r.signerName}</span>
                  <span className="font-manrope text-[10px] text-text-muted-custom">
                    {r.createdAt ? format(new Date(r.createdAt), "dd MMM", { locale: id }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted-custom" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari signer, student, mentor, program..."
            className="rounded-xl border-gray-200 bg-white pl-9 font-manrope text-sm"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Fingerprint className="mb-3 h-10 w-10 text-gray-300" />
              <p className="font-bold font-bricolage text-base text-gray-900">
                {search ? "Tidak ada hasil" : "Belum ada tanda tangan"}
              </p>
              <p className="mt-1 font-manrope text-sm text-text-muted-custom">
                {search
                  ? "Coba ubah kata kunci pencarian."
                  : "Tanda tangan digital akan muncul di sini setelah diterbitkan."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Signer
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Role
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Student
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Mentor
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Program / Batch
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Tanggal
                  </TableHead>
                  <TableHead className="font-manrope font-semibold text-text-muted-custom text-xs uppercase tracking-wider">
                    Scan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sig: any) => (
                  <TableRow key={sig.id}>
                    <TableCell className="font-manrope font-medium text-sm text-text-main">{sig.signerName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2.5 py-0.5 font-manrope font-medium text-[11px] text-brand-navy">
                        {roleLabel[sig.signerRole] || sig.signerRole}
                      </span>
                    </TableCell>
                    <TableCell className="font-manrope text-sm text-text-main">{sig.studentName || "—"}</TableCell>
                    <TableCell className="font-manrope text-sm text-text-muted-custom">
                      {sig.mentorName || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate font-manrope text-sm text-text-main">{sig.programName || "—"}</div>
                      <div className="truncate font-manrope text-text-muted-custom text-xs">{sig.batchName || ""}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-manrope text-sm text-text-muted-custom">
                      {sig.createdAt ? format(new Date(sig.createdAt), "dd MMM yyyy", { locale: id }) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-manrope text-sm text-text-main">{sig.verifiedCount ?? 0}x</div>
                      {sig.lastVerifiedAt && (
                        <div className="font-manrope text-[10px] text-text-muted-custom">
                          {format(new Date(sig.lastVerifiedAt), "dd MMM HH:mm", { locale: id })}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer info */}
        <p className="font-manrope text-text-muted-custom text-xs">
          Menampilkan {filtered.length} dari {pagination.total} tanda tangan digital
          {search && ` (filtered from ${items.length})`}.
        </p>
      </div>
    </PageState>
  );
}
