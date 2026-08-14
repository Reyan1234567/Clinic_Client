"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { FullPageSpinner } from "@/components/ui/states";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, permissionsMissing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) return <FullPageSpinner label="Loading..." />;
  if (!user) return null;

  // Refuse to render a permission-driven UI without the permission list. A
  // roles fallback would silently show the wrong controls.
  if (permissionsMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md border border-destructive/40 bg-destructive/5 p-6">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h1 className="text-sm font-semibold">Session payload is incomplete</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">GET /me</code> returned a user without a{" "}
            <code className="font-mono">permissions</code> array. Every control in this app is
            derived from that list, so the interface cannot be rendered safely. This needs a
            server-side fix.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
