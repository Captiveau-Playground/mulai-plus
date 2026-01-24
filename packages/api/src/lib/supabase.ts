import { createClient } from "@supabase/supabase-js";

// Access process.env directly since these might not be in the server env schema yet
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function getPathFromUrl(url: string, bucket: string): string | null {
  try {
    // Check if it's a Supabase URL
    if (!url.includes(supabaseUrl || "supabase.co")) return null;

    // Simple extraction assuming standard Supabase Storage URL structure
    // .../storage/v1/object/public/<bucket>/<path>
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(marker);

    if (index !== -1) {
      return url.substring(index + marker.length);
    }

    return null;
  } catch (_e) {
    return null;
  }
}
