import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "./logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#tools", label: "Capabilities" },
  { href: "#architecture", label: "Architecture" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-surface-canvas/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-5 sm:px-8">
        <Link href="/" className="text-content-primary">
          <Wordmark />
        </Link>

        <ul className="ml-2 hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-content-secondary transition-colors hover:text-content-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/workspace"
            className="inline-flex h-8 items-center rounded-hair border border-line-strong bg-surface-raised px-3 text-sm font-medium transition-colors hover:border-content-muted"
          >
            Open workspace
          </Link>
        </div>
      </nav>
    </header>
  );
}
