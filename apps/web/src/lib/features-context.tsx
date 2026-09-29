"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { client } from "@/lib/client";

interface Features {
  chatbot_enabled: boolean;
}

interface FeaturesContextValue {
  features: Features;
  refresh: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextValue>({
  features: { chatbot_enabled: false },
  refresh: async () => {},
});

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features>({ chatbot_enabled: false });

  const refresh = async () => {
    try {
      const flags = await client.features.get();
      setFeatures({ chatbot_enabled: flags.chatbot_enabled === true });
    } catch {
      setFeatures({ chatbot_enabled: false });
    }
  };

  useEffect(() => {
    refresh();
    // Poll setiap 30s — sync antar tab tanpa perlu refresh manual
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return <FeaturesContext.Provider value={{ features, refresh }}>{children}</FeaturesContext.Provider>;
}

export function useFeatures() {
  return useContext(FeaturesContext);
}
