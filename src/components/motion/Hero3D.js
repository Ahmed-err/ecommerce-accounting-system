"use client";

import { useEffect, useRef, useState } from "react";

// Decides whether this visitor gets the WebGL scene, then loads it after the page is idle.
// Skipped (the hero's photo cards and gradient stay as they are) when the visitor prefers
// reduced motion, has Data Saver on, a slow connection, little memory or few CPU cores, or
// no WebGL. three.js is a separate chunk that only these capable devices download.
function canRun3D() {
  if (typeof window === "undefined") return { ok: false };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { ok: false };
  const conn = navigator.connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || "")) return { ok: false };
  const mem = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mem < 3 || cores < 4) return { ok: false };
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) return { ok: false };
  } catch {
    return { ok: false };
  }
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return { ok: true, narrow, lowPower: narrow || mem < 6 || cores < 6 };
}

export default function Hero3D({ className, rtl = false }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { ok, lowPower, narrow } = canRun3D();
    if (!ok || !ref.current) return undefined;
    let cleanup;
    let cancelled = false;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 600));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const handle = idle(async () => {
      try {
        const { mountHeroScene } = await import("@/components/motion/HeroScene3D");
        if (cancelled || !ref.current) return;
        cleanup = mountHeroScene(ref.current, { lowPower, rtl, narrow, onReady: () => setReady(true) });
      } catch (error) {
        console.warn("Hero 3D scene unavailable:", error?.message || error);
      }
    });
    return () => {
      cancelled = true;
      cancelIdle(handle);
      cleanup?.();
    };
  }, [rtl]);

  return <canvas ref={ref} aria-hidden="true" className={`hero-3d ${className || ""}`} data-ready={ready ? "" : undefined} />;
}
