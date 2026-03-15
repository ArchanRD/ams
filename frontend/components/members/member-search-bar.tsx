"use client";

import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  MoreHorizontalIcon,
  SearchIcon,
  UploadIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MemberSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onAddNew: () => void;
  onImport: () => void;
  onExport: () => void;
  visibleCount: number;
  totalCount: number;
};

export function MemberSearchBar({
  value,
  onChange,
  onAddNew,
  onImport,
  onExport,
  visibleCount,
  totalCount,
}: MemberSearchBarProps) {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!actionsMenuRef.current) {
        return;
      }

      if (!actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="hidden h-11 cursor-pointer gap-1.5 sm:inline-flex"
            onClick={onImport}
          >
            <UploadIcon className="size-4" />
            Import
          </Button>
          <Button
            type="button"
            variant="outline"
            className="hidden h-11 cursor-pointer gap-1.5 sm:inline-flex"
            onClick={onExport}
          >
            <DownloadIcon className="size-4" />
            Export
          </Button>

          <div className="relative sm:hidden" ref={actionsMenuRef}>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-11 cursor-pointer"
              onClick={() => setIsActionsMenuOpen((previous) => !previous)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isActionsMenuOpen}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>

            {isActionsMenuOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-2 min-w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    onImport();
                  }}
                >
                  <UploadIcon className="size-4" />
                  Import
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    onExport();
                  }}
                >
                  <DownloadIcon className="size-4" />
                  Export
                </button>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            className="h-11 flex-1 cursor-pointer sm:min-w-32"
            onClick={onAddNew}
          >
            Add New
          </Button>
        </div>
      </div>
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {visibleCount} of {totalCount} members
      </p>
    </div>
  );
}
