"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  Building2,
  FileCode2,
  Flame,
  GitCompareArrows,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  RotateCcw,
  Search,
  Settings,
  Trophy,
} from "lucide-react";
import { cn, isTypingTarget } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { CommandPalette } from "@/components/layout/command-palette";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/stores/ui-store";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "d" },
  { href: "/companies", label: "Companies", icon: Building2, key: "c" },
  { href: "/problems", label: "Problems", icon: FileCode2, key: "p" },
  { href: "/sheets", label: "Sheets", icon: ListChecks, key: "s" },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, key: "b" },
  { href: "/revisions", label: "Revisions", icon: RotateCcw, key: "r" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, key: "a" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, key: "l" },
  { href: "/compare", label: "Compare", icon: GitCompareArrows, key: "m" },
];

export interface PinnedCompany {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export function AppShell({
  children,
  pinned = [],
  streak = 0,
}: {
  children: React.ReactNode;
  pinned?: PinnedCompany[];
  streak?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Keyboard shortcuts: "?" opens the cheatsheet, "g" then a key navigates.
  React.useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout>;

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((s) => !s);
        return;
      }
      if (e.key === "g") {
        pendingG = true;
        clearTimeout(timer);
        timer = setTimeout(() => (pendingG = false), 900);
        return;
      }
      if (pendingG) {
        const item = NAV.find((n) => n.key === e.key);
        pendingG = false;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-dvh">
      <CommandPalette />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-card transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
          <Link href="/" aria-label="Home" className="flex items-center">
            {collapsed ? <LogoMark size={30} /> : <Logo />}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 scrollbar-thin" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}

          {/* Pinned companies */}
          {pinned.length > 0 && (
            <div className="mt-5">
              {!collapsed && (
                <p className="eyebrow mb-2 flex items-center gap-1.5 px-3">
                  <Pin className="size-3" /> Pinned
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {pinned.slice(0, 5).map((c) => {
                  const active = pathname === `/companies/${c.slug}`;
                  const link = (
                    <Link
                      key={c.slug}
                      href={`/companies/${c.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-0" : "px-3",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={22} />
                      {!collapsed && <span className="truncate">{c.name}</span>}
                    </Link>
                  );
                  return collapsed ? (
                    <Tooltip key={c.slug}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{c.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="flex flex-col gap-1 px-3 pb-4">
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: Settings, key: "," }}
            active={pathname.startsWith("/settings")}
            collapsed={collapsed}
          />
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0" : "px-3"
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-border/70 bg-background transition-[padding] duration-300",
          collapsed ? "lg:pl-[68px]" : "lg:pl-60"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center lg:hidden" aria-label="Home">
            <LogoMark size={28} />
          </Link>
          <button
            onClick={() => setCommandOpen(true)}
            className="glass flex h-9 flex-1 items-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-accent sm:max-w-sm"
            aria-label="Open search"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search everything…</span>
            <kbd className="eyebrow hidden rounded border border-border px-1.5 py-0.5 sm:block">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {streak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="figure hidden items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 sm:flex dark:text-amber-400">
                    <Flame className="size-3.5 animate-flame motion-reduce:animate-none" />
                    {streak}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{streak}-day streak — solve today to keep it</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShortcutsOpen(true)}
                  aria-label="Keyboard shortcuts"
                  className="hidden size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
                >
                  <Keyboard className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Shortcuts (?)</TooltipContent>
            </Tooltip>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        className={cn(
          "pb-24 transition-[padding] duration-300 lg:pb-10",
          collapsed ? "lg:pl-[68px]" : "lg:pl-60"
        )}
      >
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl px-2 py-2 lg:hidden"
        aria-label="Mobile"
      >
        {NAV.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("size-5 transition-transform", active && "scale-110 text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Shortcuts cheatsheet */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 text-sm">
            <ShortcutRow keys={["⌘/Ctrl", "K"]} label="Command palette" />
            <ShortcutRow keys={["/"]} label="Quick search" />
            <ShortcutRow keys={["?"]} label="This cheatsheet" />
            {NAV.map((n) => (
              <ShortcutRow key={n.href} keys={["g", n.key]} label={`Go to ${n.label}`} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; key: string };
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {/* animated active indicator */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 h-5 w-[3px] rounded-full bg-lime transition-all duration-300",
          active ? "opacity-100" : "opacity-0",
          collapsed ? "-left-3" : "-left-3"
        )}
      />
      <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
      {!collapsed && item.label}
    </Link>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="eyebrow rounded border border-border bg-secondary px-1.5 py-0.5">
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
