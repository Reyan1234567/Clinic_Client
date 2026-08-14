"use client";

import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export interface RowAction {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** Omitted from the menu when this permission is absent. */
  permission?: PermissionKey;
  /** Business-rule gate, e.g. only check in a SCHEDULED appointment. */
  available?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

/**
 * A row menu is assembled one action at a time. Each entry is dropped when its
 * permission is missing, so a user with `appointment.reschedule` but not
 * `appointment.cancel` sees reschedule alone.
 *
 * When nothing survives the filter, no trigger is rendered either — an empty
 * dropdown would advertise actions the user cannot take.
 */
export function RowActionMenu({
  actions,
  label = "Row actions",
  className,
}: {
  actions: RowAction[];
  label?: string;
  className?: string;
}) {
  const { has } = usePermissions();

  const permitted = actions.filter(
    (action) => (!action.permission || has(action.permission)) && action.available !== false,
  );

  if (permitted.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:border-border",
          className,
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {permitted.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={action.key}>
              {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem destructive={action.destructive} onSelect={action.onSelect}>
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
