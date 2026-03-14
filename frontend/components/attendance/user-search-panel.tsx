"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserSearchPanelProps = {
  value: string;
  onValueChange: (value: string) => void;
  isLoading: boolean;
};

export function UserSearchPanel({
  value,
  onValueChange,
  isLoading,
}: UserSearchPanelProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle>Search Member</CardTitle>
        <CardDescription>
          Scan or type a member name or phone number to find a member quickly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Enter member name or phone"
            className="h-11"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isLoading ? "Searching members..." : "Results will appear automatically."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
