"use client";

import { Pencil } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AttendanceStatus, Member } from "@/lib/member-api";

type MembersTableProps = {
  members: Member[];
  isLoading: boolean;
  markingMemberId: string | null;
  unmarkingMemberId: string | null;
  onMarkAttendance: (memberId: string) => void | Promise<void>;
  onUnmarkAttendance: (member: Member) => void;
  onEditMember: (member: Member) => void;
  onViewMember: (member: Member) => void;
};

export function MembersTable({
  members,
  isLoading,
  markingMemberId,
  unmarkingMemberId,
  onMarkAttendance,
  onUnmarkAttendance,
  onEditMember,
  onViewMember,
}: MembersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader className="bg-zinc-100/80 dark:bg-zinc-900">
          <TableRow className="hover:bg-transparent">
            <TableHead>Member Name</TableHead>
            <TableHead>Mobile Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead></TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-zinc-500 dark:text-zinc-400"
              >
                Loading members...
              </TableCell>
            </TableRow>
          ) : members.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-zinc-500 dark:text-zinc-400"
              >
                No members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const isMarking = markingMemberId === member.id;
              const isUnmarking = unmarkingMemberId === member.id;
              const isPresent =
                member.attendanceStatus === "PRESENT" || member.attendedToday;

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    <button
                      type="button"
                      className="cursor-pointer text-left text-blue-700 hover:underline dark:text-emerald-300"
                      onClick={() => onViewMember(member)}
                    >
                      {member.name}
                    </button>
                  </TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell className="capitalize">
                    {member.type || "-"}
                  </TableCell>
                  <TableCell>{member.area || "-"}</TableCell>
                  <TableCell>{member.email || "-"}</TableCell>
                  <TableCell>
                    <AttendanceStatusBadge
                      status={member.attendanceStatus}
                      attendedToday={member.attendedToday}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => onEditMember(member)}
                      aria-label={`Edit ${member.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    {isPresent ? (
                      <Button
                        size="lg"
                        variant="destructive"
                        className="h-10 cursor-pointer px-3"
                        onClick={() => onUnmarkAttendance(member)}
                        disabled={isUnmarking}
                      >
                        {isUnmarking ? "Unmarking..." : "Unmark"}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="h-10 cursor-pointer px-3"
                        onClick={() => onMarkAttendance(member.id)}
                        disabled={isMarking}
                      >
                        {isMarking ? "Marking..." : "Mark Attendance"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type AttendanceStatusBadgeProps = {
  status?: AttendanceStatus | null;
  attendedToday: boolean;
};

function AttendanceStatusBadge({
  status,
  attendedToday,
}: AttendanceStatusBadgeProps) {
  if (status === "PRESENT" || attendedToday) {
    return (
      <span className="font-medium text-emerald-600 dark:text-emerald-400">
        Present
      </span>
    );
  }

  if (status === "ABSENT") {
    return (
      <span className="font-medium text-rose-600 dark:text-rose-400">
        Absent
      </span>
    );
  }

  if (status === "HALF_DAY") {
    return (
      <span className="font-medium text-emerald-600 dark:text-emerald-400">
        Half Day
      </span>
    );
  }

  return (
    <span className="font-medium text-zinc-500 dark:text-zinc-400">
      Not Marked
    </span>
  );
}
