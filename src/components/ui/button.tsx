import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-solid text-white border-transparent hover:bg-accent-solid-hover active:translate-y-px",
  secondary:
    "bg-surface-raised text-content-primary border-line-strong hover:border-content-muted hover:bg-surface-overlay",
  ghost:
    "bg-transparent text-content-secondary border-transparent hover:text-content-primary hover:bg-surface-raised",
  danger:
    "bg-transparent text-status-fail border-line-strong hover:bg-status-fail/10 hover:border-status-fail/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-2xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-hair border font-medium",
        "transition-colors duration-150 select-none",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
