"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ClickableTableRowProps = React.ComponentProps<typeof TableRow> & {
  href: string;
};

/** Navigates on row click / Enter / Space. Nested links and action cells should call stopPropagation. */
export function ClickableTableRow({ href, className, children, ...props }: ClickableTableRowProps) {
  const router = useRouter();
  const open = () => router.push(href);

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}
