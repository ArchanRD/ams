"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ChevronDown } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { getFirebaseAuth } from "@/lib/firebase";
import Link from "next/link";

type NavbarProps = {
  brandName?: string;
};

export function Navbar({ brandName = "AMS" }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuContainerRef.current) {
        return;
      }

      if (!menuContainerRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const userEmail = user?.email?.trim() || "user@example.com";

  const avatarLabel = useMemo(() => {
    const seed = userEmail.split("@")[0]?.trim() || "U";
    return seed.slice(0, 1).toUpperCase();
  }, [userEmail]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href={"/"} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center object-cover justify-center rounded bg-linear-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white shadow-sm">
            <img src="/images/logo.jpeg" className="h-full w-full rounded object-cover" alt="" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {brandName}
            </span>
          </div>
        </Link>

        <div className="relative" ref={menuContainerRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-emerald-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            onClick={() => setIsProfileOpen((previous) => !previous)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 text-sm font-semibold text-white">
              {avatarLabel}
            </span>
            <span className="hidden max-w-36 truncate sm:block">{userEmail.split("@")[0]}</span>
            <ChevronDown className={`size-4 transition ${isProfileOpen ? "rotate-180" : "rotate-0"}`} />
          </button>

          {isProfileOpen ? (
            <div
              className="dialog-panel absolute right-0 z-50 mt-2 w-56 rounded-xl border border-emerald-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              role="menu"
            >
              <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">Signed in as</p>
              <p className="px-3 pb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {userEmail}
              </p>
              <LogoutButton
                className="h-9 w-full justify-start rounded-lg px-3"
                onLoggedOut={() => setIsProfileOpen(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
