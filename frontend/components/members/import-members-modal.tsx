"use client";

import { useRef, useState } from "react";
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  downloadMemberImportTemplate,
  importMembersFile,
  type MemberImportResult,
} from "@/lib/member-api";

type ImportMembersModalProps = {
  isClosing: boolean;
  onClose: () => void;
  onImportComplete: () => void;
};

const REQUIRED_COLUMNS = ["Name", "Phone"];
const OPTIONAL_COLUMNS = ["Type", "Area", "Date"];

export function ImportMembersModal({
  isClosing,
  onClose,
  onImportComplete,
}: ImportMembersModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<MemberImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const isExcelFile =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isExcelFile) {
      setErrorMessage("Upload a .xlsx Excel file.");
      return;
    }

    setErrorMessage(null);
    setIsImporting(true);

    try {
      const importResult = await importMembersFile(file);
      setResult(importResult);
      onImportComplete();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to import members.",
      );
    } finally {
      setIsImporting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadMemberImportTemplate();
    } catch (error) {
      toast.error("Unable to download template", {
        description:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Please try again.",
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
    setIsDragging(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 ${isClosing ? "is-closing" : ""}`}
      onClick={onClose}
    >
      <div
        className={`dialog-panel w-full max-w-2xl rounded-2xl border border-emerald-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${isClosing ? "is-closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Import Members
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Upload an Excel file to create members and optionally mark
                attendance from the same sheet.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Required format
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REQUIRED_COLUMNS.map((column) => (
                <span
                  key={column}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  {column}*
                </span>
              ))}
              {OPTIONAL_COLUMNS.map((column) => (
                <span
                  key={column}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300"
                >
                  {column}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              A sheet with Name, Phone, and Date is enough to import members and
              mark attendance. Type accepts devotee or volunteer.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Start with the template
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Download a ready-to-fill workbook that matches the database fields.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              <DownloadIcon className="size-4" />
              {isDownloadingTemplate ? "Downloading..." : "Download Template"}
            </Button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/80 dark:bg-emerald-950/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                    Members Created
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-800 dark:text-emerald-200">
                    {result.created}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-300">
                    Already Existed
                  </p>
                  <p className="mt-2 text-3xl font-black text-zinc-800 dark:text-zinc-100">
                    {result.existing}
                  </p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/80 dark:bg-teal-950/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
                    Attendance Marked
                  </p>
                  <p className="mt-2 text-3xl font-black text-teal-800 dark:text-teal-200">
                    {result.attendanceMarked}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Imported {result.total} rows
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.errors.length === 0
                    ? "All rows were processed successfully."
                    : `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} could not be imported.`}
                </p>

                {result.errors.length > 0 ? (
                  <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30">
                    {result.errors.map((item) => (
                      <div key={`${item.row}-${item.name}`} className="rounded-md bg-white/80 p-3 dark:bg-zinc-900/80">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                          Row {item.row}: {item.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => {
                  const [file] = Array.from(event.target.files ?? []);
                  void handleFile(file ?? null);
                }}
              />

              <button
                type="button"
                className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center transition ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                    : "border-zinc-300 bg-zinc-50 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  const [file] = Array.from(event.dataTransfer.files ?? []);
                  void handleFile(file ?? null);
                }}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="size-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-950 dark:border-t-emerald-400" />
                    <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      Importing workbook...
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Members and attendance rows are being processed.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <FileSpreadsheetIcon className="size-7" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      Drop your Excel file here or click to browse
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Upload a .xlsx file with member data.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      <UploadIcon className="size-3.5" />
                      Choose Excel File
                    </span>
                  </>
                )}
              </button>

              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 p-6 dark:border-zinc-800">
          {result ? (
            <Button type="button" variant="outline" onClick={handleReset}>
              Import Another File
            </Button>
          ) : (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Fields marked with * are required.
            </div>
          )}
          <Button type="button" onClick={onClose} disabled={isImporting}>
            {result ? "Done" : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}