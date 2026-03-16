export function LexisLogo({ size = 32 }: { size?: number }) {
  const s = size;
  const u = s / 10;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Abstract "L" made of stacked tile blocks — word puzzle reference */}
      <rect x="4" y="4" width="10" height="10" rx="2" fill="white" />
      <rect x="4" y="16" width="10" height="10" rx="2" fill="white" />
      <rect x="4" y="28" width="10" height="10" rx="2" fill="#538d4e" />
      <rect x="16" y="28" width="10" height="10" rx="2" fill="white" />
      <rect x="28" y="28" width="8" height="10" rx="2" fill="white" opacity="0.3" />
      {/* Accent dot — top right, represents precision */}
      <circle cx="33" cy="9" r="4" fill="#538d4e" opacity="0.6" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LexisLogo size={32} />
      <span className="font-display text-lg font-bold tracking-[0.15em] text-white">LEXIS</span>
    </div>
  );
}

export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large version with glow effect for hero sections */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="8" y="8" width="18" height="18" rx="3" fill="white" />
      <rect x="8" y="30" width="18" height="18" rx="3" fill="white" />
      <rect x="8" y="52" width="18" height="18" rx="3" fill="#538d4e" filter="url(#glow)" />
      <rect x="30" y="52" width="18" height="18" rx="3" fill="white" />
      <rect x="52" y="52" width="18" height="18" rx="3" fill="white" opacity="0.2" />
      <circle cx="65" cy="17" r="7" fill="#538d4e" opacity="0.5" />
      <circle cx="52" cy="8" r="3" fill="#b59f3b" opacity="0.4" />
    </svg>
  );
}
