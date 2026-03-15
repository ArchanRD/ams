"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ExportRangeMode = "all" | "custom";

type ExportAttendanceModalProps = {
  isClosing: boolean;
  isExporting: boolean;
  onExport: (from: string, to: string) => void;
  onClose: () => void;
};

const getTodayString = () => new Date().toISOString().slice(0, 10);

export function ExportAttendanceModal({
  isClosing,
  isExporting,
  onExport,
  onClose,
}: ExportAttendanceModalProps) {
  const today = getTodayString();
  const [mode, setMode] = useState<ExportRangeMode>("all");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const handleExport = () => {
    if (mode === "all") {
      onExport("2020-01-01", today);
    } else {
      onExport(fromDate, toDate);
    }
  };

  const isCustomInvalid = mode === "custom" && fromDate > toDate;

  return (
    <div
      className={`dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 ${isClosing ? "is-closing" : ""}`}
      onClick={onClose}
    >
      <div
        className={`dialog-panel w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${isClosing ? "is-closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Export to Excel
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose which attendance records to export.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                mode === "all"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                mode === "custom"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              Custom Date Range
            </button>
          </div>

          {mode === "all" ? (
            <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
              Exports all attendance records from{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                1 Jan 2020
              </span>{" "}
              through today.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              {isCustomInvalid && (
                <p className="text-xs font-medium text-red-500">
                  &quot;From&quot; date must be on or before &quot;To&quot; date.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isCustomInvalid}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}
