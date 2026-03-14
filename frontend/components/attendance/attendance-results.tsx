"use client";

import { AttendanceUserCard } from "@/components/attendance/attendance-user-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AttendanceUser } from "@/lib/attendance-api";

type AttendanceResultsProps = {
  users: AttendanceUser[];
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
  markingUserId: string | null;
  onMarkAttendance: (userId: string) => void | Promise<void>;
};

export function AttendanceResults({
  users,
  selectedMemberId,
  onSelectMember,
  markingUserId,
  onMarkAttendance,
}: AttendanceResultsProps) {
  if (users.length === 0) {
    return (
      <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg">No Member Selected</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
          Search for a member to mark attendance, or create a new member if no match is found.
        </CardContent>
      </Card>
    );
  }

  const selectedUser = users.find((user) => user.id === selectedMemberId) ?? null;

  return (
    <section className="space-y-3">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Search Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="member-select">Select member</Label>
          <select
            id="member-select"
            value={selectedMemberId}
            onChange={(event) => onSelectMember(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select a member</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
                {user.phone ? ` (${user.phone})` : ""}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedUser ? (
        <AttendanceUserCard
          user={selectedUser}
          isMarking={markingUserId === selectedUser.id}
          onMarkAttendance={onMarkAttendance}
        />
      ) : null}
    </section>
  );
}
