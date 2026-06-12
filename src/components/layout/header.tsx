"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LogOut, Menu, X } from "lucide-react";

import { AppLogo } from "@/components/branding/app-logo";
import { appNavigation, resolveNavigationContext } from "@/components/layout/navigation";
import { canAccessPermission, type RolePermissionMap } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResolvedBrandingSettings } from "@/services/branding-service";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

export function AppHeader({
  branding,
  userName,
  role,
  permissions,
}: {
  branding: ResolvedBrandingSettings;
  userName: string;
  role: AppRole;
  permissions: RolePermissionMap;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const navItems = useMemo(
    () =>
      appNavigation
        .filter((item) => item.roles.includes(role))
        .map((item) => ({
          ...item,
          children:
            item.children?.filter(
              (child) =>
                child.roles.includes(role) &&
                canAccessPermission(role, permissions, child.permission),
            ) ??
            [],
        }))
        .filter(
          (item) =>
            (item.permission ? canAccessPermission(role, permissions, item.permission) : false) ||
            (item.children?.length ?? 0) > 0,
        ),
    [permissions, role],
  );

  const navGroups = useMemo(
    () =>
      navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
        acc[item.group] = [...(acc[item.group] ?? []), item];
        return acc;
      }, {}),
    [navItems],
  );
  const navigationContext = useMemo(
    () => resolveNavigationContext(pathname, navItems) ?? {
      group: "Dashboard",
      pageTitle: "Workspace",
      sectionTitle: branding.appDisplayName,
    },
    [branding.appDisplayName, navItems, pathname],
  );

  function toggleGroup(title: string) {
    setOpenGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  async function handleLogout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.assign("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              size="icon"
              type="button"
              variant="outline"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {navigationContext.pageTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="hidden border border-primary/15 bg-primary/8 text-primary sm:inline-flex" variant="neutral">
              {role.replaceAll("_", " ")}
            </Badge>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-foreground">{userName}</div>
              <div className="text-xs text-muted-foreground">Pengguna aktif</div>
            </div>
            <form action="/api/auth/logout" method="post" onSubmit={handleLogout}>
              <Button className="bg-white" size="sm" type="submit" variant="outline">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-white text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <div>
                <AppLogo
                  fallbackImageUrl={branding.logoUrl}
                  imageAlt={branding.appDisplayName}
                  imageUrl={branding.logoSquareUrl}
                  mark={branding.mark}
                  markClassName="h-10 w-10 rounded-2xl text-xs"
                  name={branding.appDisplayName}
                />
                <div className="mt-3 text-xl font-semibold">Operations Core</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dashboard operasional transaksi, stok, dan keuangan.
                </p>
              </div>
              <Button
                onClick={() => setMobileMenuOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Badge className="border border-primary/15 bg-primary/8 text-primary" variant="neutral">
                  {role.replaceAll("_", " ")}
                </Badge>
              </div>
              <div className="mt-3 text-sm font-semibold">{userName}</div>
              <div className="text-xs text-muted-foreground">Pengguna aktif</div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              {Object.entries(navGroups).map(([group, items]) => (
                <div className="mb-5 space-y-1.5 last:mb-0" key={group}>
                  <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {group}
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href
                      ? pathname.startsWith(item.href)
                      : (item.children ?? []).some((child) => pathname.startsWith(child.href));

                    if (item.children?.length) {
                      const isOpen = openGroups[item.title] ?? active;

                      return (
                        <div className="space-y-1" key={item.title}>
                          <button
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                              active
                                ? "bg-primary/8 text-primary"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground",
                            )}
                            onClick={() => toggleGroup(item.title)}
                            type="button"
                          >
                            <span
                              className={cn(
                                "rounded-lg border p-1.5",
                                active ? "border-primary/20 bg-primary/10" : "border-border bg-background",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="flex-1">{item.title}</span>
                            {isOpen ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </button>
                          <div
                            className={cn(
                              "space-y-1 overflow-hidden pl-4 transition-all duration-200",
                              isOpen ? "max-h-[80rem] opacity-100" : "max-h-0 opacity-0",
                            )}
                          >
                            {item.children.map((child) => {
                              const childActive = pathname.startsWith(child.href);

                              return (
                                <Link
                                  className={cn(
                                    "flex items-center rounded-lg px-4 py-2 text-sm transition-colors",
                                    childActive
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  )}
                                  href={child.href}
                                  key={child.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {child.title}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return item.href ? (
                      <Link
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                        href={item.href}
                        key={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span
                          className={cn(
                            "rounded-lg border p-1.5",
                            active ? "border-primary/20 bg-white/10" : "border-border bg-background",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span>{item.title}</span>
                      </Link>
                    ) : null;
                  })}
                </div>
              ))}
            </nav>

            <div className="border-t border-border p-4">
              <form action="/api/auth/logout" method="post" onSubmit={handleLogout}>
                <Button className="w-full bg-white" type="submit" variant="outline">
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
