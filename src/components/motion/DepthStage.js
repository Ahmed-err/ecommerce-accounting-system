"use client";

import { useEffect, useRef } from "react";

// Sets --px/--py (pointer, -1..1) and --scroll (0..1 while the stage scrolls away)
// on its element; children with .depth-layer and --depth move by those amounts.
export default function DepthStage({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const set = (fn) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fn);
    };
    const onScroll = () =>
      set(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--scroll", Math.min(1, Math.max(0, -r.top / r.height)).toFixed(3));
      });
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      set(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
