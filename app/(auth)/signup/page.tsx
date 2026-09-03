"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: ActionResult = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start your Atlas OS workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.message ? (
          <p className="text-sm text-text-primary">{state.message}</p>
        ) : (
          <>
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
                <label htmlFor="password" className="text-sm font-medium text-text-primary">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                {state.fieldErrors?.password && (
                  <p className="text-xs text-danger">{state.fieldErrors.password}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                {state.fieldErrors?.confirmPassword && (
                  <p className="text-xs text-danger">{state.fieldErrors.confirmPassword}</p>
                )}
              </div>

              {state.error && <p className="text-sm text-danger">{state.error}</p>}

              <Button type="submit" loading={pending} className="w-full">
                Create account
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
