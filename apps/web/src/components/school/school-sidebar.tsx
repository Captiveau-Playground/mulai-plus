"use client";

// Sidebar area SEKOLAH (B2B) — sengaja minimal: admin sekolah hanya mengelola
// peserta/jadwal dan melihat hasil. Tidak ada menu bank soal/versi/aturan tes.
import { GraduationCap, LayoutDashboard, Loader2, LogOut, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";

const navItems = [
  { title: "Dashboard Sekolah", url: "/sekolah", icon: LayoutDashboard },
  { title: "Kelas & Peserta", url: "/sekolah/kelas", icon: Users },
] as const;

export function SchoolSidebar({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [keluar, setKeluar] = useState(false);

  const logout = async () => {
    setKeluar(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } catch {
      notify.error("Gagal keluar — coba lagi");
      setKeluar(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-none" {...props}>
      <SidebarHeader className="bg-brand-navy px-3 py-4">
        <Link href={"/sekolah" as any} className="flex items-center gap-2">
          <Image src="/logo.png" alt="MULAI+" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-bold font-bricolage text-sm text-white group-data-[collapsible=icon]:hidden">
            MULAI+ <span className="font-normal text-teal-300">Sekolah</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-brand-navy px-2 py-3">
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = item.icon;
            // highlight paling spesifik: "/sekolah" hanya aktif tepat di halaman itu
            const active = item.url === "/sekolah" ? pathname === "/sekolah" : pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link href={item.url as any} onClick={onNavigate} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="bg-brand-navy px-2 pb-4">
        <Separator className="bg-white/10" />
        <DropdownMenu>
          <DropdownMenuTrigger className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <GraduationCap className="h-4 w-4 text-white" />
            </span>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate font-manrope font-semibold text-white text-xs">
                {session?.user?.name ?? "Admin Sekolah"}
              </span>
              <span className="block truncate font-manrope text-[10px] text-white/60">
                {session?.user?.email ?? ""}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled={keluar} onSelect={() => void logout()} className="gap-2">
              {keluar ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Keluar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
