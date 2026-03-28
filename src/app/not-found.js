import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-8xl font-black text-amber-500">404</h1>
        <h2 className="text-2xl font-bold text-foreground">Page Not Found</h2>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
