import { cn } from "@/lib/utils";

/** Dense clinical panel for floor and visit chart. Follows light/dark theme. */
export function ClinicalSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("clinical-surface", className)}>{children}</div>;
}
