"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MemberModal } from "@/components/members/create-member-modal";
import { DateSelector } from "@/components/members/date-selector";
import { MemberMobileCard } from "@/components/members/member-mobile-card";
import { MemberSearchBar } from "@/components/members/member-search-bar";
import { Navbar } from "@/components/navbar";
import { MembersTable } from "@/components/members/members-table";
import { Button } from "@/components/ui/button";
import {
  createMember,
  getMembers,
  type CreateMemberInput,
  type Member,
  type MemberType,
  updateMember,
} from "@/lib/member-api";
import { getFirebaseAuth } from "@/lib/firebase";
import { markAttendanceForDate, unmarkAttendanceForDate } from "@/lib/attendance-api";

export default function AdminScanPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  const initialDateParam = searchParams.get("date")?.trim() ?? "";
  const initialDate = isValidDateString(initialDateParam)
    ? initialDateParam
    : new Date().toISOString().slice(0, 10);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [committedFilters, setCommittedFilters] = useState({
    search: initialSearch,
    date: initialDate,
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDailyCountLoading, setIsDailyCountLoading] = useState(false);
  const [dailyPresentCount, setDailyPresentCount] = useState(0);
  const [dailyTotalMembers, setDailyTotalMembers] = useState(0);
  const [markingMemberId, setMarkingMemberId] = useState<string | null>(null);
  const [unmarkingMemberId, setUnmarkingMemberId] = useState<string | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberModalKey, setMemberModalKey] = useState(0);
  const [memberModalMode, setMemberModalMode] = useState<"create" | "update">(
    "create",
  );
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmUnmarkMember, setConfirmUnmarkMember] = useState<Member | null>(null);
  const [isUnmarkDialogClosing, setIsUnmarkDialogClosing] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const latestRequestRef = useRef(0);
  const unmarkDialogTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const nextSearchValue = searchParams.get("search")?.trim() ?? "";
    const nextDateParam = searchParams.get("date")?.trim() ?? "";
    const nextDate = isValidDateString(nextDateParam)
      ? nextDateParam
      : new Date().toISOString().slice(0, 10);

    setSearchValue((previous) =>
      previous === nextSearchValue ? previous : nextSearchValue,
    );
    setSelectedDate((previous) => (previous === nextDate ? previous : nextDate));
  }, [searchParams]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsAuthorized(false);
        setIsAuthChecking(false);
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      setIsAuthChecking(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const requestId = latestRequestRef.current + 1;
      const requestSearchValue = searchValue;
      const requestSelectedDate = selectedDate;
      latestRequestRef.current = requestId;
      setIsLoading(true);

      void getMembers(requestSearchValue, requestSelectedDate)
        .then((data) => {
          if (latestRequestRef.current !== requestId) {
            return;
          }

          setMembers(data);
          setCommittedFilters({
            search: requestSearchValue,
            date: requestSelectedDate,
          });
        })
        .catch((error) => {
          if (latestRequestRef.current !== requestId) {
            return;
          }

          setMembers([]);
          toast.error("Unable to search members", {
            description: getErrorMessage(error),
          });
        })
        .finally(() => {
          if (latestRequestRef.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isAuthorized, searchValue, selectedDate]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    syncFiltersToUri({
      pathname,
      router,
      currentQueryString: searchParams.toString(),
      searchValue: committedFilters.search,
      selectedDate: committedFilters.date,
    });
  }, [committedFilters, isAuthorized, pathname, router, searchParams]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    setIsDailyCountLoading(true);

    void getMembers("", selectedDate)
      .then((data) => {
        setDailyPresentCount(getPresentCount(data));
        setDailyTotalMembers(data.length);
      })
      .catch((error) => {
        setDailyPresentCount(0);
        setDailyTotalMembers(0);
        toast.error("Unable to load daily present count", {
          description: getErrorMessage(error),
        });
      })
      .finally(() => {
        setIsDailyCountLoading(false);
      });
  }, [isAuthorized, selectedDate]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const selectedDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(selectedDate)),
    [selectedDate],
  );

  const selectedDateType = useMemo(
    () => getSelectedDateType(selectedDate),
    [selectedDate],
  );

  const selectedDateTypeLabel = useMemo(() => {
    if (selectedDateType === "today") {
      return "Today";
    }

    if (selectedDateType === "yesterday") {
      return "Yesterday";
    }

    return "Custom Date";
  }, [selectedDateType]);

  const dailyPresentPercentage = useMemo(() => {
    if (dailyTotalMembers <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((dailyPresentCount / dailyTotalMembers) * 100));
  }, [dailyPresentCount, dailyTotalMembers]);

  const handleOpenCreateModal = () => {
    setMemberModalMode("create");
    setEditingMember(null);
    setMemberModalKey((previous) => previous + 1);
    setIsMemberModalOpen(true);
  };

  const handleOpenUpdateModal = (member: Member) => {
    setMemberModalMode("update");
    setEditingMember(member);
    setMemberModalKey((previous) => previous + 1);
    setIsMemberModalOpen(true);
  };

  const handleSubmitMember = async (input: CreateMemberInput) => {
    setIsSavingMember(true);
    try {
      if (memberModalMode === "create") {
        const createdMember = await createMember(input);
        setMembers((previous) => {
          if (!matchesQuery(createdMember, searchValue)) {
            return previous;
          }

          return [
            createdMember,
            ...previous.filter((member) => member.id !== createdMember.id),
          ];
        });
        setIsMemberModalOpen(false);
        return;
      }

      if (!editingMember) {
        throw new Error("Member to update not found.");
      }

      const updatedMember = await updateMember(editingMember.id, {
        name: input.name,
        type: input.type as MemberType,
        area: input.area,
      });

      setMembers((previous) => {
        const existingMember = previous.find(
          (member) => member.id === updatedMember.id,
        );
        const mergedMember = existingMember
          ? {
            ...updatedMember,
            attendanceStatus: existingMember.attendanceStatus,
            attendedToday: existingMember.attendedToday,
          }
          : updatedMember;

        const withoutUpdated = previous.filter(
          (member) => member.id !== mergedMember.id,
        );

        if (!matchesQuery(mergedMember, searchValue)) {
          return withoutUpdated;
        }

        return [mergedMember, ...withoutUpdated];
      });
      setIsMemberModalOpen(false);
    } catch (error) {
      toast.error(
        memberModalMode === "create"
          ? "Unable to create member"
          : "Unable to update member",
        {
          description: getErrorMessage(error),
        },
      );
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleMarkAttendance = async (memberId: string) => {
    const targetMember = members.find((member) => member.id === memberId);
    if (targetMember?.attendedToday) {
      return;
    }

    setMarkingMemberId(memberId);
    try {
      const result = await markAttendanceForDate(memberId, selectedDate);
      setMembers((previous) =>
        previous.map((member) =>
          member.id === memberId
            ? {
              ...member,
              attendanceStatus: "PRESENT",
              attendedToday: result.user.attendedToday,
            }
            : member,
        ),
      );

      setDailyPresentCount((previous) =>
        targetMember?.attendanceStatus === "PRESENT" || targetMember?.attendedToday
          ? previous
          : Math.min(dailyTotalMembers, previous + 1),
      );
    } catch (error) {
      toast.error("Unable to mark attendance", {
        description: getErrorMessage(error),
      });
    } finally {
      setMarkingMemberId(null);
    }
  };

  const handleOpenUnmarkModal = (member: Member) => {
    if (unmarkDialogTimerRef.current) {
      window.clearTimeout(unmarkDialogTimerRef.current);
      unmarkDialogTimerRef.current = null;
    }

    setIsUnmarkDialogClosing(false);
    setConfirmUnmarkMember(member);
  };

  const closeUnmarkDialog = () => {
    setIsUnmarkDialogClosing(true);

    if (unmarkDialogTimerRef.current) {
      window.clearTimeout(unmarkDialogTimerRef.current);
    }

    unmarkDialogTimerRef.current = window.setTimeout(() => {
      setConfirmUnmarkMember(null);
      setIsUnmarkDialogClosing(false);
      unmarkDialogTimerRef.current = null;
    }, 180);
  };

  const handleCancelUnmark = () => {
    closeUnmarkDialog();
  };

  const handleConfirmUnmark = async () => {
    if (!confirmUnmarkMember) {
      return;
    }

    const wasMarked =
      confirmUnmarkMember.attendanceStatus === "PRESENT" ||
      confirmUnmarkMember.attendedToday;

    setUnmarkingMemberId(confirmUnmarkMember.id);
    try {
      await unmarkAttendanceForDate(confirmUnmarkMember.id, selectedDate);

      setMembers((previous) =>
        previous.map((member) =>
          member.id === confirmUnmarkMember.id
            ? {
              ...member,
              attendanceStatus: null,
              attendedToday: false,
            }
            : member,
        ),
      );

      setDailyPresentCount((previous) =>
        wasMarked ? Math.max(0, previous - 1) : previous,
      );
      closeUnmarkDialog();
    } catch (error) {
      toast.error("Unable to unmark attendance", {
        description: getErrorMessage(error),
      });
    } finally {
      setUnmarkingMemberId(null);
    }
  };

  const handleViewMember = (member: Member) => {
    router.push(getMemberDetailsPath(member.id, searchValue, selectedDate));
  };

  useEffect(() => {
    return () => {
      if (unmarkDialogTimerRef.current) {
        window.clearTimeout(unmarkDialogTimerRef.current);
      }
    };
  }, []);

  if (isAuthChecking) {
    return <MembersPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10">
        <section
          className={
            selectedDateType === "today"
              ? "relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-100 via-emerald-50 to-teal-100 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/70 dark:via-emerald-950/40 dark:to-teal-950/60"
              : "relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-linear-to-br from-zinc-100 via-zinc-50 to-slate-100 p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-slate-900"
          }
        >
          <div
            className={
              selectedDateType === "today"
                ? "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/35 blur-2xl dark:bg-emerald-500/20"
                : "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-zinc-300/35 blur-2xl dark:bg-zinc-600/20"
            }
          />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              {selectedDateType !== "custom" ? (
                <span
                  className={
                    selectedDateType === "today"
                      ? "inline-flex rounded-full border border-emerald-300/80 bg-emerald-200/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "inline-flex rounded-full border border-zinc-300/80 bg-zinc-200/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200"
                  }
                >
                  {selectedDateTypeLabel}
                </span>
              ) : null}
              <p
                className={
                  selectedDateType === "today"
                    ? "text-sm font-medium text-emerald-700 dark:text-emerald-300"
                    : "text-sm font-medium text-zinc-700 dark:text-zinc-300"
                }
              >
                Present Count
              </p>
              <p
                className={
                  selectedDateType === "today"
                    ? "text-5xl font-black leading-none text-emerald-800 dark:text-emerald-200"
                    : "text-5xl font-black leading-none text-zinc-800 dark:text-zinc-100"
                }
              >
                {isDailyCountLoading ? (
                  <span className="inline-block h-10 w-20 animate-pulse rounded-md bg-black/10 align-middle dark:bg-white/10" />
                ) : (
                  dailyPresentCount
                )}
              </p>
              <p
                className={
                  selectedDateType === "today"
                    ? "text-sm font-semibold text-emerald-800 dark:text-emerald-200"
                    : "text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                }
              >
                {isDailyCountLoading ? (
                  <span className="inline-block h-5 w-56 animate-pulse rounded bg-black/10 align-middle dark:bg-white/10" />
                ) : (
                  `${dailyPresentCount} out of ${dailyTotalMembers} members present`
                )}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p
                className={
                  selectedDateType === "today"
                    ? "text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700/80 dark:text-emerald-300/80"
                    : "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400"
                }
              >
                Attendance Date
              </p>
              <p
                className={
                  selectedDateType === "today"
                    ? "text-sm font-semibold text-emerald-900 dark:text-emerald-100"
                    : "text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                }
              >
                {selectedDateLabel}
              </p>
            </div>
          </div>
          <div
            className={
              selectedDateType === "today"
                ? "mt-5 h-1.5 w-full rounded-full bg-emerald-200/80 dark:bg-emerald-800/60"
                : "mt-5 h-1.5 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-700/70"
            }
          >
            <div
              className={
                selectedDateType === "today"
                  ? "h-full rounded-full bg-emerald-500"
                  : "h-full rounded-full bg-zinc-500"
              }
              style={{
                width: isDailyCountLoading ? "20%" : `${dailyPresentPercentage}%`,
              }}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isLoading && members.length === 0 ? (
                <span className="inline-block h-8 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              ) : (
                "Members"
              )}
            </h1>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Selected date: {selectedDateTypeLabel} ({selectedDateLabel})
            </p>
          </div>
          <DateSelector
            value={selectedDate}
            onChange={setSelectedDate}
            label="Attendance date"
            max={new Date().toISOString().slice(0, 10)}
            className="w-full md:max-w-xs"
          />
        </section>

        <MemberSearchBar
          value={searchValue}
          onChange={handleSearchChange}
          onAddNew={handleOpenCreateModal}
          visibleCount={members.length}
          totalCount={members.length}
        />

        <div className="hidden md:block">
          <MembersTable
            members={members}
            isLoading={isLoading}
            markingMemberId={markingMemberId}
            unmarkingMemberId={unmarkingMemberId}
            onMarkAttendance={handleMarkAttendance}
            onUnmarkAttendance={handleOpenUnmarkModal}
            onEditMember={handleOpenUpdateModal}
            onViewMember={handleViewMember}
          />
        </div>

        <section className="space-y-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`member-card-skeleton-${index}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-9 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No members found.
            </div>
          ) : (
            members.map((member) => {
              const isPresent =
                member.attendanceStatus === "PRESENT" || member.attendedToday;
              const isMarking = markingMemberId === member.id;
              const isUnmarking = unmarkingMemberId === member.id;

              return (
                <MemberMobileCard
                  key={member.id}
                  member={member}
                  detailsHref={getMemberDetailsPath(member.id, searchValue, selectedDate)}
                  isPresent={isPresent}
                  isMarking={isMarking}
                  isUnmarking={isUnmarking}
                  onEdit={() => handleOpenUpdateModal(member)}
                  onMarkAttendance={() => handleMarkAttendance(member.id)}
                  onUnmark={() => handleOpenUnmarkModal(member)}
                />
              );
            })
          )}
        </section>
      </div>
      <MemberModal
        key={memberModalKey}
        open={isMemberModalOpen}
        mode={memberModalMode}
        isLoading={isSavingMember}
        onOpenChange={setIsMemberModalOpen}
        onSubmit={handleSubmitMember}
        initialValues={{
          name: editingMember?.name,
          phone: memberModalMode === "create" ? searchValue : editingMember?.phone,
          type: editingMember?.type as MemberType | undefined,
          area: editingMember?.area,
        }}
      />

      {confirmUnmarkMember ? (
        <div
          className={`dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 ${isUnmarkDialogClosing ? "is-closing" : ""}`}
          onClick={handleCancelUnmark}
        >
          <div
            className={`dialog-panel w-full max-w-md rounded-xl border border-emerald-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${isUnmarkDialogClosing ? "is-closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Unmark
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Remove attendance mark for <span className="font-semibold">{confirmUnmarkMember.name}</span> on {selectedDateLabel}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUnmark}
                disabled={unmarkingMemberId === confirmUnmarkMember.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmUnmark}
                disabled={unmarkingMemberId === confirmUnmarkMember.id}
              >
                {unmarkingMemberId === confirmUnmarkMember.id
                  ? "Unmarking..."
                  : "Yes, Unmark"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const matchesQuery = (member: Member, query: string) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  const normalizedQuery = trimmed.toLowerCase();
  const normalizedDigits = trimmed.replace(/\D/g, "");

  const nameMatches = member.name.toLowerCase().includes(normalizedQuery);
  const areaMatches = (member.area ?? "")
    .toLowerCase()
    .includes(normalizedQuery);
  const phoneMatches =
    normalizedDigits.length > 0
      ? member.phone.replace(/\D/g, "").includes(normalizedDigits)
      : member.phone.toLowerCase().includes(normalizedQuery);

  return nameMatches || phoneMatches || areaMatches;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Please try again.";
};

const getPresentCount = (members: Member[]) => {
  return members.filter(
    (member) => member.attendanceStatus === "PRESENT" || member.attendedToday,
  ).length;
};

const getSelectedDateType = (selectedDate: string) => {
  const today = new Date();
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const selected = new Date(`${selectedDate}T00:00:00`);

  if (Number.isNaN(selected.getTime())) {
    return "custom" as const;
  }

  const selectedOnlyDate = new Date(
    selected.getFullYear(),
    selected.getMonth(),
    selected.getDate(),
  );
  const diffDays = Math.round(
    (todayDate.getTime() - selectedOnlyDate.getTime()) / 86400000,
  );

  if (diffDays === 0) {
    return "today" as const;
  }

  if (diffDays === 1) {
    return "yesterday" as const;
  }

  return "custom" as const;
};

function MembersPageSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="h-16 w-full animate-pulse border-b border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/70" />
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-3">
            <div className="h-6 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-md bg-zinc-200 md:max-w-xs dark:bg-zinc-800" />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-11 flex-1 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-11 w-full animate-pulse rounded-md bg-zinc-200 sm:w-32 dark:bg-zinc-800" />
          </div>
          <div className="mt-4 h-4 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-12 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800/70" />
          <div className="space-y-2 p-4">
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </section>
      </div>
    </main>
  );
}

const getMemberDetailsPath = (
  memberId: string,
  searchValue: string,
  selectedDate: string,
) => {
  const params = new URLSearchParams();
  const trimmedSearch = searchValue.trim();

  if (trimmedSearch.length > 0) {
    params.set("search", trimmedSearch);
  }

  if (isValidDateString(selectedDate)) {
    params.set("date", selectedDate);
  }

  const query = params.toString();
  return query ? `/members/${memberId}?${query}` : `/members/${memberId}`;
};

const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const syncFiltersToUri = ({
  pathname,
  router,
  currentQueryString,
  searchValue,
  selectedDate,
}: {
  pathname: string;
  router: ReturnType<typeof useRouter>;
  currentQueryString: string;
  searchValue: string;
  selectedDate: string;
}) => {
  const params = new URLSearchParams(currentQueryString);
  const trimmedSearch = searchValue.trim();

  if (trimmedSearch.length > 0) {
    params.set("search", trimmedSearch);
  } else {
    params.delete("search");
  }

  if (isValidDateString(selectedDate)) {
    params.set("date", selectedDate);
  } else {
    params.delete("date");
  }

  const nextQueryString = params.toString();
  if (nextQueryString === currentQueryString) {
    return;
  }

  router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
    scroll: false,
  });
};
