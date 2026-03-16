import type { ReactNode } from "react";

interface MobileShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function MobileShell({ header, footer, children }: MobileShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#060606] relative noise">
      <div className="orb w-[300px] h-[300px] bg-[#538d4e] top-[-80px] right-[-100px]" style={{ opacity: 0.2 }} />
      {header && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#060606]/80 border-b border-white/[0.06] px-5 pb-3 pt-4">
          {header}
        </header>
      )}
      <main className="flex-1 px-5 pb-6 pt-4 relative z-10">{children}</main>
      {footer && (
        <footer className="sticky bottom-0 z-40 backdrop-blur-xl bg-[#060606]/80 border-t border-white/[0.06] px-5 pb-4 pt-3">
          {footer}
        </footer>
      )}
    </div>
  );
}
