"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
                      {item.items?.map((subItem) => {
                        const isSubActive = pathname === subItem.url || pathname.startsWith(`${subItem.url}/`);
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton href={subItem.url} isActive={isSubActive}>
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
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
