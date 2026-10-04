"use client";

import { useEffect } from "react";
import ErrorState from "@/components/shell/ErrorState";

export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error("Root error:", error?.digest || error?.message);
  }, [error]);
  return <ErrorState onRetry={reset} />;
}
