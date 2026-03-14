import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-b from-emerald-100 via-teal-50 to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-64 w-64 rounded-full bg-teal-300/35 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold tracking-[0.14em] text-emerald-800 uppercase dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles className="size-3.5" />
          Divine Detour
        </div>

        <h1 className="text-6xl font-black tracking-tight text-emerald-900 dark:text-emerald-200 sm:text-7xl">
          404
        </h1>
        <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          This path is not found.
        </p>
        <p className="mt-2 max-w-xl text-sm text-zinc-700 dark:text-zinc-300 sm:text-base">
          The page you requested may have moved or does not exist. Return to the attendance dashboard to continue seva.
        </p>

        <div className="mt-8">
          <Button size="lg" className="h-11 px-5">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
