import { Tile, type TileState } from "../../components/ui/tile";

export type LetterState = "empty" | "correct" | "present" | "absent";

export interface GuessLetter {
  letter: string;
  state: LetterState;
}

export interface GuessRow {
  id: string;
  letters: GuessLetter[];
}

export interface BoardProps {
  rows: GuessRow[];
  maxRows?: number;
  revealingRow?: number;
  bounceRow?: number;
  poppingIndex?: number;
}

function mapState(state: LetterState, hasLetter: boolean): TileState {
  if (state === "empty") return hasLetter ? "tbd" : "empty";
  return state;
}

export function Board({ rows, maxRows = 6, revealingRow, bounceRow, poppingIndex }: BoardProps) {
  const paddedRows: GuessRow[] = [
    ...rows,
    ...Array.from({ length: Math.max(0, maxRows - rows.length) }, (_, i) => ({
      id: `empty-${i + rows.length}`,
      letters: Array.from({ length: 5 }, () => ({ letter: "", state: "empty" as const }))
    }))
  ].slice(0, maxRows);

  return (
    <div className="flex flex-col items-center gap-[5px]">
      {paddedRows.map((row, rowIndex) => (
        <div key={row.id} className="flex gap-[5px]">
          {row.letters.map((cell, colIndex) => {
            const hasLetter = cell.letter.trim() !== "";
            const tileState = mapState(cell.state, hasLetter);
            const isRevealing = revealingRow === rowIndex && cell.state !== "empty";
            const isBouncing = bounceRow === rowIndex;
            const isPopping = poppingIndex === colIndex && row.id === "current";

            return (
              <Tile
                key={colIndex}
                state={tileState}
                flip={isRevealing}
                bounce={isBouncing}
                pop={isPopping}
                animDelay={isRevealing ? colIndex * 300 : isBouncing ? colIndex * 100 : 0}
              >
                {cell.letter}
              </Tile>
            );
          })}
        </div>
      ))}
    </div>
  );
}
