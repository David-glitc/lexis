"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LexisLogo } from "../components/ui/lexis-logo";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );
    el.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach((child) =>
      observer.observe(child)
    );
    return () => observer.disconnect();
  }, []);
  return ref;
}

function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleScroll() {
      if (!ref.current) return;
      const y = window.scrollY;
      ref.current.querySelectorAll<HTMLElement>("[data-speed]").forEach((el) => {
        const speed = parseFloat(el.dataset.speed ?? "0.1");
        el.style.transform = `translateY(${y * speed}px)`;
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return ref;
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function AnimatedTiles() {
  const words = ["BRAIN", "THINK", "WORDS", "LEXIS", "SHARP"];
  const colors = ["#538d4e", "#b59f3b", "#3a3a3c"];
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setWordIdx((i) => (i + 1) % words.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const word = words[wordIdx];

  return (
    <div className="flex gap-2.5 justify-center">
      {word.split("").map((letter, i) => (
        <div
          key={`${wordIdx}-${i}`}
          className="w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center text-xl sm:text-2xl font-bold text-white rounded-lg animate-flip font-display"
          style={{
            backgroundColor: colors[i % colors.length],
            animationDelay: `${i * 150}ms`,
            animationFillMode: "both",
            boxShadow: `0 4px 20px ${colors[i % colors.length]}50`
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

function Marquee() {
  const items = [
    "PATTERN RECOGNITION", "COMPETITIVE ARENA", "INFINITE PUZZLES",
    "RANKED LEADERBOARDS", "CHALLENGE FRIENDS", "BRAIN TRAINING",
    "SPEED MASTERY", "COGNITIVE EDGE", "DAILY PUZZLES", "WORD STRATEGY"
  ];
  const text = items.join(" ◆ ");
  return (
    <div className="overflow-hidden whitespace-nowrap py-6 border-y border-white/[0.06]">
      <div className="animate-marquee inline-flex gap-0">
        <span className="font-display text-2xl sm:text-4xl font-bold text-white/[0.06] uppercase tracking-wider px-4">
          {text} ◆ {text} ◆&nbsp;
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const revealRef = useReveal();
  const parallaxRef = useParallax();

  return (
    <div ref={(el) => {
      (revealRef as any).current = el;
      (parallaxRef as any).current = el;
    }} className="min-h-screen bg-[#060606] text-white overflow-hidden relative">

      {/* Floating orbs — vivid */}
      <div className="orb w-[700px] h-[700px] bg-[#538d4e] top-[-150px] left-[-200px]" data-speed="-0.05" />
      <div className="orb w-[500px] h-[500px] bg-[#b59f3b] top-[15%] right-[-150px]" style={{ animationDelay: "5s" }} data-speed="-0.03" />
      <div className="orb w-[400px] h-[400px] bg-[#538d4e] bottom-[10%] left-[30%]" style={{ animationDelay: "12s" }} data-speed="-0.04" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#060606]/60 border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:rotate-12">
              <LexisLogo size={30} />
            </div>
            <span className="font-display text-lg font-bold tracking-[0.15em]">LEXIS</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/hints" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300 hidden sm:block font-body">
              Training
            </Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300 hidden sm:block font-body">
              Sign in
            </Link>
            <Link href="/play">
              <button className="relative px-5 py-2 text-sm font-semibold text-black bg-white rounded-full overflow-hidden group font-body">
                <span className="relative z-10">Play Now</span>
                <span className="absolute inset-0 bg-[#538d4e] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="absolute inset-0 z-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-sm font-semibold">
                  Play Now
                </span>
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO — bright, vivid, high-contrast ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Bright radial spotlights */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[900px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(83,141,78,0.30) 0%, rgba(83,141,78,0.08) 35%, transparent 65%)"
          }}
        />
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 65%)"
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="reveal mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/[0.08] text-xs font-mono text-zinc-200 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#6abf5e] animate-pulse" />
              Now in Public Beta
            </div>
          </div>

          <h1 className="reveal font-display text-6xl sm:text-8xl md:text-9xl font-extrabold leading-[0.9] tracking-tight mb-8" style={{ transitionDelay: "100ms" }}>
            <span className="text-white">Your Wordle</span><br />
            <span className="text-glow text-transparent bg-clip-text bg-gradient-to-r from-[#6abf5e] via-[#8ff07a] to-[#d4c84a]">
              Utopia
            </span>
          </h1>

          <p className="reveal text-lg sm:text-xl text-zinc-200 max-w-xl mx-auto mb-12 font-body leading-relaxed" style={{ transitionDelay: "200ms" }}>
            The competitive word puzzle arena that trains pattern recognition, sharpens instinct, and rewards mastery.
          </p>

          <div className="reveal mb-14" style={{ transitionDelay: "300ms" }}>
            <AnimatedTiles />
          </div>

          <div className="reveal flex flex-col sm:flex-row gap-4 justify-center" style={{ transitionDelay: "400ms" }}>
            <Link href="/play">
              <button className="px-9 py-4 bg-white text-black font-bold rounded-full text-base hover:scale-105 active:scale-95 transition-transform duration-200 font-body shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Enter Today&apos;s Challenge
              </button>
            </Link>
            <Link href="/hints">
              <button className="px-9 py-4 border border-white/20 text-white font-medium rounded-full text-base hover:bg-white/10 hover:border-white/30 transition-all duration-200 font-body">
                Train Your Instincts
              </button>
            </Link>
          </div>

          <div className="reveal mt-24 flex flex-col items-center gap-2 text-zinc-500" style={{ transitionDelay: "600ms" }}>
            <span className="text-[10px] uppercase tracking-[0.3em] font-mono">Scroll to explore</span>
            <div className="w-px h-10 bg-gradient-to-b from-zinc-500 to-transparent animate-pulse" />
          </div>
        </div>
      </section>

      <Marquee />

      {/* Bento Features Grid */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal text-center mb-16">
            <span className="font-mono text-xs text-[#6abf5e] uppercase tracking-[0.3em]">Features</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mt-3">
              Train. Compete.<br />Master.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 stagger">
            <div className="reveal md:col-span-7 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 card-hover relative overflow-hidden min-h-[280px] group" style={{"--i": 0} as React.CSSProperties}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#538d4e]/15 rounded-full blur-[80px] group-hover:bg-[#538d4e]/30 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#538d4e]/15 border border-[#538d4e]/30 flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6abf5e" strokeWidth="2"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 4 4" /><path d="M12 12c2 2.67 4 4 6 4a4 4 0 0 0-4-4" /></svg>
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">Infinite Training</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-md font-body">
                  No daily limits. Unlimited puzzles generated from a curated system that balances difficulty and discovery. Train until your instincts are automatic.
                </p>
              </div>
            </div>

            <div className="reveal md:col-span-5 md:row-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 card-hover relative overflow-hidden group" style={{"--i": 1} as React.CSSProperties}>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#b59f3b]/15 rounded-full blur-[60px] group-hover:bg-[#b59f3b]/25 transition-colors duration-500" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#b59f3b]/15 border border-[#b59f3b]/30 flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4b84a" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">Climb the Ranks</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-body">
                  Tracked across accuracy, speed, consistency, and streak length. Rise from Unranked to Master.
                </p>
                <div className="mt-auto space-y-2">
                  {["Master", "Diamond", "Platinum", "Gold"].map((tier, i) => (
                    <div key={tier} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <span className="text-xs font-mono text-zinc-300">{tier}</span>
                      <div className="h-1.5 flex-1 mx-3 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#538d4e] to-[#b59f3b]" style={{ width: `${90 - i * 20}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="reveal md:col-span-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 card-hover" style={{"--i": 2} as React.CSSProperties}>
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 4 6.5V18h6v-2.5c2-1.5 4-3.5 4-6.5a7 7 0 0 0-7-7z" /><line x1="9" y1="22" x2="15" y2="22" /></svg>
              </div>
              <h3 className="font-display text-lg font-bold mb-1">Pattern Recognition</h3>
              <p className="text-zinc-400 text-xs leading-relaxed font-body">Your brain learns consonant clusters, common suffixes, vowel distributions — automatically.</p>
            </div>

            <div className="reveal md:col-span-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 card-hover" style={{"--i": 3} as React.CSSProperties}>
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /></svg>
              </div>
              <h3 className="font-display text-lg font-bold mb-1">Duel Friends</h3>
              <p className="text-zinc-400 text-xs leading-relaxed font-body">Fewest attempts wins. Fastest time breaks ties.</p>
            </div>

            <div className="reveal md:col-span-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 card-hover relative overflow-hidden" style={{"--i": 4} as React.CSSProperties}>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-2">Progress Analytics</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-md font-body">
                    Detailed statistics reveal your strengths and blind spots. Watch your speed, accuracy, and pattern recognition improve over time.
                  </p>
                </div>
                <div className="flex gap-3 items-end">
                  {[65, 82, 45, 91, 73, 58, 88, 95, 70, 85].map((h, i) => (
                    <div key={i}>
                      <div
                        className="w-4 sm:w-5 rounded-sm bg-gradient-to-t from-[#538d4e]/50 to-[#6abf5e]"
                        style={{ height: `${h}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-20 border-y border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { target: 50000, suffix: "+", label: "Daily Players" },
              { target: 1000000, suffix: "+", label: "Puzzles Solved" },
              { target: 100, suffix: "+", label: "Countries" },
              { target: 99, suffix: "%", label: "Uptime" }
            ].map((stat) => (
              <div key={stat.label} className="reveal text-center">
                <div className="font-display text-4xl sm:text-5xl font-bold text-white mb-1">
                  <Counter target={stat.target} suffix={stat.suffix} />
                </div>
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="reveal text-center mb-16">
            <span className="font-mono text-xs text-[#6abf5e] uppercase tracking-[0.3em]">Gameplay</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mt-3">
              Simple Rules,<br />Deep Strategy
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { color: "#538d4e", letter: "L", label: "Correct", desc: "Right letter, right position" },
              { color: "#b59f3b", letter: "E", label: "Present", desc: "Right letter, wrong position" },
              { color: "#3a3a3c", letter: "X", label: "Absent", desc: "Letter not in the word" }
            ].map((item, i) => (
              <div key={item.label} className="reveal-scale text-center" style={{ transitionDelay: `${i * 150}ms` }}>
                <div
                  className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-lg text-3xl font-bold text-white transition-transform duration-300 hover:scale-110 hover:rotate-3"
                  style={{ backgroundColor: item.color, boxShadow: `0 8px 30px ${item.color}50` }}
                >
                  {item.letter}
                </div>
                <div className="font-display text-lg font-bold mb-1">{item.label}</div>
                <div className="text-xs text-zinc-400 font-body">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Training Matters */}
      <section className="px-6 py-24 relative">
        <div className="mx-auto max-w-5xl">
          <div className="reveal text-center mb-16">
            <span className="font-mono text-xs text-[#6abf5e] uppercase tracking-[0.3em]">Method</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mt-3">
              Why Training Matters
            </h2>
          </div>

          <div className="space-y-0">
            {[
              { num: "01", title: "Letter Frequency Intuition", desc: "Repeated play trains your brain to prioritize high-frequency letters and common patterns without conscious effort. E, T, A, O, I become second nature." },
              { num: "02", title: "Elimination Strategy", desc: "Each guess narrows the possibility space. Training builds the habit of maximizing information per attempt — the difference between 3 guesses and 6." },
              { num: "03", title: "Speed Under Pressure", desc: "Competitive modes push you to solve faster. Your trained instincts become the difference between winning and losing every duel." }
            ].map((step, i) => (
              <div key={step.num} className={`reveal${i % 2 === 0 ? "-left" : "-right"} flex gap-6 sm:gap-10 items-start py-10 border-b border-white/[0.06]`} style={{ transitionDelay: `${i * 100}ms` }}>
                <span className="font-display text-6xl sm:text-8xl font-extrabold text-white/[0.06] leading-none shrink-0 select-none">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg font-body">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Marquee />

      {/* CTA */}
      <section className="px-6 py-32 relative">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(83,141,78,0.18) 0%, transparent 60%)" }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="reveal font-display text-4xl sm:text-6xl font-extrabold mb-4">
            Ready to sharpen<br />your edge?
          </h2>
          <p className="reveal text-zinc-300 text-lg mb-10 max-w-md mx-auto font-body" style={{ transitionDelay: "100ms" }}>
            Every puzzle builds instinct. Every duel tests your limits. Start now.
          </p>
          <div className="reveal" style={{ transitionDelay: "200ms" }}>
            <Link href="/play">
              <button className="px-10 py-5 bg-white text-black font-bold rounded-full text-lg hover:scale-105 active:scale-95 transition-transform duration-200 font-body shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                Start Training
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">© 2026 Lexis</span>
          <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Built for competitive minds</span>
        </div>
      </footer>
    </div>
  );
}
