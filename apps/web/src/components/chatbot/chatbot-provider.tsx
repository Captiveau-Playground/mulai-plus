"use client";

import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import { useFeatures } from "@/lib/features-context";

/**
 * Chatbot feature flag provider.
 *
 * Reads flag from FeaturesContext (shared React context).
 * When admin toggles, the context updates → this re-renders instantly.
 */
export function ChatbotProvider() {
  const { features } = useFeatures();

  if (!features.chatbot_enabled) return null;

  return <ChatbotWidget />;
}
