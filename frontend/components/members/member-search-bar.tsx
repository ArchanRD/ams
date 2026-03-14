"use client";

import { SearchIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MemberSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onAddNew: () => void;
  visibleCount: number;
  totalCount: number;
};

export function MemberSearchBar({
  value,
  onChange,
  onAddNew,
  visibleCount,
  totalCount,
}: MemberSearchBarProps) {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search by name, mobile number, or area..."
            className="h-11 pl-9 pr-10"
          />
          {value.trim().length > 0 ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              onClick={() => onChange("")}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          className="h-11 cursor-pointer sm:min-w-32"
          onClick={onAddNew}
        >
          Add New
        </Button>
      </div>
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {visibleCount} of {totalCount} members
      </p>
    </div>
  );
}
