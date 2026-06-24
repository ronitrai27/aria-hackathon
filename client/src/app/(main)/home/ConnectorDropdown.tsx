"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Plug } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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

  const user = useQuery(api.user.getCurrentUser);
  const openConnectionDialog = useAgentStore(
    (state) => state.openConnectionDialog,
  );
  const connectedApps = user?.connecters ?? [];

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
            <div className="text-center font-semibold text-xs text-foreground pb-1.5">
              Available Connectors
            </div>
            <div className="border-b border-border/60 mb-2.5" />
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
