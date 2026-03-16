"use client";

import { type ReactNode } from "react";

interface AvatarSvgProps {
  size?: number;
  className?: string;
}

interface AvatarOption {
  id: string;
  name: string;
  svg: (props: AvatarSvgProps) => ReactNode;
}

const G = "#538d4e";
const Y = "#b59f3b";
const D = "#3a3a3c";
const W = "white";
const B = "#060606";

function Wrap({ size = 24, className, children }: AvatarSvgProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {children}
    </svg>
  );
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "av-01",
    name: "Ninja",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="12" r="11" fill={D} />
        <rect x="3" y="9" width="18" height="4" rx="2" fill={B} />
        <circle cx="9" cy="11" r="1.5" fill={W} />
        <circle cx="15" cy="11" r="1.5" fill={W} />
        <path d="M19 10l3-3" stroke={D} strokeWidth="1.5" />
      </Wrap>
    ),
  },
  {
    id: "av-02",
    name: "Fox",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="13" r="10" fill={Y} />
        <polygon points="4,8 7,2 10,8" fill={Y} stroke={B} strokeWidth="0.5" />
        <polygon points="14,8 17,2 20,8" fill={Y} stroke={B} strokeWidth="0.5" />
        <circle cx="9" cy="12" r="1.5" fill={B} />
        <circle cx="15" cy="12" r="1.5" fill={B} />
        <ellipse cx="12" cy="16" rx="3" ry="2" fill={W} />
        <circle cx="12" cy="15.5" r="1" fill={B} />
      </Wrap>
    ),
  },
  {
    id: "av-03",
    name: "Astronaut",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="12" r="11" fill={W} />
        <circle cx="12" cy="12" r="8" fill="#1a1a2e" />
        <circle cx="10" cy="11" r="1.2" fill={W} />
        <circle cx="14" cy="11" r="1.2" fill={W} />
        <path d="M9.5 14.5q2.5 2 5 0" stroke={W} strokeWidth="0.8" fill="none" />
        <circle cx="18" cy="6" r="1.5" fill={G} />
      </Wrap>
    ),
  },
  {
    id: "av-04",
    name: "Robot",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <rect x="3" y="5" width="18" height="16" rx="3" fill={D} />
        <rect x="6" y="9" width="4" height="3" rx="1" fill={G} />
        <rect x="14" y="9" width="4" height="3" rx="1" fill={G} />
        <rect x="8" y="15" width="8" height="2" rx="1" fill={W} />
        <rect x="10" y="2" width="4" height="4" rx="2" fill={D} />
        <circle cx="12" cy="3" r="1" fill={Y} />
      </Wrap>
    ),
  },
  {
    id: "av-05",
    name: "Ghost",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <path d="M6 22v-10a6 6 0 0 1 12 0v10l-2-2-2 2-2-2-2 2-2-2z" fill={W} opacity="0.9" />
        <circle cx="10" cy="11" r="1.5" fill={B} />
        <circle cx="14" cy="11" r="1.5" fill={B} />
        <ellipse cx="12" cy="15" rx="1.5" ry="1" fill={D} />
      </Wrap>
    ),
  },
  {
    id: "av-06",
    name: "Alien",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <ellipse cx="12" cy="13" rx="9" ry="10" fill={G} />
        <ellipse cx="8" cy="10" rx="3" ry="2" fill={B} />
        <ellipse cx="16" cy="10" rx="3" ry="2" fill={B} />
        <ellipse cx="8" cy="10" rx="1.5" ry="1" fill={W} />
        <ellipse cx="16" cy="10" rx="1.5" ry="1" fill={W} />
        <ellipse cx="12" cy="17" rx="1.5" ry="0.8" fill={B} />
      </Wrap>
    ),
  },
  {
    id: "av-07",
    name: "Cat",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="14" r="9" fill={D} />
        <polygon points="5,9 3,1 10,7" fill={D} />
        <polygon points="19,9 21,1 14,7" fill={D} />
        <circle cx="9" cy="12" r="1.5" fill={Y} />
        <circle cx="15" cy="12" r="1.5" fill={Y} />
        <circle cx="9" cy="12" r="0.7" fill={B} />
        <circle cx="15" cy="12" r="0.7" fill={B} />
        <ellipse cx="12" cy="15.5" rx="1" ry="0.6" fill="#f08080" />
        <path d="M11 16.5q1 1.2 2 0" stroke={W} strokeWidth="0.5" fill="none" />
      </Wrap>
    ),
  },
  {
    id: "av-08",
    name: "Bear",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="6" cy="6" r="4" fill={Y} />
        <circle cx="18" cy="6" r="4" fill={Y} />
        <circle cx="12" cy="13" r="10" fill={Y} />
        <circle cx="9" cy="11" r="1.5" fill={B} />
        <circle cx="15" cy="11" r="1.5" fill={B} />
        <ellipse cx="12" cy="15" rx="3" ry="2.5" fill="#d4a84b" />
        <ellipse cx="12" cy="14.5" rx="1.2" ry="0.8" fill={B} />
      </Wrap>
    ),
  },
  {
    id: "av-09",
    name: "Wizard",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="16" r="8" fill="#6b5b95" />
        <polygon points="12,0 5,12 19,12" fill="#6b5b95" />
        <circle cx="12" cy="4" r="1.2" fill={Y} />
        <circle cx="9" cy="15" r="1.3" fill={W} />
        <circle cx="15" cy="15" r="1.3" fill={W} />
        <circle cx="9" cy="15" r="0.6" fill={B} />
        <circle cx="15" cy="15" r="0.6" fill={B} />
        <path d="M8 19q4 3 8 0" stroke={W} strokeWidth="0.8" fill="none" />
      </Wrap>
    ),
  },
  {
    id: "av-10",
    name: "Knight",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="12" cy="14" r="9" fill={D} />
        <path d="M4 10h16v-3q-8-5-16 0z" fill={D} stroke={W} strokeWidth="0.5" />
        <rect x="4" y="10" width="16" height="1.5" fill={Y} />
        <circle cx="9" cy="14" r="1.3" fill={W} />
        <circle cx="15" cy="14" r="1.3" fill={W} />
        <rect x="8" y="18" width="8" height="1.5" rx="0.75" fill={W} opacity="0.6" />
      </Wrap>
    ),
  },
  {
    id: "av-11",
    name: "Panda",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <circle cx="5" cy="5" r="4" fill={B} />
        <circle cx="19" cy="5" r="4" fill={B} />
        <circle cx="12" cy="13" r="10" fill={W} />
        <ellipse cx="8" cy="11" rx="3" ry="2.5" fill={B} />
        <ellipse cx="16" cy="11" rx="3" ry="2.5" fill={B} />
        <circle cx="8" cy="11" r="1" fill={W} />
        <circle cx="16" cy="11" r="1" fill={W} />
        <ellipse cx="12" cy="16" rx="2" ry="1.2" fill={B} />
      </Wrap>
    ),
  },
  {
    id: "av-12",
    name: "Owl",
    svg: ({ size, className }: AvatarSvgProps) => (
      <Wrap size={size} className={className}>
        <ellipse cx="12" cy="14" rx="10" ry="9" fill="#5c4033" />
        <circle cx="8" cy="11" r="3.5" fill={Y} />
        <circle cx="16" cy="11" r="3.5" fill={Y} />
        <circle cx="8" cy="11" r="1.5" fill={B} />
        <circle cx="16" cy="11" r="1.5" fill={B} />
        <polygon points="12,13 10.5,15.5 13.5,15.5" fill={Y} />
        <path d="M5 7l-2-4" stroke="#5c4033" strokeWidth="1.5" />
        <path d="M19 7l2-4" stroke="#5c4033" strokeWidth="1.5" />
      </Wrap>
    ),
  },
];

const avatarMap = new Map(AVATAR_OPTIONS.map((a) => [a.id, a]));

export interface UserAvatarProps {
  avatarId?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ avatarId, displayName, size = 32, className = "" }: UserAvatarProps) {
  const match = avatarId ? avatarMap.get(avatarId) : undefined;

  if (match) {
    return match.svg({ size, className });
  }

  const letter = displayName?.trim()?.[0]?.toUpperCase() ?? "?";
  const fontSize = Math.round(size * 0.45);

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 font-display font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {letter}
    </div>
  );
}

export interface AvatarPickerProps {
  selected: string | null;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {AVATAR_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
            selected === opt.id
              ? "border-[#538d4e] bg-[#538d4e]/10"
              : "border-white/[0.06] bg-white/[0.03] hover:border-white/20"
          }`}
        >
          {opt.svg({ size: 48 })}
          <span className="text-[10px] text-zinc-500 font-mono">{opt.name}</span>
        </button>
      ))}
    </div>
  );
}
