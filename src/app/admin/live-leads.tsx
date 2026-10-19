"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { leadsStampAction } from "./leads/actions";

/**
 * Refreshes the page when a new Seller registration comes in, so the team doesn't have to reload: checks
 * every 10 seconds while the tab is visible, and at once when it is shown again.
 */
export function LiveLeads({ stamp }: { stamp: string }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if ((await leadsStampAction()) !== stamp && !stopped) router.refresh();
      } catch {
        // Offline for a moment: try again next time.
      }
    };
    const timer = setInterval(check, 10_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [stamp, router]);
  return null;
}
