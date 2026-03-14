"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateMemberInput, MemberType } from "@/lib/member-api";

type MemberModalMode = "create" | "update";

type MemberModalInitialValues = {
  name?: string;
  phone?: string;
  type?: MemberType;
  area?: string;
};

type MemberModalProps = {
  open: boolean;
  mode?: MemberModalMode;
  isLoading: boolean;
  initialValues?: MemberModalInitialValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateMemberInput) => void | Promise<void>;
};

export function MemberModal({
  open,
  mode = "create",
  isLoading,
  initialValues,
  onOpenChange,
  onSubmit,
}: MemberModalProps) {
  const [name, setName] = useState(() => initialValues?.name ?? "");
  const [phone, setPhone] = useState(() => initialValues?.phone ?? "");
  const [type, setType] = useState<MemberType>(() => initialValues?.type ?? "devotee");
  const [area, setArea] = useState(() => initialValues?.area ?? "");

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedArea = area.trim();
    if (!trimmedName || (mode === "create" && !trimmedPhone)) {
      return;
    }

    onSubmit({
      name: trimmedName,
      phone: trimmedPhone,
      type,
      area: trimmedArea || undefined,
    });
  };

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <Card
        className="dialog-panel w-full max-w-md overflow-hidden border-emerald-200 shadow-2xl dark:border-zinc-800"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="">
          <CardTitle className="text-xl font-bold">
            {mode === "create" ? "Create New Member" : "Update Member"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-name" className="text-zinc-700 dark:text-zinc-200">
                Name
              </Label>
              <Input
                id="member-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                required
                className="h-11"
              />
            </div>
            {mode === "create" ? (
              <div className="space-y-1.5">
                <Label htmlFor="member-phone" className="text-zinc-700 dark:text-zinc-200">
                  Phone
                </Label>
                <Input
                  id="member-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 9999999999"
                  required
                  className="h-11"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="member-type" className="text-zinc-700 dark:text-zinc-200">
                Type
              </Label>
              <select
                id="member-type"
                value={type}
                onChange={(event) => setType(event.target.value as MemberType)}
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="devotee">Devotee</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-area" className="text-zinc-700 dark:text-zinc-200">
                Area
              </Label>
              <Input
                id="member-area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Area"
                className="h-11"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 cursor-pointer px-3"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 px-3 cursor-pointer hover:bg-black/80"
              >
                {isLoading
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                    ? "Create Member"
                    : "Update Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const CreateMemberModal = MemberModal;
