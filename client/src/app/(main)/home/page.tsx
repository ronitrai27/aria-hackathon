"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { ImportantActionsSection } from "./ImportantActionsSection";
import { BrowserRecapSection } from "./BrowserRecapSection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Brief Card ───────────────────────────────────────────────────────────────

function BriefCard({
  icon,
  title,
  badge,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <span
          className="ml-auto text-xs font-semibold rounded-full px-2.5 py-0.5"
          style={{ background: `${color}18`, color }}
        >
          {badge}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "there";

  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Populated by ImportantActionsSection so Refresh button can trigger a real fetch
  const triggerFetchRef = useRef<(() => Promise<void>) | null>(null);

  // Called by section when DB data loads (page reload) OR after a manual fetch
  const handleSyncComplete = useCallback((ts: Date) => {
    setLastSynced(ts);
  }, []);

  // Refresh button → calls the route, fetches fresh data, updates DB
  const handleRefresh = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await triggerFetchRef.current?.();
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return (
    <div className="flex flex-col   ">
      {/* ── Top: Greeting + Refresh ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-md  mt-1">Here's your brief for today</p>
        </div>

        {/* Right: Refresh */}
        <div className="flex flex-col items-end gap-1 shrink-0 ">
          <Button
            type="button"
            onClick={handleRefresh}
            disabled={syncing}
            className="flex items-center gap-2 rounded-md"
          >
            {syncing ? <Spinner /> : <RefreshCw size={13} />}
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground">
            {syncing
              ? "Syncing…"
              : lastSynced
                ? `Last synced: ${fmtTime(lastSynced)}`
                : "Not synced yet"}
          </span>
        </div>
      </div>

      {/* ── Morning Brief Card ── */}
      <div className="rounded-xl border border-border bg-linear-to-br from-transparent to-purple-500/10 p-5 flex items-center gap-5 mt-8">
        <div className="flex items-center justify-center w-14 h-14 bg-linear-to-br from-white to-purple-400 border rounded-md shrink-0">
          <Image
            src="/logo.svg"
            alt="logo"
            width={30}
            height={30}
            className=" shrink-0 invert"
          />
        </div>
        <div className="w-full">
          <p className="font-semibold text-foreground text-xl">Morning Brief</p>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm max-w-xl">
              You have today 6 unread messages from gmail, 3 events today and 7
              slack messages waiting for you.
            </p>
            <Button className="text-xs rounded-md ">Ask for Insights</Button>
          </div>
        </div>
      </div>

      {/* ── Important Actions ── */}
      <ImportantActionsSection
        triggerFetchRef={triggerFetchRef}
        onSyncComplete={handleSyncComplete}
      />

      {/* ── Browser Activity Recap & Standup ── */}
      <BrowserRecapSection />
    </div>
  );
}
