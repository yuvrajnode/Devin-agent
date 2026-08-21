import Link from "next/link";
import { Wordmark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="text-content-primary" />
      <p className="label mt-10">Error 404</p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        No route matches that path.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-content-secondary">
        The page you asked for does not exist. The workspace is where the agent
        actually lives.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-hair border border-line-strong px-4 text-sm font-medium transition-colors hover:border-content-muted"
        >
          Back home
        </Link>
        <Link
          href="/workspace"
          className="inline-flex h-10 items-center rounded-hair bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Open workspace
        </Link>
      </div>
    </main>
  );
}
