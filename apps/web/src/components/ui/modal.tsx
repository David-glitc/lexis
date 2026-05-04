"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import clsx from "classnames";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl"
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  size = "md"
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={clsx(
          "relative w-full mx-4 rounded-lg bg-background border border-white/10 shadow-2xl",
          "max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-background/95 px-6 py-4">
            {title && <h2 className="text-lg font-display font-semibold">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
