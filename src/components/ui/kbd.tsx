import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-hair border",
        "bg-surface-raised px-1 font-mono text-2xs text-content-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
