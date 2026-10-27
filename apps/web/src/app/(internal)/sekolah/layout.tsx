"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
// Area SEKOLAH (B2B) — hanya butuh LOGIN (bukan role sekolah), karena:
//  • pendaftar yang masih menunggu persetujuan harus bisa melihat statusnya;
//  • akun yang belum terdaftar diarahkan oleh halaman ke formulir pendaftaran.
// Pembatasan data tetap di server: `school.overview` hanya mengembalikan data
// sekolah milik anggota yang sudah AKTIF.
import DashboardFooter from "@/components/dashboard-footer";
import DashboardHeader from "@/components/dashboard-header";
import { SchoolSidebar } from "@/components/school/school-sidebar";
import { PageState } from "@/components/ui/page-state";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

function SchoolShell({ children }: { children: React.ReactNode }) {
  const { setOpenMobile } = useSidebar();
  return (
    <>
      <SchoolSidebar onNavigate={() => setOpenMobile(false)} />
      <SidebarInset className="flex h-screen flex-col bg-bg-light">
        <DashboardHeader />
        <div className="h-0 min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
        <DashboardFooter />
      </SidebarInset>
    </>
  );
}

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <PageState fillViewport isLoading>
        {null}
      </PageState>
    );
  }

  return (
    // data-area="sekolah" → warna sidebar khusus sekolah (lihat globals-internal.css).
    // Ditempel di provider (bukan div pembungkus) supaya lebar layout tidak berubah.
    <SidebarProvider
      data-area="sekolah"
      style={
        {
          "--sidebar-width": "272px",
        } as React.CSSProperties
      }
    >
      <SchoolShell>{children}</SchoolShell>
    </SidebarProvider>
  );
}
