"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { visibleNavItems } from "@/lib/nav";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HeranMark } from "@/components/brand/heran-mark";
import { LumenCredit } from "@/components/brand/lumen-credit";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { has, hasScope } = usePermissions();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const close = () => setOpen(false);

  if (!user) return null;

  const items = visibleNavItems(has, hasScope);
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const nav = (
    <nav className="flex flex-1 flex-col overflow-y-auto py-2">
      {items.map((item) => {
        const Icon = item.icon;
        const children = item.children ?? [];
        const isActive =
          pathname === item.href ||
          children.some((child) => pathname === child.href) ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

        return (
          <div key={item.label} className="border-b border-border/60">
            <Link
              href={children[0]?.href ?? item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-l-2 border-l-primary bg-accent pl-[14px] font-medium text-foreground"
                  : "border-l-2 border-l-transparent pl-[14px] text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>

            {isActive && children.length > 0 ? (
              <div className="pb-2">
                {children.map((child) => {
                  const childActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={close}
                      className={cn(
                        "block py-1.5 pl-11 pr-4 text-sm transition-colors",
                        childActive
                          ? "font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 border border-border bg-card p-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu overlay"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-svh w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <HeranMark size={32} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Heran Specialty Dental</p>
              <span className="tech-label">Clinic system</span>
            </div>
          </Link>
          <button
            type="button"
            className="p-1 text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {nav}

        <div className="mt-auto border-t border-border">
          <div
            className="group/account"
            onMouseEnter={() => setAccountOpen(true)}
            onMouseLeave={() => setAccountOpen(false)}
          >
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                accountOpen || profileActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                "group-hover/account:grid-rows-[1fr] group-focus-within/account:grid-rows-[1fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="border-b border-border/60">
                  <Link
                    href="/profile"
                    onClick={close}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      profileActive
                        ? "border-l-2 border-l-primary bg-accent pl-[14px] font-medium text-foreground"
                        : "border-l-2 border-l-transparent pl-[14px] text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setLogoutOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 border-l-2 border-l-transparent px-4 py-2.5 pl-[14px] text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">Log out</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAccountOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
              aria-expanded={accountOpen || profileActive}
              aria-label="Account menu"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-[11px] font-semibold">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="tech-label">Account</span>
                <p className="truncate text-xs font-medium">{user.fullName}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </button>
          </div>

          <LumenCredit className="border-t border-border/60 px-4 py-2 text-center font-mono text-[9px] uppercase tracking-[0.14em]" />
        </div>
      </aside>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="You’ll need to sign in again to continue using the clinic system."
        confirmLabel="Sign out"
        destructive
        pending={loggingOut}
        onConfirm={() => void confirmLogout()}
      />
    </>
  );
}
