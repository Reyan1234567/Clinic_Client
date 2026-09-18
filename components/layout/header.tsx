"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { useTheme } from "@/lib/hooks/use-theme";
import { NAV_ITEMS } from "@/lib/nav";

function currentSection(pathname: string) {
  const match = NAV_ITEMS.find(
    (item) =>
      pathname === item.href ||
      item.children?.some((child) => pathname === child.href) ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
  );
  return (
    match?.label ??
    (pathname.startsWith("/profile") ? "My profile" : "Overview")
  );
}

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { theme, toggleTheme, ready } = useTheme();

  if (!user) return null;

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 pl-12 lg:pl-0">
        <span className="tech-label">Dental Specialty Dental</span>
        <span className="text-border">/</span>
        <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
          {currentSection(pathname)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          disabled={!ready}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
