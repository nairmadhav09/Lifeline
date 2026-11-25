"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({
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
    <EmptyState
      icon={TriangleAlert}
      title="Something didn't load"
      description="This is usually temporary. Your data is safe, so try again in a moment."
      action={
        <Button variant="outline" onClick={reset}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      }
    />
  );
}
