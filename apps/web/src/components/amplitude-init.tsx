"use client";

import * as amplitude from "@amplitude/unified";
import { useEffect } from "react";

const AMPLITUDE_API_KEY = "4b58c01dd72032ca4a3e30482f149d27";

let initialized = false;

export function AmplitudeInit() {
  useEffect(() => {
    // Hanya jalan di production
    if (process.env.NODE_ENV !== "production") return;
    if (initialized) return;
    initialized = true;

    amplitude.initAll(AMPLITUDE_API_KEY, {
      analytics: {
        autocapture: true,
      },
      sessionReplay: {
        sampleRate: 1,
      },
    });
  }, []);

  return null;
}
