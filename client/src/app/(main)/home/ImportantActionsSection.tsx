"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  MutableRefObject,
} from "react";
import { useAgentStore } from "@/hooks/useAgentStore";
import { useStoreUser } from "@/hooks/useStoreUser";
import Image from "next/image";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Tool icons (from /public) ───────────────────────────────────────────────

function GmailIcon() {
  return (
    <Image
      src="/gmail.png"
      alt="Gmail"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function CalendarIcon() {
  return (
    <Image
      src="/calendar.png"
      alt="Google Calendar"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function SlackIcon() {
  return (
    <Image
      src="/slack.png"
      alt="Slack"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function OutlookIcon() {
  return (
    <Image
      src="/outlook.jpeg"
      alt="Outlook"
      width={28}
      height={28}
      className="object-contain rounded-md"
    />
  );
}

function TasksIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="8" fill="#7C3AED" />
      <circle
        cx="24"
        cy="24"
        r="10"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M19 24l3.5 3.5 6.5-7"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Connection dot ───────────────────────────────────────────────────────────

function ConnDot({ connected }: { connected: boolean | null }) {
  if (connected === null) {
    return <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />;
  }
  return (
    <span
      className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`}
    />
  );
}

// ─── Alias map ────────────────────────────────────────────────────────────────
const TOOL_ALIASES: Record<string, string[]> = {
  gmail: ["gmail", "Gmail"],
  calendar: ["calendar", "Calendar", "googlecalendar", "google calendar"],
  slack: ["slack", "Slack"],
  outlook: ["outlook", "Outlook"],
};

function matchesAny(value: string, aliases: string[]): boolean {
  const v = value.toLowerCase();
  return aliases.some((a) => a.toLowerCase() === v);
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  toolName,
  connected,
  loadingConn,
  label,
  sublabel,
  ctaLabel,
  ctaHref,
  errorMsg,
  isDemo,
}: {
  icon: React.ReactNode;
  toolName: string;
  connected: boolean | null;
  loadingConn: boolean;
  label: string;
  sublabel: string;
  ctaLabel: string;
  ctaHref?: string;
  errorMsg?: string;
  isDemo?: boolean;
}) {
  const openConnectionDialog = useAgentStore((s) => s.openConnectionDialog);

  const handleCta = () => {
    if (isDemo) {
      if (ctaHref) window.open(ctaHref, "_blank");
      return;
    }
    if (connected) {
      if (ctaHref) window.open(ctaHref, "_blank");
    } else {
      openConnectionDialog(toolName);
    }
  };

  const ctaText = isDemo ? ctaLabel : connected ? ctaLabel : "Connect Now";

  return (
    <div
      className="rounded-xl border border-border bg-neutral-50 p-5 flex flex-col gap-4 min-w-0"
      style={{ flex: "1 1 0" }}
    >
      <div className="flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        {!isDemo && (
          <div className="flex items-center gap-1.5 ml-auto">
            <ConnDot connected={loadingConn ? null : connected} />
            <span className="text-xs text-muted-foreground">
              {loadingConn
                ? "Checking…"
                : connected
                  ? "Connected"
                  : "Not connected"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-foreground leading-tight">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{sublabel}</span>
        {errorMsg && (
          <span className="text-xs text-red-400 mt-0.5 leading-tight">
            ⚠ {errorMsg}
          </span>
        )}
      </div>

      <Button
        type="button"
        onClick={handleCta}
        className="mt-auto w-full border border-border rounded-md bg-white text-black py-1.5 text-xs font-medium transition-colors hover:bg-accent "
      >
        {ctaText}
      </Button>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function ImportantActionsSection({
  onSyncComplete,
  triggerFetchRef,
}: {
  onSyncComplete?: (ts: Date) => void;
  triggerFetchRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}) {
  // useStoreUser gives us the Convex _id — this is what Composio uses
  const { userId: convexUserId, isLoading: userLoading } = useStoreUser();

  // DB user record for connecters fallback
  const dbUser = useQuery(api.user.getCurrentUser);
  const dbConnectors: string[] = dbUser?.connecters ?? [];

  // ── Composio connection check (uses Convex _id, same as test page) ────────
  const [apiConnectors, setApiConnectors] = useState<string[] | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);

  useEffect(() => {
    if (!convexUserId) return;
    setLoadingConn(true);
    fetch(
      `/api/composio/status?userId=${encodeURIComponent(String(convexUserId))}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.activeToolkits)) {
          setApiConnectors(
            data.activeToolkits.map((t: string) => t.toLowerCase()),
          );
        } else {
          setApiConnectors([]);
        }
      })
      .catch(() => setApiConnectors([]))
      .finally(() => setLoadingConn(false));
  }, [convexUserId]);

  // Connected = Composio API OR DB fallback
  const isConnected = useCallback(
    (tool: string) => {
      const aliases = TOOL_ALIASES[tool] ?? [tool];
      const inApi =
        apiConnectors?.some((slug) => matchesAny(slug, aliases)) ?? false;
      const inDb = dbConnectors.some((c) => matchesAny(c, aliases));
      return inApi || inDb;
    },
    [dbConnectors, apiConnectors],
  );

  // ── Slack channel (editable) ──────────────────────────────────────────────
  const [slackChannel, setSlackChannel] = useState("all-wekraft");
  const [editingChannel, setEditingChannel] = useState(false);
  const [channelDraft, setChannelDraft] = useState("all-wekraft");

  // ── Stored data from Convex ───────────────────────────────────────────────
  // Use convexUserId (string) as the storage key — consistent with Composio
  const storedData = useQuery(
    api.importantActions.getImportantActionsData,
    convexUserId ? { userId: String(convexUserId) } : "skip",
  );

  const storeSchedule = useMutation(api.importantActions.storeScheduleData);
  const [fetching, setFetching] = useState(false);

  const triggerFetch = useCallback(
    async (channel?: string) => {
      if (!convexUserId || fetching) return;
      setFetching(true);
      const ch = channel ?? slackChannel;
      try {
        const res = await fetch("/api/composio/test-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Pass Convex _id — exactly like the working test page
          body: JSON.stringify({
            userId: String(convexUserId),
            slackChannel: ch,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;

        const now = new Date();

        // Upsert — never creates duplicate row
        await storeSchedule({
          userId: String(convexUserId),
          fetchedAt: now.getTime(),
          gmailUnreadCount: data.gmail?.unreadCount ?? 0,
          gmailEmails: (data.gmail?.emails ?? []).map((e: any) => ({
            id: e.id ?? "",
            subject: e.subject,
            from: e.from,
            snippet: e.snippet,
            date: e.date,
          })),
          gmailError: data.gmail?.error,
          calendarEvents: (data.calendar?.events ?? []).map((e: any) => ({
            id: e.id ?? "",
            summary: e.summary,
            start: e.start,
            end: e.end,
          })),
          calendarError: data.calendar?.error,
          slackMessageCount: data.slack?.messageCount ?? 0,
          slackMessages: (data.slack?.messages ?? []).map((m: any) => ({
            ts: m.ts,
            text: m.text,
            user: m.user,
          })),
          slackChannel: data.slack?.channel ?? ch,
          slackError: data.slack?.error,
        });

        // Notify parent with the real sync timestamp
        onSyncComplete?.(now);
      } catch (err) {
        console.error("[ImportantActions] fetch error:", err);
      } finally {
        setFetching(false);
      }
    },
    [convexUserId, fetching, slackChannel, storeSchedule, onSyncComplete],
  );

  // Wire up triggerFetchRef so parent component can trigger it
  useEffect(() => {
    if (triggerFetchRef) {
      triggerFetchRef.current = triggerFetch;
    }
  }, [triggerFetchRef, triggerFetch]);

  // Sync channel from stored value
  useEffect(() => {
    if (storedData?.slackChannel) {
      setSlackChannel(storedData.slackChannel);
      setChannelDraft(storedData.slackChannel);
    }
  }, [storedData?.slackChannel]);

  // Push DB's real fetchedAt to parent so "Last synced" shows correct time on load
  useEffect(() => {
    if (storedData?.fetchedAt) {
      onSyncComplete?.(new Date(storedData.fetchedAt));
    }
    // Only run when storedData first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedData?._id]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const stillLoading = userLoading || loadingConn || dbUser === undefined;

  const gmailConnected = stillLoading ? null : isConnected("gmail");
  const calConnected = stillLoading ? null : isConnected("calendar");
  const slackConnected = stillLoading ? null : isConnected("slack");

  const tasks = useQuery(api.tasks.getTasks);
  const dueTodayTasksCount = useMemo(() => {
    if (!tasks) return 0;
    const now = new Date();
    return tasks.filter((task) => {
      if (task.status === "completed") return false;
      const start = new Date(task.estimation.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(task.estimation.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    }).length;
  }, [tasks]);

  const totalCount =
    (gmailConnected ? (storedData?.gmailUnreadCount ?? 0) : 0) +
    (calConnected ? (storedData?.calendarEvents.length ?? 0) : 0) +
    (slackConnected ? (storedData?.slackMessageCount ?? 0) : 0) +
    dueTodayTasksCount;

  const openConnectionDialog = useAgentStore((s) => s.openConnectionDialog);

  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-foreground text-base">
          Important Actions
        </h2>
        {totalCount > 0 && (
          <span className="text-xs font-semibold bg-violet-500/15 text-violet-500 rounded-full px-2.5 py-0.5">
            {totalCount}
          </span>
        )}
        {fetching && (
          <span className="text-xs text-muted-foreground animate-pulse ml-2">
            Syncing…
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex gap-3 flex-wrap">
        {/* Gmail */}
        <ActionCard
          icon={<GmailIcon />}
          toolName="Gmail"
          connected={gmailConnected}
          loadingConn={stillLoading}
          label={
            gmailConnected && storedData
              ? `${storedData.gmailUnreadCount} unread email${storedData.gmailUnreadCount !== 1 ? "s" : ""}`
              : "Gmail"
          }
          sublabel={
            gmailConnected && storedData
              ? "in Gmail (last 6h)"
              : "Connect to see unread emails"
          }
          ctaLabel="Review Emails"
          ctaHref="https://mail.google.com"
          errorMsg={storedData?.gmailError ? "Fetch failed" : undefined}
        />

        {/* Calendar */}
        <ActionCard
          icon={<CalendarIcon />}
          toolName="Calendar"
          connected={calConnected}
          loadingConn={stillLoading}
          label={
            calConnected && storedData
              ? `${storedData.calendarEvents.length} event${storedData.calendarEvents.length !== 1 ? "s" : ""} upcoming`
              : "Google Calendar"
          }
          sublabel={
            calConnected && storedData
              ? "in Google Calendar"
              : "Connect to see upcoming events"
          }
          ctaLabel="View Schedule"
          ctaHref="https://calendar.google.com"
          errorMsg={storedData?.calendarError ? "Fetch failed" : undefined}
        />

        {/* Slack — custom channel */}
        <div
          className="rounded-xl border border-border bg-neutral-50 p-5 flex flex-col gap-4 min-w-0"
          style={{ flex: "1 1 0" }}
        >
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <SlackIcon />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <ConnDot connected={stillLoading ? null : slackConnected} />
              <span className="text-xs text-muted-foreground">
                {stillLoading
                  ? "Checking…"
                  : slackConnected
                    ? "Connected"
                    : "Not connected"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-foreground leading-tight">
              {slackConnected && storedData
                ? `${storedData.slackMessageCount} new message${storedData.slackMessageCount !== 1 ? "s" : ""}`
                : "Slack"}
            </span>

            {slackConnected ? (
              editingChannel ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const ch =
                      channelDraft.replace(/^#/, "").trim() || "all-wekraft";
                    setSlackChannel(ch);
                    setChannelDraft(ch);
                    setEditingChannel(false);
                    triggerFetch(ch);
                  }}
                  className="flex items-center gap-1"
                >
                  <span className="text-xs text-muted-foreground">#</span>
                  <input
                    autoFocus
                    value={channelDraft}
                    onChange={(e) => setChannelDraft(e.target.value)}
                    className="text-xs border-b border-border bg-transparent outline-none w-full text-foreground"
                    placeholder="channel-name"
                  />
                  <button
                    type="submit"
                    className="text-xs text-violet-500 font-medium ml-1 shrink-0"
                  >
                    OK
                  </button>
                </form>
              ) : (
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={() => setEditingChannel(true)}
                  className="text-xs text-muted-foreground text-left hover:text-foreground transition-colors flex items-center gap-1"
                  title="Click to change channel"
                >
                  in #{slackChannel} (last 6h) <Edit2 className="w-3 h-3" />
                </Button>
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                Connect to see Slack messages
              </span>
            )}

            {storedData?.slackError && (
              <span className="text-xs text-red-400 mt-0.5 leading-tight">
                ⚠ Fetch failed
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              slackConnected
                ? window.open("https://slack.com", "_blank")
                : openConnectionDialog("Slack")
            }
            className="mt-auto w-full border border-border rounded-md py-1.5 text-xs font-medium transition-colors hover:bg-accent bg-white text-black"
          >
            {slackConnected ? "Open Slack" : "Connect Now"}
          </button>
        </div>

        {/* Outlook — always disconnected */}
        <ActionCard
          icon={<OutlookIcon />}
          toolName="Outlook"
          connected={false}
          loadingConn={false}
          label="Outlook"
          sublabel="Connect to see your inbox"
          ctaLabel="Open Outlook"
          ctaHref="https://outlook.com"
        />

        {/* Tasks — active, no connection state */}
        <ActionCard
          icon={<TasksIcon />}
          toolName="Tasks"
          connected={null}
          loadingConn={false}
          label={`${dueTodayTasksCount} task${dueTodayTasksCount !== 1 ? "s" : ""} due today`}
          sublabel="in Tasks"
          ctaLabel="View Tasks"
          ctaHref="/home/tasks"
          isDemo
        />
      </div>
    </div>
  );
}
