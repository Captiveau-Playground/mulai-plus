"use client";

import { Mail, MessageCircle, MessageCircleHeart, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTACT_CHANNELS = [
  {
    id: "wa1",
    label: "WhatsApp",
    description: "Admin Pendaftaran",
    href: "https://wa.me/6285730367310",
    icon: MessageCircle,
    color: "text-green-600",
    bg: "bg-green-50 hover:bg-green-100",
    ring: "ring-green-200",
  },
  {
    id: "wa2",
    label: "WhatsApp",
    description: "Layanan Peserta",
    href: "https://wa.me/6285730367310",
    icon: MessageCircle,
    color: "text-green-600",
    bg: "bg-green-50 hover:bg-green-100",
    ring: "ring-green-200",
  },
  {
    id: "ig",
    label: "Instagram",
    description: "@mulaiplus",
    href: "https://instagram.com/mulaiplus.id",
    icon: MessageCircleHeart,
    color: "text-pink-600",
    bg: "bg-pink-50 hover:bg-pink-100",
    ring: "ring-pink-200",
  },
  {
    id: "email",
    label: "Email",
    description: "hello@mulaiplus.id",
    href: "mailto:hello@mulaiplus.id",
    icon: Mail,
    color: "text-blue-600",
    bg: "bg-blue-50 hover:bg-blue-100",
    ring: "ring-blue-200",
  },
];

export function ContactSupport() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {/* Contact Card */}
      {isOpen && (
        <div
          className={cn(
            "fade-in slide-in-from-bottom-4 zoom-in-95 w-72 origin-bottom-right animate-in duration-200",
            "rounded-2xl border border-gray-200 bg-white shadow-xl",
          )}
        >
          {/* Header */}
          <div className="border-gray-100 border-b px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange/10">
                <MessageCircleHeart className="h-4 w-4 text-brand-orange" />
              </div>
              <div>
                <p className="font-manrope font-semibold text-sm text-text-main">Hubungi Kami</p>
                <p className="font-manrope text-text-muted-custom text-xs">Ada pertanyaan? Kami siap bantu!</p>
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-1 p-3">
            {CONTACT_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.id}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-3 transition-all", channel.bg, "group")}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition-all",
                      channel.ring,
                      "group-hover:ring-2",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", channel.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-manrope font-medium text-sm", channel.color)}>{channel.label}</p>
                    <p className="truncate font-manrope text-text-muted-custom text-xs">{channel.description}</p>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-gray-100 border-t px-5 py-3">
            <p className="text-center font-manrope text-[11px] text-text-muted-custom/70">
              Kami akan merespon secepatnya, ya!
            </p>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative h-14 w-14 rounded-full shadow-lg transition-all duration-200",
          "hover:scale-105 active:scale-95",
          isOpen ? "bg-red-500 text-white hover:bg-red-600" : "bg-brand-navy text-white hover:bg-brand-navy/90",
        )}
        aria-label={isOpen ? "Tutup kontak" : "Hubungi support"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircleHeart className="h-6 w-6" />}
      </Button>
    </div>
  );
}
