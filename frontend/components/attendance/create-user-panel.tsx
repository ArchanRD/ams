"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CreateAttendanceUserInput,
  MemberType,
} from "@/lib/attendance-api";

type CreateUserPanelProps = {
  seedQuery: string;
  isLoading: boolean;
  onCreate: (input: CreateAttendanceUserInput) => void | Promise<void>;
};

export function CreateUserPanel({
  seedQuery,
  isLoading,
  onCreate,
}: CreateUserPanelProps) {
  const initialPhone = /^\+?[0-9\s-]{7,20}$/.test(seedQuery) ? seedQuery : "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [memberType, setMemberType] = useState<MemberType>("devotee");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      return;
    }

    onCreate({
      name: trimmedName,
      phone: trimmedPhone,
      type: memberType,
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle>Create New Member</CardTitle>
        <CardDescription>
          No matching member found. Create a member, then select and mark
          attendance manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name *"
              className="h-11 bg-white dark:bg-zinc-900"
              required
            />
          </div>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone *"
            className="h-11 bg-white dark:bg-zinc-900"
            required
          />
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium">Member type</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["devotee", "volunteer"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={memberType === type ? "default" : "outline"}
                  onClick={() => setMemberType(type)}
                  className="h-10 capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="h-11 w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Member"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
