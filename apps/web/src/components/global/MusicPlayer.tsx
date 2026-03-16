"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lexis_music_enabled";

function createDrone(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  osc.connect(gain).connect(dest);
  osc.start();
  return { osc, gain };
}

function createPadLoop(ctx: AudioContext, dest: AudioNode) {
  const chords = [
    [164.81, 196.0, 246.94],
    [146.83, 174.61, 220.0],
    [130.81, 164.81, 196.0],
    [146.83, 185.0, 220.0],
  ];

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  chords[0].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    osc.connect(gain).connect(dest);
    osc.start();
    oscillators.push(osc);
    gains.push(gain);
  });

  let chordIndex = 0;
  const interval = setInterval(() => {
    chordIndex = (chordIndex + 1) % chords.length;
    const t = ctx.currentTime;
    chords[chordIndex].forEach((freq, i) => {
      if (oscillators[i]) {
        oscillators[i].frequency.linearRampToValueAtTime(freq, t + 1.5);
      }
      if (gains[i]) {
        gains[i].gain.linearRampToValueAtTime(0.015, t + 1.5);
      }
    });
  }, 4000);

  return {
    stop: () => {
      clearInterval(interval);
      oscillators.forEach((o) => { try { o.stop(); } catch {} });
    },
  };
}

function createSparkles(ctx: AudioContext, dest: AudioNode) {
  let timer: ReturnType<typeof setTimeout>;
  let stopped = false;

  const scheduleNext = () => {
    if (stopped) return;
    const delay = 2000 + Math.random() * 4000;
    timer = setTimeout(() => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800 + Math.random() * 1200, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      osc.connect(gain).connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 1.6);
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  return { stop: () => { stopped = true; clearTimeout(timer); } };
}

export function MusicToggle() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ stop: () => void }[]>([]);

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const startAudio = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(1, ctx.currentTime);
    master.connect(ctx.destination);

    const drone = createDrone(ctx, master);
    const pad = createPadLoop(ctx, master);
    const sparkle = createSparkles(ctx, master);

    nodesRef.current = [
      { stop: () => { try { drone.osc.stop(); } catch {} } },
      pad,
      sparkle,
    ];
  }, []);

  const stopAudio = useCallback(() => {
    nodesRef.current.forEach((n) => n.stop());
    nodesRef.current = [];
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    if (next) {
      startAudio();
    } else {
      stopAudio();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? "Mute music" : "Play music"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all active:scale-90"
    >
      {enabled ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6abf5e]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
