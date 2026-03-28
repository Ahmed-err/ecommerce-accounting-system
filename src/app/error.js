"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
        <Button onClick={reset} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
          Try Again
        </Button>
      </div>
    </div>
  );
}
