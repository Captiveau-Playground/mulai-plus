"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

if (process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof NextThemesProvider>>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
