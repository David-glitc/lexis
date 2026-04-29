"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/app-shell";
import { createClient } from "../../utils/supabase/client";
import { Button } from "../../components/ui/button";

type DiscoverPost = {
  id: string;
  username: string;
  displayName: string;
  word: string;
  attempts: number;
  createdAt: string;
};

const supabase = createClient();
const PAGE_SIZE = 12;

export default function DiscoverPage() {
  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [wordMeaning, setWordMeaning] = useState<string>("");
  const [funFact, setFunFact] = useState<string>("");
  const [selectedWord, setSelectedWord] = useState<string>("word");
  const observerRef = useRef<HTMLDivElement | null>(null);

  const hasMore = posts.length >= offset;

  const fetchPosts = useCallback(async (nextOffset: number) => {
    const { data } = await supabase
      .from("puzzle_logs")
      .select("id, puzzle_word, attempts, created_at, user_id, profiles(username, display_name)")
      .eq("won", true)
      .order("created_at", { ascending: false })
      .range(nextOffset, nextOffset + PAGE_SIZE - 1);

    const mapped = (data ?? []).map((row: any) => ({
      id: String(row.id),
      username: row.profiles?.username || "",
      displayName: row.profiles?.display_name || "Player",
      word: String(row.puzzle_word || ""),
      attempts: Number(row.attempts || 0),
      createdAt: String(row.created_at || ""),
    }));
    return mapped;
  }, []);

  useEffect(() => {
    let active = true;
    fetchPosts(0).then((first) => {
      if (!active) return;
      setPosts(first);
      setOffset(first.length);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = await fetchPosts(offset);
    setPosts((prev) => [...prev, ...next]);
    setOffset((prev) => prev + next.length);
    setLoadingMore(false);
  }, [fetchPosts, loadingMore, offset]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading && hasMore) {
        loadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading]);

  async function loadWordExtras(word: string) {
    setSelectedWord(word);
    setWordMeaning("Loading meaning...");
    setFunFact("Loading fun fact...");

    try {
      const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const dictJson = await dictResponse.json();
      const definition = dictJson?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      setWordMeaning(definition || "No meaning found for this word.");
    } catch {
      setWordMeaning("Could not load meaning right now.");
    }

    try {
      const factResponse = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
      const factJson = await factResponse.json();
      setFunFact(factJson?.text || "No fact found.");
    } catch {
      setFunFact("Could not load fact right now.");
    }
  }

  const title = useMemo(() => `Discover`, []);

  return (
    <AppShell header={<div className="font-display text-lg font-bold text-white">{title}</div>}>
      <div className="space-y-4 pt-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-2">Word Spotlight</div>
          <div className="text-white font-display text-2xl">{selectedWord.toUpperCase()}</div>
          <p className="mt-2 text-sm text-zinc-300">{wordMeaning || "Tap a word in the feed to load its meaning."}</p>
          <p className="mt-2 text-xs text-zinc-500">{funFact || "Fun language fact will appear here."}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Loading feed…</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">No plays yet.</div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-white font-medium">{post.displayName}</div>
                    {post.username ? (
                      <Link href={`/u/${post.username}`} className="text-xs text-zinc-500 hover:text-[#6abf5e]">
                        @{post.username}
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-500">anonymous</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono">{new Date(post.createdAt).toLocaleString()}</span>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                  <div>
                    <div className="text-xs text-zinc-500">Solved Word</div>
                    <div className="font-display text-lg text-[#6abf5e]">{post.word.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Guesses</div>
                    <div className="font-mono text-white">{post.attempts}/6</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => loadWordExtras(post.word)}>
                    Explore word + fact
                  </Button>
                </div>
              </div>
            ))}
            <div ref={observerRef} className="h-6" />
            {loadingMore && <div className="text-center text-xs text-zinc-500">Loading more…</div>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
