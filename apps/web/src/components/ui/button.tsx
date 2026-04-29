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
  "inline-flex items-center justify-center rounded-full transition-all duration-200 font-body font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 hover:-translate-y-0.5";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[#ffffff] to-[#e9f8e6] text-black border border-[#d6ecd2] shadow-[0_8px_20px_rgba(106,191,94,0.25)] hover:shadow-[0_10px_26px_rgba(106,191,94,0.35)]",
  secondary:
    "bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-white hover:from-white/[0.16] hover:to-white/[0.06] border border-white/[0.12] shadow-[0_6px_16px_rgba(0,0,0,0.25)]",
  ghost:
    "bg-transparent text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.12]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-5 py-2 min-h-[36px]",
  md: "text-sm px-6 py-2.5 min-h-[42px]",
  lg: "text-base px-8 py-3.5 min-h-[48px]"
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
