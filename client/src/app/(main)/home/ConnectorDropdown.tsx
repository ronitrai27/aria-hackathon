"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Plug, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/hooks/useAgentStore";
import { api } from "../../../../convex/_generated/api";

const connectors = [
  { name: "Gmail", icon: "/gmail.png" },
  { name: "Slack", icon: "/slack.png" },
  { name: "GitHub", icon: "/github.png" },
  { name: "Reddit", icon: "/reddit.png" },
  { name: "Calendar", icon: "/calendar.png" },
  { name: "LinkedIn", icon: "/linkedin.png" },
  { name: "Google Meet", icon: "/meet.png" },
  { name: "Todoist", icon: "/todoist.jpg" },
  { name: "Attio", icon: "/attio.jpeg" },
  { name: "Hacker News", icon: "/hacker-news.jpeg" },
  { name: "HubSpot", icon: "/hubspot.png" },
  { name: "Jira", icon: "/jira.jpeg" },
  { name: "Linear", icon: "/linear.jpeg" },
  { name: "Notion", icon: "/notion.webp" },
  { name: "Outlook", icon: "/outlook.jpeg" },
  { name: "Typeform", icon: "/typeform.png" },
  { name: "Ashby", icon: "/ashby.webp" },
  { name: "YouTube", icon: "/youtub.png" },
  { name: "Google Docs", icon: "/docs.png" },
  { name: "Google Sheets", icon: "/sheets.png" },
];

export function ConnectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const user = useQuery(api.user.getCurrentUser);
  const toggleConnector = useMutation(api.user.toggleConnector);
  const openConnectionDialog = useAgentStore(
    (state) => state.openConnectionDialog,
  );
  const connectedApps = user?.connecters ?? [];

  // ── Auto-sync Composio → Convex when panel opens ──────────────────────────
  const syncFromComposio = useCallback(async () => {
    if (!user?._id) return;
    setIsSyncing(true);
    try {
      const res = await fetch(
        `/api/composio/status?userId=${encodeURIComponent(user._id)}`,
      );
      const data = await res.json();
      if (!Array.isArray(data.activeDisplayNames)) return;

      const composioConnected: string[] = data.activeDisplayNames;
      const dbConnected: string[] = user?.connecters ?? [];

      // Add apps that Composio has but Convex DB doesn't
      for (const name of composioConnected) {
        if (!dbConnected.includes(name)) {
          await toggleConnector({ name });
        }
      }

      // Remove apps that Convex DB has but Composio no longer has
      for (const name of dbConnected) {
        if (!composioConnected.includes(name)) {
          await toggleConnector({ name });
        }
      }
    } catch (err) {
      console.error("Composio sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, toggleConnector]);

  // Sync whenever the dropdown opens
  useEffect(() => {
    if (isOpen && user?._id) {
      syncFromComposio();
    }
  }, [isOpen, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover trigger container
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-md bg-neutral-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plug className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 pt-2 z-50 w-[360px] animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <div className="bg-popover border border-border rounded-2xl shadow-xl p-3">
            <div className="flex items-center justify-between pb-1.5 px-0.5">
              <span className="text-xs font-semibold text-foreground">
                Available Connectors
              </span>
              <button
                type="button"
                onClick={syncFromComposio}
                disabled={isSyncing}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Sync from Composio"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="border-b border-border/60 mb-2.5" />
            {isSyncing && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing connected accounts…
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {connectors.map((connector) => {
                const isConnected = connectedApps.includes(connector.name);

                return (
                  <div
                    key={connector.name}
                    className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    <Image
                      src={connector.icon}
                      alt={connector.name}
                      width={32}
                      height={32}
                      className="w-7 h-7 object-contain"
                    />
                    <span className="text-[10px] font-medium text-muted-foreground text-center animate-in">
                      {connector.name}
                    </span>
                    {isConnected ? (
                      <button
                        type="button"
                        onClick={() => openConnectionDialog(connector.name)}
                        className="w-full rounded-full py-0.5 px-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400 text-[9px] font-medium flex items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer hover:bg-emerald-100"
                      >
                        Connected
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openConnectionDialog(connector.name)}
                        className="w-full rounded-full py-0.5 px-0.5 bg-white border border-border text-[9px] font-medium flex items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer hover:bg-muted"
                      >
                        Connect <span className="font-semibold text-xs">+</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
