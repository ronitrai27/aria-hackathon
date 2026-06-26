"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { RefreshCw, Layout, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecapData {
  summary: string;
  items: string[];
  topSites: { domain: string; durationMs: number; visits: number }[];
}

export function BrowserRecapSection() {
  const { user } = useUser();
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
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

            if (age < 12 * 60 * 60 * 1000 && !isFallback) {
              // 12 hours cache
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
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        console.log("[BrowserRecap Client] Loaded activity recap data:", data);
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
      {/* Card 1: Activity Recap & Standup */}
      <div className="rounded-xl border border-border bg-linear-to-br from-card to-purple-500/5 p-6 flex flex-col gap-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600">
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
        ) : recapError ? (
          <div className="p-6 text-center border border-dashed border-border rounded-lg bg-neutral-50/55">
            <span className="text-sm text-red-500 font-medium">
              ⚠ {recapError}
            </span>
            <Button
              type="button"
              onClick={handleRecapRefresh}
              className="mt-3 block mx-auto text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md"
            >
              Retry Fetching
            </Button>
          </div>
        ) : recapData ? (
          <div className="flex flex-col gap-4">
            {/* Standup Summary Paragraph */}
            <div className="text-sm font-medium text-foreground bg-purple-500/5 border border-purple-500/10 p-4 rounded-lg leading-relaxed shadow-xs">
              {recapData.summary}
            </div>

            {/* Insights List */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">
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
        ) : (
          <div className="p-6 text-center border border-dashed border-border rounded-lg bg-neutral-50/50">
            <p className="text-sm text-muted-foreground">
              No recap data loaded yet.
            </p>
            <Button
              type="button"
              onClick={handleRecapRefresh}
              className="mt-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md"
            >
              Fetch Analytics
            </Button>
          </div>
        )}
      </div>

      {/* Card 2: Focus Time & Top Sites */}
      <div className="rounded-xl border border-border bg-linear-to-br from-card to-purple-500/5 p-6 flex flex-col gap-4 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base leading-tight">
              Focus Time & Top Sites
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Most visited domains and research areas
            </p>
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
        ) : recapError ? (
          <div className="p-6 text-center border border-dashed border-border rounded-lg bg-neutral-50/50 flex-1 flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Unable to map top sites.
            </span>
          </div>
        ) : recapData && recapData.topSites && recapData.topSites.length > 0 ? (
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
                        className="font-medium text-foreground hover:text-purple-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                        onClick={() =>
                          window.open(`https://${site.domain}`, "_blank")
                        }
                      >
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
                        className="bg-linear-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-border rounded-lg bg-neutral-50/50 flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No active domains recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
