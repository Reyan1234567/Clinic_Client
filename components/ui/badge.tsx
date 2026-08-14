import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/10 text-primary",
        success: "border-success/40 bg-success/10 text-success",
        warning: "border-warning/50 bg-warning/10 text-warning",
        danger: "border-destructive/40 bg-destructive/10 text-destructive",
        muted: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
