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

  const cleanup = () => {
    document.body.classList.remove("print-target-mode");
    target.classList.remove("print-target-active");
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 1200);
}
