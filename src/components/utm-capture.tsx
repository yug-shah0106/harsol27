"use client";

import { useEffect } from "react";
import { pickUtm, UTM_STORAGE_KEY } from "@/lib/utm";

/** Remembers the campaign tags of the link this visit started from (for the Get started form). Renders nothing. */
export function UtmCapture() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const utm = pickUtm((key) => query.get(key));
    try {
      if (utm) sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    } catch {
      // Storage blocked (private mode, settings): the enquiry simply has no campaign.
    }
  }, []);
  return null;
}
