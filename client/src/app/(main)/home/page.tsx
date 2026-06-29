"use client";

import { useUser } from "@clerk/nextjs";
import {
  RefreshCw,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { useStoreUser } from "@/hooks/useStoreUser";
import { api } from "../../../../convex/_generated/api";
import { BrowserRecapSection } from "./BrowserRecapSection";
import { ImportantActionsSection } from "./ImportantActionsSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const firstName = user?.firstName ?? "there";

  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [counts, setCounts] = useState({
    gmail: 0,
    calendar: 0,
    slack: 0,
    counts: 0,
    tasks: 0,
  });

  // Daily Digest States
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestRunning, setDigestRunning] = useState(false);

  const { userId: convexUserId } = useStoreUser();
  const digestState = useQuery(api.dailyDigest.getDigestState);
  const startDigestRun = useMutation(api.dailyDigest.updateDigestState);

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

  const handleRunDigest = async () => {
    if (!convexUserId || digestRunning) return;
    setDigestRunning(true);
    try {
      // 1. Immediately update status in DB to "running"
      await startDigestRun({ status: "running" });

      // 2. Fire Next.js API route to run the digest
      const res = await fetch("/api/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: convexUserId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Failed to generate daily digest briefing",
        );
      }
    } catch (err: any) {
      console.error("[Daily Digest] Run error:", err);
      // Update DB to failed with the error
      await startDigestRun({
        status: "failed",
        error: err.message || "Failed to trigger daily digest briefing",
      });
    } finally {
      setDigestRunning(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* ── Top: Greeting + Refresh + Daily Digest ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-md mt-1 text-muted-foreground">
            Here's your brief for today
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh Button */}
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              onClick={handleRefresh}
              disabled={syncing}
              className="flex items-center gap-2 rounded-md cursor-pointer"
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
      </div>

      {/* ── Morning Brief Card ── */}
      <div className="rounded-xl border border-border bg-linear-to-br from-transparent via-purple-500/5 to-purple-500/20 p-5 flex items-center gap-5 mt-8 min-h-[100px]">
        <div className="flex items-center justify-center w-14 h-14 bg-linear-to-br from-white to-purple-400 border rounded-md shrink-0">
          <Image
            src="/logo.svg"
            alt="logo"
            width={30}
            height={30}
            className="shrink-0"
          />
        </div>
        <div className="w-full">
          <p className="font-semibold text-foreground text-xl">Morning Brief</p>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm max-w-xl ">
              You have today {counts.gmail === 0 ? "no" : counts.gmail} unread
              messages from gmail,{" "}
              {counts.calendar === 0 ? "no" : counts.calendar} event
              {counts.calendar !== 1 ? "s" : ""} today,{" "}
              {counts.slack === 0 ? "no" : counts.slack} slack messages waiting
              for you, and {counts.tasks === 0 ? "no" : counts.tasks} task
              {counts.tasks !== 1 ? "s" : ""} due today.
            </p>

            <div className="flex items-center gap-4">
              {/* Daily Digest Trigger Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setDigestOpen(true)}
                className="flex items-center gap-2 text-xs rounded-md cursor-pointer"
              >
                <Mail size={13} />
                Daily Digest
              </Button>

              <Button
                className="text-xs rounded-md cursor-pointer"
                onClick={() =>
                  router.push(
                    "/home/agent?mode=brain&input=give me insights about my past activity accross email , browser and others.",
                  )
                }
              >
                Ask for Insights
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Important Actions ── */}
      <ImportantActionsSection
        triggerFetchRef={triggerFetchRef}
        onSyncComplete={handleSyncComplete}
        onCountsChange={setCounts}
      />

      {/* ── Browser Activity Recap & Standup ── */}
      <BrowserRecapSection />

      {/* ── Daily Digest Dialog ── */}
      <Dialog open={digestOpen} onOpenChange={setDigestOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Mail className="" size={20} />
              Daily Briefing Digest
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Autonomous Pipeline to summarize daily workflows and send daily
              briefings.
            </DialogDescription>
          </DialogHeader>

          {/* State Display */}
          <div className="mt-4 space-y-4">
            {/* Status Section */}
            <div className="rounded-xl border p-4 bg-muted/30 flex items-start gap-3">
              {digestState?.status === "running" || digestRunning ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 shrink-0 animate-spin">
                  <Loader2 size={18} />
                </div>
              ) : digestState?.status === "success" ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-500 shrink-0">
                  <CheckCircle size={18} />
                </div>
              ) : digestState?.status === "failed" ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 shrink-0">
                  <AlertCircle size={18} />
                </div>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-500/10 text-gray-500 shrink-0">
                  <FileText size={18} />
                </div>
              )}

              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">
                  {digestState?.status === "running" || digestRunning
                    ? "Generating Digest..."
                    : digestState?.status === "success"
                      ? "Briefing Sent Successfully"
                      : digestState?.status === "failed"
                        ? "Run Failed"
                        : "Digest System Idle"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {digestState?.status === "running" || digestRunning
                    ? "Analyzing task database with AI agent, building Docx attachment, and sending email via Composio..."
                    : digestState?.status === "success"
                      ? "A custom Word report was compiled and emailed to your inbox."
                      : digestState?.status === "failed"
                        ? `Error: ${digestState?.error || "Unknown error occurred"}`
                        : "Ready to analyze and compile your workload summary."}
                </p>
              </div>
            </div>

            {/* Run Times */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-border rounded-xl p-3 bg-muted/10 space-y-1">
                <span className="text-muted-foreground block font-medium">
                  Last Run
                </span>
                <span className="font-semibold text-foreground block">
                  {digestState?.lastRun
                    ? new Date(digestState.lastRun).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </span>
              </div>
              <div className="border border-border rounded-xl p-3 bg-muted/10 space-y-1">
                <span className="text-muted-foreground block font-medium">
                  Next Scheduled Run
                </span>
                <span className="font-semibold text-foreground block">
                  {digestState?.nextRun
                    ? new Date(digestState.nextRun).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Tomorrow at 9:00 AM"}
                </span>
              </div>
            </div>
          </div>

          {/* Run Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDigestOpen(false)}
              className="text-xs rounded-md cursor-pointer"
              disabled={digestState?.status === "running" || digestRunning}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleRunDigest}
              disabled={
                digestState?.status === "running" ||
                digestRunning ||
                !convexUserId
              }
              className="text-xs rounded-md bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 cursor-pointer"
            >
              {(digestState?.status === "running" || digestRunning) && (
                <Loader2 className="animate-spin" size={13} />
              )}
              {digestState?.lastRun ? "Rerun on the Spot" : "Run Daily Digest"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
