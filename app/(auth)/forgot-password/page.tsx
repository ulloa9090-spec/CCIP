"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ActionResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: ActionResult = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.message ? (
          <p className="text-sm text-text-primary">{state.message}</p>
        ) : (
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

            <Button type="submit" loading={pending} className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
