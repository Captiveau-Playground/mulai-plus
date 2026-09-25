"use client";

import { usePathname } from "next/navigation";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import { useFeatures } from "@/lib/features-context";

/**
 * Chatbot feature flag provider.
 *
 * Reads flag from FeaturesContext (shared React context).
 * When admin toggles, the context updates → this re-renders instantly.
 * Floating widget disembunyikan di halaman yang sudah punya chat penuh
 * (Asisten AI + trial) supaya tidak ada dua antarmuka chat sekaligus.
 */
export function ChatbotProvider() {
  const { features } = useFeatures();
  const pathname = usePathname();

  if (!features.chatbot_enabled) return null;
  if (pathname.includes("/assistant") || pathname.includes("/trial/chat")) return null;

  return <ChatbotWidget />;
}
