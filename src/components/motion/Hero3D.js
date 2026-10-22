"use client";

import { useEffect, useRef, useState } from "react";

// Decides whether this visitor gets the WebGL scene, then loads it after the page is idle.
// Skipped (the hero's photo cards and gradient stay as they are) when the visitor prefers
// reduced motion, has Data Saver on or a 2G connection, reports under 3 GB of memory, has no
// WebGL, or the GPU is a software renderer. three.js is a separate chunk that only these
// devices download.
//
// CPU core count is NOT a gate: iPhones and iPads always report 2 cores (WebKit caps it to
// resist fingerprinting), so gating on cores switched the scene off for every iPhone. A low
// count only selects the lighter version.
function isSoftwareGpu(gl) {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

function canRun3D() {
  if (typeof window === "undefined") return { ok: false };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { ok: false };
  const conn = navigator.connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || "")) return { ok: false };
  const mem = navigator.deviceMemory ?? 4; // Safari and Firefox don't report memory
  if (mem < 3) return { ok: false };
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return { ok: false };
    // Software GPUs (no graphics acceleration) would make the page sluggish. Automated
    // screenshot runs set window.__forceHero3D to render it on their software GPU anyway.
    if (isSoftwareGpu(gl) && !window.__forceHero3D) return { ok: false };
  } catch {
    return { ok: false };
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return { ok: true, narrow, lowPower: narrow || mem < 6 || cores < 4 };
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
