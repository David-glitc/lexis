import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "classnames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-full transition-all duration-200 font-body font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 gap-2";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[#ffffff] to-[#e9f8e6] text-black border border-[#d6ecd2] shadow-[0_8px_20px_rgba(106,191,94,0.25)] hover:shadow-[0_10px_26px_rgba(106,191,94,0.35)] hover:-translate-y-0.5",
  secondary:
    "bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-white hover:from-white/[0.16] hover:to-white/[0.06] border border-white/[0.12] shadow-[0_6px_16px_rgba(0,0,0,0.25)]",
  ghost:
    "bg-transparent text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.12]",
  success:
    "bg-gradient-to-b from-[#538d4e] to-[#4a7a44] text-white border border-[#6a9f60] shadow-[0_8px_20px_rgba(83,141,78,0.25)] hover:shadow-[0_10px_26px_rgba(83,141,78,0.35)] hover:-translate-y-0.5",
  danger:
    "bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-white border border-[#f87171] shadow-[0_8px_20px_rgba(239,68,68,0.25)] hover:shadow-[0_10px_26px_rgba(239,68,68,0.35)] hover:-translate-y-0.5",
  outline:
    "bg-transparent text-white border border-white/[0.3] hover:bg-white/[0.05] hover:border-white/[0.5]"
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "text-xs px-3 py-1.5 min-h-[32px]",
  sm: "text-xs px-5 py-2 min-h-[36px]",
  md: "text-sm px-6 py-2.5 min-h-[44px]",
  lg: "text-base px-8 py-3.5 min-h-[48px]"
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        (loading || disabled) && "opacity-60 cursor-not-allowed",
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
