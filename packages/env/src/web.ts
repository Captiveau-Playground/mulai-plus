import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string(),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    NEXT_PUBLIC_GA_DEBUG_MODE: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_GA_DEBUG_MODE: process.env.NEXT_PUBLIC_GA_DEBUG_MODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
});
