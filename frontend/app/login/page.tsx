"use client";

import { useState } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { getFirebaseAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
  rememberMe: z.boolean().default(false).optional(),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const auth = getFirebaseAuth();
      await setPersistence(
        auth,
        values.rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Unable to retrieve Firebase token.");
      }

      await verifySessionWithBackend(idToken, values.rememberMe ?? false);
      toast.success("Login Successful");
      router.push("/");
    } catch (error) {
      const description =
        error instanceof FirebaseError
          ? getAuthErrorMessage(error.code)
          : error instanceof Error
            ? error.message
            : "Something went wrong while signing in. Please try again.";

      toast.error("Login Failed", {
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // Keep UX predictable even if signOut fails remotely.
    }

    form.reset();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-36 h-36 bg-indigo-600 rounded-xl flex items-center justify-center">
            <img src="/images/logo.jpeg" alt="logo" className="rounded-xl" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in to AMS
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-0 shadow-2xl shadow-indigo-100/50 dark:shadow-none sm:rounded-2xl dark:border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="sr-only">Login</CardTitle>
            <CardDescription className="sr-only">
              Enter your credentials below to log in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="text-zinc-900 dark:text-zinc-100 h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const getAuthErrorMessage = (code: string) => {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many login attempts. Please wait and try again.";
    default:
      return "Something went wrong while signing in. Please try again.";
  }
};

const verifySessionWithBackend = async (
  idToken: string,
  rememberMe: boolean,
) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const verifySessionPath = "/api/auth/verify-session";
  const endpoint = apiBaseUrl
    ? `${apiBaseUrl}${verifySessionPath}`
    : verifySessionPath;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      token: idToken,
      idToken,
      rememberMe,
    }),
  });

  if (response.ok) {
    return;
  }

  let message = "Session verification failed.";
  try {
    const data = await response.json();
    if (typeof data?.message === "string" && data.message.trim().length > 0) {
      message = data.message;
    }
  } catch {
    // Ignore invalid JSON responses and keep fallback message.
  }

  throw new Error(message);
};
