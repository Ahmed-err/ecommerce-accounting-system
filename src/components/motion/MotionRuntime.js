"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Store-wide motion runtime (public pages only).
// - Browsers with CSS scroll timelines (Chrome, Edge) animate .reveal* in pure CSS.
// - Others (Safari, Firefox) get the same reveals through one IntersectionObserver that
//   adds .in-view. Content is visible by default: the hidden start state only applies once
//   this script has added html.motion-io, so a script failure never hides anything. It only
//   ever adds the .in-view class (stagger delays are in CSS), never React-owned attributes.
// - Visitors who ask for reduced motion get no reveals at all.
const TARGETS = ".reveal, .reveal-3d, .reveal-stagger > *, .reveal-flip > *";

export default function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (window.CSS?.supports?.("animation-timeline: view()")) return undefined;
    if (!("IntersectionObserver" in window)) return undefined;

    // Start after the page has loaded and gone idle, so React has finished hydrating every
    // section first: changing a server-rendered element before it hydrates causes a mismatch.
    const seen = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    const scan = (scope) => {
      scope.querySelectorAll?.(TARGETS).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Already on screen: show it as is, no animation, so nothing flickers on start.
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in-view");
        else io.observe(el);
      });
    };
    // Grids that load more products or filter client-side add elements later.
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n.nodeType === 1 && scan(n.parentElement || n));
    });

    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      scan(document);
      root.classList.add("motion-io");
      mo.observe(document.getElementById("content") || document.body, { childList: true, subtree: true });
    };
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    let handle;
    const onLoad = () => (handle = idle(begin, { timeout: 1500 }));
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      // Next page starts fully visible until its own scan has marked what is on screen.
      root.classList.remove("motion-io");
      window.removeEventListener("load", onLoad);
      if (handle) cancelIdle(handle);
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden="true" />;
}
