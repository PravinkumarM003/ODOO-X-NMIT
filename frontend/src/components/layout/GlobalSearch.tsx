"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for Shift + Z instead of Ctrl + K
      if (e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/overview/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!open) {
    return (
      <button 
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-md hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-all w-64"
      >
        <Search className="w-4 h-4" />
        <span>Search TexFlow...</span>
        <kbd className="ml-auto font-mono text-[10px] bg-[var(--sidebar-secondary)] text-[var(--text-primary)] px-1.5 py-0.5 rounded border border-[var(--border)] font-semibold">Shift Z</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border)] gap-3 bg-transparent">
          <Search className="w-5 h-5 text-[var(--primary-glow)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search orders, rolls, or yarn..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]"
          />
          <button onClick={() => setOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--primary-hover)] rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-[var(--primary)]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={result.link}
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-4 py-3 hover:bg-[var(--sidebar-secondary)] border-b border-[var(--border)] last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{result.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[rgba(0,240,255,0.1)] text-[var(--primary)] uppercase tracking-wider">
                      {result.type}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] mt-1">{result.subtitle}</span>
                </Link>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
              No results found for "{query}".
            </div>
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)] text-xs">
              Type at least 2 characters to search across the entire factory registry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
