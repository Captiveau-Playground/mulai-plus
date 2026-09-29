"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/orpc";

import { AnalyticsProvider } from "./analytics-provider";

import { GooeyToasterMount } from "./ui/goey-toaster";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
      <ReactQueryDevtools />
      <GooeyToasterMount />
    </QueryClientProvider>
  );
}
