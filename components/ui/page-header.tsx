import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Monospaced breadcrumb-style caption above the title. */
  eyebrow?: string;
  /** Compact header for dense clinical screens. */
  size?: "default" | "sm";
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  size = "default",
  children,
  className,
}: PageHeaderProps) {
  const compact = size === "sm";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between",
        compact ? "mb-4 gap-2 pb-3" : "mb-6 gap-4 pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <span className={cn("tech-label mb-1 block", compact && "mb-0.5")}>{eyebrow}</span>
        ) : null}
        <h1
          className={cn(
            "truncate font-semibold tracking-tight",
            compact ? "text-base sm:text-lg" : "text-xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "mt-0.5 text-xs" : "mt-1 text-sm",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
