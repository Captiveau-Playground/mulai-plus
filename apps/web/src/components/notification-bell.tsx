"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const { data: unreadCountData } = useQuery({
    ...orpc.notification.getUnreadCount.queryOptions(),
    refetchInterval: 30000, // Poll every 30s
    enabled: !!session,
  });

  const { data: notificationsData } = useQuery({
    ...orpc.notification.list.queryOptions({
      input: { limit: 10 },
    }),
    enabled: isOpen && !!session,
  });

  const { mutateAsync: markAsRead } = useMutation(
    orpc.notification.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notification.getUnreadCount.key(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.notification.list.key(),
        });
      },
    }),
  );

  const { mutateAsync: markAllAsRead } = useMutation(
    orpc.notification.markAllAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.notification.getUnreadCount.key(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.notification.list.key(),
        });
      },
    }),
  );

  interface Notification {
    id: string;
    read: boolean;
    link?: string | null;
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead({ id: notification.id });
    }
    if (notification.link) {
      // @ts-expect-error - dynamic link
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const unreadCount = unreadCountData?.count || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuGroup>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" className="relative text-gray-700 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 rounded-xl border-0 bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <DropdownMenuLabel className="font-bold font-bricolage text-base text-brand-navy">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto text-brand-orange text-xs hover:text-brand-orange/80"
                onClick={() => markAllAsRead(undefined)}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {notificationsData?.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-gray-400 text-sm">No notifications</div>
            ) : (
              notificationsData?.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex cursor-pointer flex-col items-start gap-1 px-4 py-3 focus:bg-gray-50",
                    !notification.read && "bg-brand-orange/5",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{notification.title}</span>
                    <span className="text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-gray-500 text-xs">{notification.message}</p>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenuGroup>
    </DropdownMenu>
  );
}
