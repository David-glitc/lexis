import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "classnames";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-full transition-all font-body font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-black hover:bg-zinc-100 shadow-[0_0_20px_rgba(255,255,255,0.08)]",
  secondary:
    "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]",
  ghost:
    "bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-4 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5"
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
