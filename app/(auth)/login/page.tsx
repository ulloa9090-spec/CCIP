import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>Welcome back to Atlas OS.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
