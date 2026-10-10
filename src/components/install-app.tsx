"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * "Install the app", only when the browser offers it (Chrome, Edge, Samsung Internet) and the app is
 * not installed yet. Safari on iPhone has no install prompt, so it gets the steps instead.
 */
export function InstallApp() {
  const [offer, setOffer] = useState<InstallPromptEvent | null>(null);
  const [iphoneSteps, setIphoneSteps] = useState(false);

  useEffect(() => {
    const onOffer = (event: Event) => {
      event.preventDefault(); // no automatic banner; the visitor chooses
      setOffer(event as InstallPromptEvent);
    };
    const onInstalled = () => setOffer(null);
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);

    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const iphoneSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    if (iphoneSafari && !installed) setIphoneSteps(true); // eslint-disable-line react-hooks/set-state-in-effect -- browser-only facts, known after mount
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (offer) {
    return (
      <button
        type="button"
        className="w-fit font-medium underline"
        onClick={async () => {
          await offer.prompt();
          await offer.userChoice;
          setOffer(null); // the prompt can only be used once
        }}
      >
        Install the Harsol27 app
      </button>
    );
  }
  if (iphoneSteps) return <p className="text-muted-foreground">Install on iPhone: tap Share, then “Add to Home Screen”.</p>;
  return null;
}
