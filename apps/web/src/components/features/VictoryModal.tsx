"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { StatCard } from "../ui/stat-card";
import { Badge } from "../ui/badge";
import { createConfetti } from "../../utils/confetti";
import clsx from "classnames";

export interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVictory: boolean;
  attempts: number;
  totalAttempts?: number;
  score?: number;
  timeSpent?: string;
  wordLength?: number;
  difficultyLabel?: string;
  onChallengeFriend?: () => void;
  onViewLeaderboard?: () => void;
  onNextPuzzle?: () => void;
  onShare?: () => void;
}

const getVictoryMessage = (attempts: number, total: number = 6): string => {
  if (attempts === 1) return "Perfect! First try!";
  if (attempts <= 2) return "Fantastic!";
  if (attempts <= 4) return "Great!";
  if (attempts <= 6) return "Success!";
  return "Solved!";
};

const getStreakMessage = (streak: number): string => {
  if (streak < 3) return "Getting hot!";
  if (streak < 7) return "On fire!";
  if (streak < 14) return "Unstoppable!";
  return "Legendary!";
};

export function VictoryModal({
  isOpen,
  onClose,
  isVictory,
  attempts,
  totalAttempts = 6,
  score = 0,
  timeSpent = "—",
  wordLength = 5,
  difficultyLabel = "Normal",
  onChallengeFriend,
  onViewLeaderboard,
  onNextPuzzle,
  onShare
}: VictoryModalProps) {
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  useEffect(() => {
    if (isOpen && isVictory && !confettiTriggered) {
      createConfetti(60);
      setConfettiTriggered(true);
    }
  }, [isOpen, isVictory, confettiTriggered]);

  const efficiency = Math.round(((totalAttempts - attempts) / totalAttempts) * 100);
  const message = getVictoryMessage(attempts, totalAttempts);

  return (
    <Modal isOpen={isOpen && isVictory} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="space-y-6 text-center">
        {/* Victory Header */}
        <div className="space-y-3 py-4">
          <div className={clsx(
            "text-4xl font-display font-bold animate-celebrate inline-block",
            isVictory ? "text-accent" : "text-red-500"
          )}>
            {isVictory ? "🎉" : "😔"}
          </div>
          <h2 className="text-3xl font-display font-bold">{message}</h2>
          <p className="text-sm text-zinc-400">
            {isVictory ? "You solved it!" : "Better luck next time!"}
          </p>
        </div>

        {/* Stats Grid */}
        {isVictory && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Attempts"
              value={`${attempts}/${totalAttempts}`}
              variant="accent"
            />
            <StatCard
              label="Efficiency"
              value={`${efficiency}%`}
              variant="success"
            />
            <StatCard
              label="Time"
              value={timeSpent}
              variant="default"
            />
            <StatCard
              label="Points"
              value={score}
              variant="accent"
            />
          </div>
        )}

        {/* Difficulty & Word Info */}
        {isVictory && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="info">{wordLength}-Letter Word</Badge>
            <Badge variant="default">{difficultyLabel}</Badge>
          </div>
        )}

        {/* Social CTA Buttons */}
        <div className="space-y-2 pt-4">
          {isVictory ? (
            <>
              <Button
                onClick={onChallengeFriend}
                variant="success"
                size="md"
                fullWidth
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="7" r="4" />
                    <path d="M1 21v-2a4 4 0 0 1 4-4h3" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              >
                Challenge a Friend
              </Button>
              <Button
                onClick={onShare}
                variant="secondary"
                size="md"
                fullWidth
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                }
              >
                Share Result
              </Button>
              <Button
                onClick={onViewLeaderboard}
                variant="outline"
                size="md"
                fullWidth
              >
                View Leaderboard
              </Button>
            </>
          ) : (
            <Button
              onClick={onClose}
              variant="secondary"
              size="md"
              fullWidth
            >
              Try Again
            </Button>
          )}
        </div>

        {/* Next Puzzle Timer */}
        {isVictory && onNextPuzzle && (
          <div className="border-t border-white/10 pt-4">
            <Button
              onClick={onNextPuzzle}
              variant="primary"
              size="md"
              fullWidth
            >
              Next Puzzle
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
