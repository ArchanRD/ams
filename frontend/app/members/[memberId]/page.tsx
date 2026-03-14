"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { MemberModal } from "@/components/members/create-member-modal";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  getMemberDetails,
  getMemberPresentDaysByMonth,
  type MemberDetails,
  type MemberType,
  updateMember,
} from "@/lib/member-api";

const toMonthString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendarCells = (month: string) => {
  const [year, monthPart] = month.split("-").map(Number);
  const firstDate = new Date(year, monthPart - 1, 1);
  const firstWeekDay = firstDate.getDay();
  const daysInMonth = new Date(year, monthPart, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let index = 0; index < firstWeekDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthPart - 1, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const shiftMonth = (month: string, delta: number) => {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(year, monthPart - 1 + delta, 1);
  return toMonthString(date);
};

const formatMonthLabel = (month: string) => {
  const [year, monthPart] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthPart - 1, 1));
};

const formatPrettyDate = (dateValue: string) => {
  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

export default function MemberDetailsPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = String(params.memberId || "").trim();
  const returnSearch = searchParams.get("search")?.trim() ?? "";
  const returnDate = searchParams.get("date")?.trim() ?? "";

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoadingMember, setIsLoadingMember] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalKey, setMemberModalKey] = useState(0);
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(toMonthString(new Date()));
  const [calendarPresentDays, setCalendarPresentDays] = useState<string[]>([]);
  const [tableMonth, setTableMonth] = useState(toMonthString(new Date()));
  const [tablePresentDays, setTablePresentDays] = useState<string[]>([]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsAuthChecking(false);
        router.replace("/login");
        return;
      }

      setIsAuthChecking(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (isAuthChecking || !memberId) {
      return;
    }

    setIsLoadingMember(true);
    void getMemberDetails(memberId)
      .then((result) => {
        setMember(result);
      })
      .catch((error) => {
        toast.error("Unable to load member details", {
          description: getErrorMessage(error),
        });
      })
      .finally(() => {
        setIsLoadingMember(false);
      });
  }, [isAuthChecking, memberId]);

  useEffect(() => {
    if (isAuthChecking || !memberId) {
      return;
    }

    setIsLoadingCalendar(true);
    void getMemberPresentDaysByMonth(memberId, calendarMonth)
      .then((result) => {
        setCalendarPresentDays(result.days);
      })
      .catch((error) => {
        setCalendarPresentDays([]);
        toast.error("Unable to load present days", {
          description: getErrorMessage(error),
        });
      })
      .finally(() => {
        setIsLoadingCalendar(false);
      });
  }, [isAuthChecking, memberId, calendarMonth]);

  useEffect(() => {
    if (isAuthChecking || !memberId) {
      return;
    }

    setIsLoadingTable(true);
    void getMemberPresentDaysByMonth(memberId, tableMonth)
      .then((result) => {
        setTablePresentDays(result.days);
      })
      .catch((error) => {
        setTablePresentDays([]);
        toast.error("Unable to load attendance table data", {
          description: getErrorMessage(error),
        });
      })
      .finally(() => {
        setIsLoadingTable(false);
      });
  }, [isAuthChecking, memberId, tableMonth]);

  const presentDaysSet = useMemo(
    () => new Set(calendarPresentDays),
    [calendarPresentDays],
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth),
    [calendarMonth],
  );

  const handleCalendarMonthInputChange = (value: string) => {
    if (!value || value.length < 7) {
      return;
    }

    setCalendarMonth(value.slice(0, 7));
  };

  const handleTableMonthInputChange = (value: string) => {
    if (!value || value.length < 7) {
      return;
    }

    setTableMonth(value.slice(0, 7));
  };

  const handleOpenUpdateModal = () => {
    if (!member) {
      return;
    }

    setMemberModalKey((previous) => previous + 1);
    setIsMemberModalOpen(true);
  };

  const handleUpdateMember = async (input: {
    name: string;
    phone: string;
    type: MemberType;
    area?: string;
  }) => {
    if (!member) {
      return;
    }

    setIsUpdatingMember(true);
    try {
      const updatedMember = await updateMember(member.id, {
        name: input.name,
        type: input.type,
        area: input.area,
      });

      setMember((previous) =>
        previous
          ? {
              ...updatedMember,
              attendanceStatus: previous.attendanceStatus,
              attendedToday: previous.attendedToday,
              presentDaysCount: previous.presentDaysCount,
            }
          : previous,
      );

      setIsMemberModalOpen(false);
      toast.success("Member updated successfully.");
    } catch (error) {
      toast.error("Unable to update member", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsUpdatingMember(false);
    }
  };

  if (isAuthChecking) {
    return <MemberDetailsPageSkeleton />;
  }

  const backPath = getMembersPath(returnSearch, returnDate);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => router.push(backPath)}
          >
            <ArrowLeft className="size-4" />
            Back to Members
          </Button>
          <Button
            type="button"
            className="h-10 cursor-pointer"
            onClick={handleOpenUpdateModal}
            disabled={!member || isLoadingMember}
          >
            <Pencil className="size-4" />
            Update Member
          </Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 p-5 text-white">
              <h1 className="text-2xl font-bold tracking-tight">Member Details</h1>
              <p className="mt-1 text-sm text-emerald-50">
                Complete profile and attendance summary
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5 p-5 ">
              <div className="w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableHead className="w-48">Name</TableHead>
                      <TableCell>
                        {isLoadingMember ? (
                          <span className="inline-block h-5 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        ) : (
                          member?.name || "-"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableCell>
                        {isLoadingMember ? (
                          <span className="inline-block h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        ) : (
                          member?.phone || "-"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableCell className="capitalize">
                        {isLoadingMember ? (
                          <span className="inline-block h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        ) : (
                          member?.type || "-"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableCell>
                        {isLoadingMember ? (
                          <span className="inline-block h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        ) : (
                          member?.area || "-"
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                  Total Presence
                </p>
                <p className="mt-2 text-4xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {isLoadingMember ? (
                    <span className="inline-block h-10 w-20 animate-pulse rounded bg-emerald-200/80 dark:bg-emerald-900/80" />
                  ) : (
                    member?.presentDaysCount ?? 0
                  )}
                </p>
                <p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Days marked present across all attendance records.
                </p>
              </div>
            </div>
          </section>

          <Card className="h-fit bg-white dark:bg-zinc-900">
            <CardHeader className="space-y-4">
              <CardTitle className="text-xl">Calendar View</CardTitle>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCalendarMonth((previous) => shiftMonth(previous, -1))
                    }
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <p className="min-w-40 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {formatMonthLabel(calendarMonth)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCalendarMonth((previous) => shiftMonth(previous, 1))
                    }
                    aria-label="Next month"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <input
                  type="month"
                  value={calendarMonth}
                  onChange={(event) =>
                    handleCalendarMonthInputChange(event.target.value)
                  }
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {isLoadingCalendar
                  ? Array.from({ length: 35 }).map((_, index) => (
                      <div
                        key={`calendar-skeleton-${index}`}
                        className="h-14 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
                      />
                    ))
                  : calendarCells.map((cellDate, index) => {
                      if (!cellDate) {
                        return <div key={`empty-${index}`} className="h-9 md:h-14 rounded-md bg-zinc-100/60 dark:bg-zinc-900/40" />;
                      }

                      const isoDate = toDateString(cellDate);
                      const isPresent = presentDaysSet.has(isoDate);

                      return (
                        <div
                          key={isoDate}
                          className={
                            isPresent
                              ? "flex h-9 md:h-14 flex-col items-center justify-center rounded-md border border-emerald-500 bg-emerald-500 text-white"
                              : "flex h-9 md:h-14 flex-col items-center justify-center rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                          }
                        >
                          <span
                        className={
                          isPresent
                            ? "text-sm font-semibold text-white"
                            : "text-sm font-medium text-zinc-800 dark:text-zinc-200"
                        }
                      >
                        {cellDate.getDate()}
                          </span>
                        </div>
                      );
                    })}
              </div>

              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                {isLoadingCalendar ? (
                  <p>Loading present days...</p>
                ) : (
                  <p>
                    Present days this month: <span className="font-semibold">{calendarPresentDays.length}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>


        <MemberModal
          key={memberModalKey}
          open={isMemberModalOpen}
          mode="update"
          isLoading={isUpdatingMember}
          onOpenChange={setIsMemberModalOpen}
          onSubmit={handleUpdateMember}
          initialValues={{
            name: member?.name,
            type: member?.type as MemberType | undefined,
            area: member?.area,
          }}
        />
      </div>
    </main>
  );
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Please try again.";
};

function MemberDetailsPageSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="h-16 w-full animate-pulse border-b border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/70" />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-20 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid gap-5 p-5 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="h-8 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="space-y-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-10 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={`member-details-calendar-skeleton-${index}`}
                className="h-9 md:h-14 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 h-6 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </section>
      </div>
    </main>
  );
}

const getMembersPath = (search: string, date: string) => {
  const params = new URLSearchParams();

  if (search.length > 0) {
    params.set("search", search);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    params.set("date", date);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
};
