"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { logIn, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: ActionResult = {};

const CALLBACK_ERRORS: Record<string, string> = {
  invalid_or_expired_link: "That link is invalid or has expired. Request a new one.",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, initialState);
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back to Atlas OS.</CardDescription>
      </CardHeader>
      <CardContent>
        {callbackError && (
          <p className="mb-4 text-sm text-danger">
            {CALLBACK_ERRORS[callbackError] ?? "Something went wrong. Please try again."}
          </p>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text-primary">
              Email
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            {state.fieldErrors?.email && (
              <p className="text-xs text-danger">{state.fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-text-primary">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-text-secondary hover:text-accent">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {state.fieldErrors?.password && (
              <p className="text-xs text-danger">{state.fieldErrors.password}</p>
            )}
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" loading={pending} className="w-full">
            Log in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          No account?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
