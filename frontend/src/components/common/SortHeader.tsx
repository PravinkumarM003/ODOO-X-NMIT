"use client";

import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface SortHeaderProps {
  label: string;
  sortKey: string;
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
  onSort: (sortKey: string) => void;
  className?: string;
}

export default function SortHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder = "asc",
  onSort,
  className = "",
}: SortHeaderProps) {
  const isActive = currentSortBy === sortKey;

  return (
    <th
      scope="col"
      className={`px-3.5 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider select-none cursor-pointer hover:text-[var(--primary)] transition-colors group ${className}`}
      onClick={() => onSort(sortKey)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      aria-sort={
        isActive
          ? currentSortOrder === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <div className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        <span className="inline-flex items-center">
          {isActive ? (
            currentSortOrder === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-[var(--primary)] font-bold animate-in fade-in zoom-in-75 duration-150" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-[var(--primary)] font-bold animate-in fade-in zoom-in-75 duration-150" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/40 group-hover:text-[var(--primary)]/70 transition-colors" />
          )}
        </span>
      </div>
    </th>
  );
}
