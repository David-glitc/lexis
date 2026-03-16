import clsx from "classnames";

const ROW1 = "QWERTYUIOP".split("");
const ROW2 = "ASDFGHJKL".split("");
const ROW3 = "ZXCVBNM".split("");

export type KeyState = "default" | "correct" | "present" | "absent";
export type KeyboardState = Record<string, KeyState>;

export interface KeyboardProps {
  state?: KeyboardState;
  onKey: (key: string) => void;
}

const STATE_CLASSES: Record<KeyState, string> = {
  default: "bg-[#818384] text-white",
  correct: "bg-[#538d4e] text-white",
  present: "bg-[#b59f3b] text-white",
  absent: "bg-[#3a3a3c] text-[#868686]"
};

function Key({
  label,
  display,
  state,
  wide,
  onClick
}: {
  label: string;
  display?: string;
  state: KeyState;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center rounded font-bold uppercase select-none cursor-pointer",
        "active:animate-press transition-[background-color] duration-100",
        STATE_CLASSES[state],
        wide ? "flex-[1.5] text-xs h-[58px] px-1" : "flex-1 text-sm h-[58px]"
      )}
    >
      {display ?? label}
    </button>
  );
}

export function Keyboard({ state, onKey }: KeyboardProps) {
  const s = state ?? {};
  const get = (ch: string): KeyState => s[ch.toLowerCase()] ?? "default";

  return (
    <div className="w-full max-w-[500px] mx-auto select-none">
      <div className="flex gap-[6px] mb-[8px]">
        {ROW1.map((ch) => (
          <Key key={ch} label={ch} state={get(ch)} onClick={() => onKey(ch.toLowerCase())} />
        ))}
      </div>
      <div className="flex gap-[6px] mb-[8px] px-[5%]">
        {ROW2.map((ch) => (
          <Key key={ch} label={ch} state={get(ch)} onClick={() => onKey(ch.toLowerCase())} />
        ))}
      </div>
      <div className="flex gap-[6px]">
        <Key label="enter" display="ENTER" state={get("enter")} wide onClick={() => onKey("enter")} />
        {ROW3.map((ch) => (
          <Key key={ch} label={ch} state={get(ch)} onClick={() => onKey(ch.toLowerCase())} />
        ))}
        <Key
          label="backspace"
          display="⌫"
          state={get("backspace")}
          wide
          onClick={() => onKey("backspace")}
        />
      </div>
    </div>
  );
}
