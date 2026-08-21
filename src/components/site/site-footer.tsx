import Link from "next/link";
import { Wordmark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <div className="flex flex-col gap-2">
          <Wordmark className="text-content-primary" />
          <p className="max-w-md text-sm text-content-secondary">
            A demonstration of agent architecture: planning, sandboxed tool use,
            an event-sourced UI, and a reviewable changeset.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:ml-auto">
          <Link
            href="/workspace"
            className="text-sm text-content-secondary transition-colors hover:text-content-primary"
          >
            Workspace
          </Link>
          <a
            href="https://github.com/yuvrajnode/Devin"
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-content-secondary transition-colors hover:text-content-primary"
          >
            Source
          </a>
          <span className="label">Built by yuvrajnode</span>
        </div>
      </div>
    </footer>
  );
}
