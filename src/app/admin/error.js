"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({ error, reset }) {
  useEffect(() => {
    const details = {
      name: error?.name || "UnknownError",
      message: error?.message || "No message",
      digest: error?.digest || null,
      stack: error?.stack || null,
    };
    console.error("Admin error:", details, error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">Dashboard Error</h1>
        <p className="text-gray-400">Something went wrong loading this page.</p>
        <Button onClick={reset} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
          Try Again
        </Button>
      </div>
    </div>
  );
}
