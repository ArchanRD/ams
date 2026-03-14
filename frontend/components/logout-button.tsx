"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";

type LogoutButtonProps = {
  redirectTo?: string;
  className?: string;
  label?: string;
  onLoggedOut?: () => void;
};

export function LogoutButton({
  redirectTo = "/login",
  className,
  label = "Logout",
  onLoggedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await signOut(getFirebaseAuth());
      toast.success("Logged out successfully.");
      onLoggedOut?.();
      router.replace(redirectTo);
    } catch (error) {
      const description =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to log out right now. Please try again.";

      toast.error("Logout failed", {
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOutIcon />
      {isLoading ? "Logging out..." : label}
    </Button>
  );
}

export default LogoutButton;
