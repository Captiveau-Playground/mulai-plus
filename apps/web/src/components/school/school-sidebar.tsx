"use client";

import { useQuery } from "@tanstack/react-query";
// Sidebar area SEKOLAH (B2B) — memakai pola standar internal (NavMain + NavUser +
// TeamSwitcher + SidebarRail) supaya konsisten dengan admin & mentor.
// Bedanya hanya warna (teal gelap, lihat [data-area="sekolah"] di globals-internal.css)
// dan menunya yang minimal: sekolah tidak mengelola bank soal/versi/aturan tes.
import { FileBarChart, GraduationCap, LayoutDashboard, Users, UsersRound } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

function SchoolLogo(props: Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "width" | "height">) {
  return <Image src="/main-icon-logo.svg" alt="MULAI+" width={32} height={32} {...props} />;
}

export function SchoolSidebar({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onNavigate?: () => void }) {
  const { data: session } = authClient.useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const _router = useRouter();

  // Nama sekolah ditampilkan di header sidebar (bukan cuma "Sekolah").
  const me = useQuery({
    ...orpc.school.me.queryOptions(),
    // tunggu sesi siap supaya tidak gagal 401 lalu menempel di fallback
    enabled: !!session?.user,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  const orgName = (me.data as any)?.org?.name ?? "Sekolah Anda";

  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false);
    onNavigate?.();
  };

  const nav = [
    {
      title: "Dashboard Sekolah",
      url: "/sekolah",
      icon: LayoutDashboard,
    },
    {
      title: "Kelas & Peserta",
      url: "/sekolah/kelas",
      icon: Users,
    },
    {
      title: "Laporan Kelas",
      url: "/sekolah/kelas",
      icon: FileBarChart,
    },
    {
      title: "Tim Sekolah",
      url: "/sekolah/tim",
      icon: UsersRound,
    },
  ];

  const user = {
    name: session?.user?.name ?? "Pengguna",
    email: session?.user?.email ?? "",
    avatar: (session?.user as { image?: string } | undefined)?.image ?? "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* `key` memaksa remount saat nama sekolah datang dari server —
            TeamSwitcher menyimpan teams[0] di state, jadi tanpa ini nama tetap fallback. */}
        <TeamSwitcher
          key={orgName}
          teams={[
            {
              name: orgName,
              logo: SchoolLogo,
              plan: "Sekolah",
            },
          ]}
        />
      </SidebarHeader>

      <SidebarContent onClick={handleNavigate}>
        <NavMain label="Menu Sekolah" items={nav} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Dipakai halaman-halaman sekolah untuk menandai area (warna sidebar). */
export function SchoolAreaMarker() {
  return <GraduationCap className="hidden" aria-hidden />;
}
