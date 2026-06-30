"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Activity,
  Calendar,
  ChevronRight,
  Globe,
  Layout,
  RefreshCw,
  Puzzle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";

interface RecapData {
  summary: string;
  items: string[];
  topSites: { domain: string; durationMs: number; visits: number }[];
}

const formatTaskDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();

  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dDate.getTime() - dNow.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)}d ago`,
      subtext: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  }
  if (diffDays === 0) {
    return {
      text: "Today",
      subtext: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  }
  if (diffDays === 1) {
    return {
      text: "Tomorrow",
      subtext: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  }
  if (diffDays <= 7) {
    return {
      text: `In ${diffDays}d`,
      subtext: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  }
  return {
    text: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    subtext: `Year ${date.getFullYear()}`,
  };
};

const getStatusDotColor = (status: string) => {
  switch (status) {
    case "not-started":
      return "bg-neutral-400";
    case "in-progress":
      return "bg-purple-500";
    case "completed":
      return "bg-emerald-500";
    case "on-hold":
      return "bg-amber-500";
    case "delayed":
      return "bg-red-500";
    default:
      return "bg-neutral-400";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "not-started":
      return "Not Started";
    case "in-progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "on-hold":
      return "On Hold";
    case "delayed":
      return "Delayed";
    default:
      return status;
  }
};

// ─── Priority bars ─────────────────────────────────────────────────────────────
const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-yellow-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-red-500 rounded-[1px]" />
    </div>
  ),
};

function EmptyExtensionState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-neutral-50/50 flex-1 min-h-[220px] animate-in fade-in duration-300">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 mb-3 shadow-xs border border-purple-200/50">
        <Puzzle size={18} />
      </div>

      <h4 className="text-sm font-semibold text-foreground tracking-tight max-w-[280px] leading-snug">
        Looks like u havent downlaoded extension yet !!
      </h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-normal">
        Get aria web tracker from microsoft edge / add-ons Now !!
      </p>
    </div>
  );
}

export function BrowserRecapSection() {
  const { user } = useUser();
  const [recapData, setRecapData] = useState<RecapData | null>(null);

  const tasks = useQuery(api.tasks.getTasks);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];

    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    // Only show tasks that are NOT completed AND have a deadline from today up to 1 week from now
    return tasks
      .filter((task) => {
        const isNotCompleted = task.status !== "completed";
        const dueDate = task.estimation.endDate;
        return (
          isNotCompleted &&
          dueDate >= startOfTodayMs &&
          dueDate <= oneWeekFromNow
        );
      })
      .sort((a, b) => a.estimation.endDate - b.estimation.endDate)
      .slice(0, 4);
  }, [tasks]);
  const [loadingRecap, setLoadingRecap] = useState(true);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [recapFetchedAt, setRecapFetchedAt] = useState<number | null>(null);

  const fetchBrowserRecap = useCallback(
    async (userId: string, force = false) => {
      setLoadingRecap(true);
      setRecapError(null);

      const cacheKey = `browser_recap_${userId}`;
      if (!force) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            const isFallback =
              parsed.data?.summary?.includes("Not enough significant") ||
              parsed.data?.summary?.includes("No recent browsing") ||
              !parsed.data?.topSites ||
              parsed.data.topSites.length === 0;

            if (age < 1 * 60 * 60 * 1000 && !isFallback) {
              // 1 hour cache
              setRecapData(parsed.data);
              setRecapFetchedAt(parsed.timestamp);
              setLoadingRecap(false);
              return;
            }
          } catch (e) {
            localStorage.removeItem(cacheKey);
          }
        }
      }

      try {
        const res = await fetch("/api/ai-vercel/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, forceRefresh: force }),
        });
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        console.log("[BrowserRecap Client] Loaded activity recap data:", data);
        if (data.cached) {
          console.log("[BrowserRecap Client] REDIS CACHE HIT!");
        } else {
          console.log(
            "[BrowserRecap Client] REDIS CACHE MISS (Freshly generated by OpenAI)",
          );
        }
        setRecapData(data);
        const now = Date.now();
        setRecapFetchedAt(now);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: now, data }),
        );
      } catch (err: any) {
        console.error("Error fetching browser recap:", err);
        setRecapError(err.message || "Failed to load activity recap.");
      } finally {
        setLoadingRecap(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user?.id) {
      fetchBrowserRecap(user.id);
    }
  }, [user?.id, fetchBrowserRecap]);

  const handleRecapRefresh = () => {
    if (user?.id) {
      fetchBrowserRecap(user.id, true);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSecs = Math.round(ms / 1000);
    const totalMins = Math.round(totalSecs / 60);
    if (totalMins < 1) {
      return `${totalSecs}s`;
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Helper for computing site progress percentage relative to the highest site duration
  const maxDuration = useMemo(() => {
    if (!recapData?.topSites || recapData.topSites.length === 0) return 1;
    return Math.max(...recapData.topSites.map((s) => s.durationMs));
  }, [recapData?.topSites]);

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 gap-6 mt-8">
      {/* Card 1: FLEX BOX   */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
        {/* Focus Time & Top Sites */}
        <div className="rounded-xl border border-border bg-neutral-50 p-4 flex flex-col gap-4 shadow-xs relative overflow-hidden flex-1">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-sm border bg-white">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">
                  Focus Time & Top Sites
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Most visited domains and research areas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {recapFetchedAt && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Synced:{" "}
                  {new Date(recapFetchedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRecapRefresh}
                disabled={loadingRecap}
                className="w-8 h-8 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 shrink-0 transition-colors"
                title="Force refresh focus time metrics"
              >
                <RefreshCw
                  size={14}
                  className={loadingRecap ? "animate-spin text-purple-500" : ""}
                />
              </Button>
            </div>
          </div>

          {loadingRecap ? (
            <div className="flex flex-col gap-4 animate-pulse py-2">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded-sm w-[40%]" />
                      <div className="h-4 bg-muted rounded-sm w-[20%]" />
                    </div>
                    <div className="h-2 bg-muted rounded-full w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : recapError ||
            !recapData ||
            !recapData.topSites ||
            recapData.topSites.length === 0 ? (
            <EmptyExtensionState />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-3.5">
                {recapData.topSites.map((site) => {
                  const percent = Math.max(
                    8,
                    Math.round((site.durationMs / maxDuration) * 100),
                  );
                  return (
                    <div key={site.domain} className="space-y-1 group">
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className="font-medium text-foreground  flex items-center gap-1.5 cursor-pointer"
                          onClick={() =>
                            window.open(`https://${site.domain}`, "_blank")
                          }
                        >
                          <Globe size={12} className="text-neutral-700" />{" "}
                          {site.domain}
                          <ChevronRight
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{site.visits} visits</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="font-semibold text-foreground bg-purple-500/10 text-purple-700 px-1.5 py-0.5 rounded-sm">
                            {formatDuration(site.durationMs)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-linear-to-r from-purple-500 to-purple-100 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-xl border border-border bg-neutral-50  p-4 flex flex-col gap-4 shadow-xs relative overflow-hidden flex-1">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-sm border bg-white">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base leading-tight">
                  Upcoming Deadlines
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tasks approaching their due dates
                </p>
              </div>
            </div>
            <Link href="/home/tasks" className="">
              <Button variant={"outline"} className="rounded-sm text-xs">
                View calendar <ChevronRight size={18} />
              </Button>
            </Link>
          </div>

          {tasks === undefined ? (
            <div className="flex flex-col gap-4 animate-pulse py-2">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-16 bg-muted rounded-lg" />
                    <div className="h-8 w-[1px] bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded-sm w-[60%]" />
                      <div className="h-3 bg-muted rounded-sm w-[40%]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-border rounded-lg bg-neutral-50/50 flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <p className="text-sm text-muted-foreground">
                No upcoming deadlines.
              </p>
              <Link href="/home/tasks">
                <Button
                  variant="outline"
                  className="mt-3 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                >
                  Create a Task
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcomingTasks.map((task) => {
                const dateInfo = formatTaskDate(task.estimation.endDate);
                return (
                  <div
                    key={task._id}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0  px-2 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Date Column */}
                      <div className="flex flex-col items-start justify-center min-w-[85px] shrink-0 pl-1">
                        <span className="text-xs capitalize">
                          {dateInfo.text}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {dateInfo.subtext}
                        </span>
                      </div>

                      {/* Separator line */}
                      <div className="h-8 w-[1px] bg-neutral-400 shrink-0" />

                      {/* Details Column */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-sm capitalize text-foreground truncate ">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Status */}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(
                                task.status,
                              )}`}
                            />
                            {getStatusLabel(task.status)}
                          </span>

                          {/* Priority Bars */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            {priorityBars[task.priority] || priorityBars.low}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card 2: */}

      <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-sm border bg-purple-400 text-white">
              <Layout size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base leading-tight">
                Activity Recap & Standup
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI analysis of yesterday's workspace activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recapFetchedAt && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Synced:{" "}
                {new Date(recapFetchedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRecapRefresh}
              disabled={loadingRecap}
              className="w-8 h-8 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 shrink-0 transition-colors"
              title="Force refresh activity metrics"
            >
              <RefreshCw
                size={14}
                className={loadingRecap ? "animate-spin text-purple-500" : ""}
              />
            </Button>
          </div>
        </div>

        {loadingRecap ? (
          <div className="flex flex-col gap-4 animate-pulse py-2">
            <div className="h-10 bg-muted rounded-md w-full" />
            <div className="space-y-2 mt-2">
              <div className="h-4 bg-muted rounded-sm w-[90%]" />
              <div className="h-4 bg-muted rounded-sm w-[85%]" />
              <div className="h-4 bg-muted rounded-sm w-[80%]" />
              <div className="h-4 bg-muted rounded-sm w-[92%]" />
              <div className="h-4 bg-muted rounded-sm w-[75%]" />
              <div className="h-4 bg-muted rounded-sm w-[88%]" />
            </div>
          </div>
        ) : recapError ||
          !recapData ||
          !recapData.topSites ||
          recapData.topSites.length === 0 ? (
          <EmptyExtensionState />
        ) : (
          <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Standup Summary Paragraph */}
            <div className="text-sm font-medium text-foreground bg-purple-500/5 border border-purple-500/10 p-4 rounded-lg leading-relaxed shadow-xs">
              {recapData.summary}
            </div>

            {/* Insights List */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-sm font-semibold mb-1">
                AI Suggestions & Observations
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {recapData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-purple-500/5 border border-transparent hover:border-purple-500/10 transition-all duration-200 group"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold transition-transform group-hover:scale-110">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
