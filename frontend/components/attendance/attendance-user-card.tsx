"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceUser } from "@/lib/attendance-api";

type AttendanceUserCardProps = {
  user: AttendanceUser;
  isMarking: boolean;
  onMarkAttendance: (userId: string) => void | Promise<void>;
};

export function AttendanceUserCard({
  user,
  isMarking,
  onMarkAttendance,
}: AttendanceUserCardProps) {
  const attendedClassName = user.attendedToday
    ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30"
    : "border-zinc-200 dark:border-zinc-800";

  console.log(user);
  return (
    <Card className={cn(attendedClassName)}>
      <CardHeader>
        <CardTitle className="text-lg">{user.name}</CardTitle>
        <CardDescription
          className={cn(
            user.attendedToday ? "text-emerald-700 dark:text-emerald-300" : "",
          )}
        >
          {user.attendedToday
            ? "Attendance already marked for today"
            : "Attendance not marked yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
        <p>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Member ID:
          </span>{" "}
          {user.id}
        </p>
        {user.phone ? (
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Phone:
            </span>{" "}
            {user.phone}
          </p>
        ) : null}
        {user.type ? (
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Type:
            </span>{" "}
            <span className="capitalize">{user.type}</span>
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onMarkAttendance(user.id)}
          disabled={isMarking || user.attendedToday}
          className={cn(
            "w-full sm:w-auto",
            user.attendedToday &&
              "bg-emerald-600 text-white hover:bg-emerald-600",
          )}
        >
          {isMarking
            ? "Marking..."
            : user.attendedToday
              ? "Marked for Today"
              : "Mark Attendance"}
        </Button>
      </CardFooter>
    </Card>
  );
}
