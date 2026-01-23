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
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCountData } = useQuery({
    ...orpc.notification.getUnreadCount.queryOptions(),
    refetchInterval: 30000, // Poll every 30s
  });

  const { data: notificationsData } = useQuery({
    ...orpc.notification.list.queryOptions({
      input: { limit: 10 },
    }),
    enabled: isOpen,
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
      router.push(notification.link as any);
      setIsOpen(false);
    }
  };

  const unreadCount = unreadCountData?.count || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuGroup>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto text-muted-foreground text-xs"
                onClick={() => markAllAsRead(undefined)}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {notificationsData?.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              notificationsData?.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 focus:bg-accent",
                    !notification.read && "bg-accent/50",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-medium text-sm">{notification.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-xs">{notification.message}</p>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenuGroup>
    </DropdownMenu>
  );
}
