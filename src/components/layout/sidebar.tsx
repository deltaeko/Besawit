"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { appNavigation, type NavigationItem } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

export function AppSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const navGroups = useMemo(
    () =>
      appNavigation
        .map((item) => ({
          ...item,
          children:
            item.children?.filter((child) => child.roles.some((childRole) => childRole === role)) ??
            [],
        }))
        .filter(
          (item) => item.roles.some((itemRole) => itemRole === role) || (item.children?.length ?? 0) > 0,
        )
        .reduce<Record<string, NavigationItem[]>>((acc, item) => {
          acc[item.group] = [...(acc[item.group] ?? []), item];
          return acc;
        }, {}),
    [role],
  );

  function toggleGroup(title: string) {
    setOpenGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <aside className="sticky top-0 hidden h-screen min-h-0 w-[286px] shrink-0 border-r border-border/80 bg-white/90 backdrop-blur lg:flex lg:flex-col">
      <div className="border-b border-border/80 px-6 py-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary/80">
          Besawit
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Operations Core
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Dashboard operasional untuk transaksi sawit, toko, persediaan, dan keuangan.
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
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
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center rounded-lg px-4 py-2 text-sm transition-colors",
                              childActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
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
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
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
    </aside>
  );
}
