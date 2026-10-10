"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

// The 3D library (~the size budget in tests/e2e/home-3d.spec.ts) is fetched only when this decides to show it.
const KiteScene = dynamic(() => import("./kite-scene"), { ssr: false });

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** No 3D for reduced motion, data saver, 2G, low-memory or low-core devices, or without WebGL. */
function canShow3d(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { connection?: NetworkInformation; deviceMemory?: number };
  if (nav.connection?.saveData || /2g$/.test(nav.connection?.effectiveType ?? "")) return false;
  if ((nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency || 8) < 4) return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext(); // only a test: give the context back
    return !!gl;
  } catch {
    return false;
  }
}

/** If the 3D scene fails for any reason, the static picture underneath simply stays. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Old-city rooftops along the bottom, where the kites are flown from: [x, width, height] in a 1000×140 box.
const BACK_ROOFS = [[30, 120, 78], [180, 90, 92], [300, 140, 70], [470, 100, 96], [600, 130, 82], [760, 120, 90], [880, 120, 76]];
const FRONT_ROOFS = [[0, 90, 48], [85, 70, 62], [150, 110, 40], [255, 60, 70], [310, 90, 52], [395, 120, 36], [510, 70, 58], [575, 95, 44], [665, 60, 74], [720, 110, 46], [825, 80, 60], [900, 100, 42]];
const roofs = (blocks: number[][]) => blocks.map(([x, w, h]) => `M${x},140V${140 - h!}H${x! + w!}V140Z`).join("");
const DETAILS = "M268,70h22v-14h-22Z M672,66Q695,18 718,66Z M695,42V30l11,4-11,4Z M430,104a25,25 0 0 1 50,0Z"; // water tank, temple spire and flag, dome

/** The skyline along the bottom of the hero's sky (decorative; the kites' strings run down behind it). */
export function Rooftops({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 140" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <path d={roofs(BACK_ROOFS)} className="fill-[#dde3d6] dark:fill-[#2a3027]" />
      <path d={roofs(FRONT_ROOFS) + DETAILS} className="fill-[#c3cdb9] dark:fill-[#353d31]" />
    </svg>
  );
}

/**
 * The hero's kites: `poster` (server-rendered SVG) first; once the page has loaded and the browser is
 * idle, the live 3D scene is fetched and fades in over it. Transparent, over the section's sky
 * (`.kite-sky`), and sized by `className`. Decorative, so hidden from screen readers.
 */
export function HeroSky({ poster, className }: { poster: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (!canShow3d()) return;
    let idle = 0;
    const hasIdle = typeof window.requestIdleCallback === "function"; // older Safari lacks it
    const start = () => {
      idle = hasIdle ? requestIdleCallback(() => setLoad(true), { timeout: 2000 }) : window.setTimeout(() => setLoad(true), 500);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    // Stop drawing while the hero is scrolled out of view.
    const observer = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting));
    if (box.current) observer.observe(box.current);
    return () => {
      window.removeEventListener("load", start);
      if (hasIdle) cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={box} aria-hidden="true" data-3d={ready ? "live" : "poster"} className={className}>
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>{poster}</div>
      {load && (
        <Fallback>
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
            <KiteScene active={onScreen} onReady={() => setReady(true)} />
          </div>
        </Fallback>
      )}
    </div>
  );
}
