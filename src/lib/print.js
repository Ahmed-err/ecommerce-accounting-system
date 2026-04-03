"use client";

export function printElementById(id) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const target = document.getElementById(id);
  if (!target) {
    window.print();
    return;
  }

  document.body.classList.add("print-target-mode");
  target.classList.add("print-target-active");

  const mql = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;
  let cleaned = false;
  const onMediaChange = () => {
    if (mql && !mql.matches) cleanup();
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove("print-target-mode");
    target.classList.remove("print-target-active");
    window.removeEventListener("afterprint", cleanup);
    if (mql?.removeEventListener) {
      mql.removeEventListener("change", onMediaChange);
    } else if (mql?.removeListener) {
      mql.removeListener(onMediaChange);
    }
  };

  if (mql?.addEventListener) {
    mql.addEventListener("change", onMediaChange);
  } else if (mql?.addListener) {
    mql.addListener(onMediaChange);
  }

  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 4000);
}
