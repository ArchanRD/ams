"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/member-api";

type MemberMobileCardProps = {
  member: Member;
  detailsHref: string;
  isPresent: boolean;
  isMarking: boolean;
  isUnmarking: boolean;
  isUpdatingPrasadam: boolean;
  onEdit: () => void;
  onMarkAttendance: () => void;
  onPrasadamChange: (prasadam: number) => void;
  onUnmark: () => void;
};

const getTypePillClassName = (type?: string | null) => {
  if (type === "volunteer") {
    return "inline-flex rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
  }

  if (type === "devotee") {
    return "inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  }

  return "inline-flex rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
};

export function MemberMobileCard({
  member,
  detailsHref,
  isPresent,
  isMarking,
  isUnmarking,
  isUpdatingPrasadam,
  onEdit,
  onMarkAttendance,
  onPrasadamChange,
  onUnmark,
}: MemberMobileCardProps) {
  const stopCardNavigation = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Link href={detailsHref} className="block">
      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-left text-base font-semibold text-emerald-700 dark:text-emerald-300">
            {member.name}
          </h3>
          <span className={getTypePillClassName(member.type)}>{member.type || "-"}</span>
        </div>

        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Phone: {member.phone || "-"}</p>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Area: {member.area || "-"}</p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Prasadam
          </label>
          <input
            type="number"
            min={0}
            value={member.prasadam}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onChange={(event) => {
              const nextValue = Number.parseInt(event.target.value || "0", 10);
              onPrasadamChange(Number.isNaN(nextValue) ? 0 : Math.max(0, nextValue));
            }}
            aria-label={`Prasadam for ${member.name}`}
          />
          {isUpdatingPrasadam ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Saving...
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={(event) => {
              stopCardNavigation(event);
              onEdit();
            }}
            aria-label={`Edit ${member.name}`}
          >
            <Pencil className="size-4" />
          </Button>

          {isPresent ? (
            <Button
              type="button"
              variant="destructive"
              className="h-9 flex-1"
              onClick={(event) => {
                stopCardNavigation(event);
                onUnmark();
              }}
              disabled={isUnmarking}
            >
              {isUnmarking ? "Unmarking..." : "Unmark"}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-9 flex-1"
              onClick={(event) => {
                stopCardNavigation(event);
                onMarkAttendance();
              }}
              disabled={isMarking}
            >
              {isMarking ? "Marking..." : "Mark Attendance"}
            </Button>
          )}
        </div>
      </article>
    </Link>
  );
}
