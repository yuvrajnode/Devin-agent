import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-panel border bg-surface-base",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-10 shrink-0 items-center gap-3 border-b bg-surface-raised/60 px-3",
        className,
      )}
    >
      <span className="label text-content-secondary">{title}</span>
      {meta ? <span className="truncate text-2xs text-content-muted">{meta}</span> : null}
      {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("hide-scrollbar min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}
