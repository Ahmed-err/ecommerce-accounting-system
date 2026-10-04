"use client";

import { useEffect } from "react";
import ErrorState from "@/components/shell/ErrorState";

export default function StoreError({ error, reset }) {
  useEffect(() => {
    console.error("Store error:", error?.digest || error?.message);
  }, [error]);
  return <ErrorState onRetry={reset} />;
}
