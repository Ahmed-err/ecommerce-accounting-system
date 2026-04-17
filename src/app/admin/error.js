"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error("Admin error:", error?.digest || error?.message);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Error</h1>
        <p className="text-muted-foreground">Something went wrong loading this page.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
            Try Again
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
