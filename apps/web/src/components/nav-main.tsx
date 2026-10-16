"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  label,
  items,
}: {
  label?: string;
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      /** judul grup kecil di dalam submenu (mis. "Konten & Soal") */
      section?: string;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          /* Flat item (e.g. Dashboard): ONLY exact match — no startsWith to avoid false positives */
          const isItemActive = item.isActive || pathname === item.url;

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isItemActive}>
                  {/* biome-ignore lint/suspicious/noExplicitAny: Workaround for typed routes */}
                  <Link href={item.url as any} className="group flex gap-2">
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          /* Collapsible: check if any sub-item's URL matches (exact OR sub-page) */
          const isAnySubItemActive = item.items?.some(
            (sub) => pathname === sub.url || pathname.startsWith(`${sub.url}/`),
          );
          /* Hanya sub-item dengan URL PALING spesifik yang di-highlight, supaya path induk
             (mis. /admin/assessment) tidak ikut terlihat aktif saat berada di sub-halamannya. */
          const activeSubUrl = item.items
            ?.filter((sub) => pathname === sub.url || pathname.startsWith(`${sub.url}/`))
            .sort((a, b) => b.url.length - a.url.length)[0]?.url;

          return (
            <Collapsible
              key={item.title}
              render={
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      /* Collapsible trigger NEVER gets isActive — only sub-items get highlighted */
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    }
                  />
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem, idx) => {
                        const isSubActive = subItem.url === activeSubUrl;
                        // Judul grup hanya dicetak saat berubah dari item sebelumnya
                        const prevSection = item.items?.[idx - 1]?.section;
                        const showSection = !!subItem.section && subItem.section !== prevSection;
                        return (
                          <Fragment key={subItem.title}>
                            {showSection && (
                              <li
                                data-testid={`nav-section-${subItem.section?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                className="mt-2 px-2 pb-0.5 font-bold font-manrope text-[9px] text-sidebar-foreground/45 uppercase tracking-wider first:mt-0"
                              >
                                {subItem.section}
                              </li>
                            )}
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                href={subItem.url}
                                isActive={isSubActive}
                                data-testid={`nav-${subItem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                              >
                                <span>{subItem.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </Fragment>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              }
              defaultOpen={item.isActive || isAnySubItemActive}
              className="group/collapsible"
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
