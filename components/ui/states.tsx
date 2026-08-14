import { AlertTriangle, Inbox, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("tech-skeleton", className)} />;
}

/** Loading placeholder shaped like the table it replaces. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-3 px-3 py-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-3.5", columnIndex === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="tech-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-border bg-secondary text-muted-foreground">
        <Inbox className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * A 403 means the session is valid but the action is not permitted. It renders
 * inline and never redirects to login, because permissions can change
 * mid-session and the server is the real authority.
 */
export function ForbiddenState({
  description = "Your account does not have permission to view this. Ask an administrator if you need access.",
  className,
}: {
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-border bg-secondary text-muted-foreground">
        <Lock className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold">Not permitted</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  // A forbidden response is not a failure to retry; it is an answer.
  if (error instanceof ApiError && error.isForbidden) {
    return <ForbiddenState className={className} description={error.message} />;
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong loading this data.";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-destructive/40 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center border border-destructive/40 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold">Could not load</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="tech-label">{label}</span>
    </div>
  );
}
