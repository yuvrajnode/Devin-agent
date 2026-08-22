"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/site/logo";

/**
 * Route-level boundary. The digest is surfaced deliberately: it is the only
 * handle a user can quote that maps to the server-side stack trace.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[devin] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="text-content-primary" />
      <p className="label mt-10 text-status-fail">Unhandled error</p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        Something broke on this page.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-content-secondary">
        The run was not saved. Retrying re-renders this route without reloading
        the whole application.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-2xs text-content-muted">
          digest {error.digest}
        </p>
      ) : null}
      <Button variant="primary" size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
