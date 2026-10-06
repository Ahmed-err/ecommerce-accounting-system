"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX = 8; // degrees

// Tilts its child toward the pointer (mouse/pen only; touch scrolls normally).
// Writes CSS variables, so React never re-renders while the pointer moves.
export default function Tilt3D({ children, className, as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  const frame = useRef(0);

  const onMove = (e) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.dataset.active = "";
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty("--sx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--sy", `${(y * 100).toFixed(1)}%`);
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    delete el.dataset.active;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <Tag ref={ref} className={cn("tilt3d", className)} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
    </Tag>
  );
}
