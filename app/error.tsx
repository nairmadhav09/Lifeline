"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** Error boundary for routes outside the app shell (login, onboarding). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-page-wash px-4">
      <EmptyState
        className="w-full max-w-md"
        icon={TriangleAlert}
        title="Something went wrong"
        description="This is usually temporary. Your data is safe, so try again in a moment."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
