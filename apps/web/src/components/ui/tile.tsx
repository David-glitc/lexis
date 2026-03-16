import type { ReactNode } from "react";
import clsx from "classnames";

export type TileState = "empty" | "tbd" | "correct" | "present" | "absent";

export interface TileProps {
  state?: TileState;
  children?: ReactNode;
  animDelay?: number;
  flip?: boolean;
  bounce?: boolean;
  pop?: boolean;
}

export function Tile({ state = "empty", children, animDelay = 0, flip, bounce, pop }: TileProps) {
  const hasLetter = !!children && String(children).trim() !== "";

  const bg: Record<TileState, string> = {
    empty: "bg-transparent",
    tbd: "bg-transparent",
    correct: "bg-[#538d4e]",
    present: "bg-[#b59f3b]",
    absent: "bg-[#3a3a3c]"
  };

  const border: Record<TileState, string> = {
    empty: "border-2 border-[#3a3a3c]",
    tbd: "border-2 border-[#565758]",
    correct: "border-0",
    present: "border-0",
    absent: "border-0"
  };

  const text: Record<TileState, string> = {
    empty: "text-white",
    tbd: "text-white",
    correct: "text-white",
    present: "text-white",
    absent: "text-white"
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center w-[62px] h-[62px] text-[2rem] font-bold uppercase leading-none select-none",
        bg[state],
        border[state],
        text[state],
        flip && "animate-flip",
        bounce && "animate-bounce-win",
        pop && "animate-pop"
      )}
      style={{
        animationDelay: `${animDelay}ms`,
        animationFillMode: "both"
      }}
    >
      {children}
    </div>
  );
}
