"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAgentStore } from "@/hooks/useAgentStore";
import { connectorIcons } from "@/lib/static";
import { Loader2, X, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export function ConnectionDialog() {
  const { isConnectionDialogOpen, connectionDialogApp, closeConnectionDialog } =
    useAgentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const user = useQuery(api.user.getCurrentUser);
  const toggleConnector = useMutation(api.user.toggleConnector);

  const connectedApps = user?.connecters ?? [];
  const appName = connectionDialogApp || "";
  const isConnected = connectedApps.includes(appName);
  const iconSrc = connectorIcons[appName];

  // Reset loading states when dialog opens/closes
  useEffect(() => {
    if (!isConnectionDialogOpen) {
      setIsLoading(false);
      setStatusText("");
    }
  }, [isConnectionDialogOpen]);

  if (!isConnectionDialogOpen || !appName) return null;

  const handleConnect = async () => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    setIsLoading(true);
    setStatusText("Initiating connection...");
    try {
      const res = await fetch("/api/composio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, appName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Already connected in Composio — just sync Convex DB
      if (data.alreadyConnected) {
        if (!connectedApps.includes(appName)) {
          await toggleConnector({ name: appName });
        }
        toast.success(`${appName} is already connected! Synced successfully.`);
        setIsLoading(false);
        setStatusText("");
        closeConnectionDialog();
        return;
      }

      // Open connection URL
      const win = window.open(data.redirectUrl, "_blank");
      if (!win) {
        toast.error("Popup blocked. Please allow popups for this site.");
        setIsLoading(false);
        return;
      }

      setStatusText("Waiting for authorization...");
      toast.info(
        `Connecting to ${appName}. Please authorize in the opened window...`,
      );

      // Start polling status
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          // 90 seconds timeout
          clearInterval(interval);
          setIsLoading(false);
          setStatusText("");
          toast.error(`Connection timeout for ${appName}.`);
          return;
        }

        try {
          const statusRes = await fetch(
            `/api/composio/status?userId=${user._id}`,
          );
          const statusData = await statusRes.json();
          if (
            statusData.activeToolkits &&
            statusData.activeToolkits.includes(appName.toLowerCase())
          ) {
            clearInterval(interval);

            // Save connection to DB via Convex mutation
            if (!connectedApps.includes(appName)) {
              await toggleConnector({ name: appName });
            }
            toast.success(`Successfully connected to ${appName}!`);
            setIsLoading(false);
            setStatusText("");
            closeConnectionDialog();
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    } catch (error: any) {
      toast.error(`Failed to connect to ${appName}: ${error.message}`);
      setIsLoading(false);
      setStatusText("");
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setIsLoading(true);
    setStatusText("Disconnecting account...");
    try {
      const res = await fetch("/api/composio/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, appName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local database (Convex)
      if (connectedApps.includes(appName)) {
        await toggleConnector({ name: appName });
      }

      toast.success(`Successfully disconnected ${appName}.`);
      closeConnectionDialog();
    } catch (error: any) {
      toast.error(`Failed to disconnect: ${error.message}`);
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeConnectionDialog}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon container */}
        <div className="h-16 w-16 rounded-2xl border border-border bg-white flex items-center justify-center shrink-0 p-3.5 shadow-sm mt-3 relative">
          {iconSrc ? (
            <Image
              src={iconSrc}
              alt={appName}
              width={40}
              height={40}
              className="object-contain"
            />
          ) : (
            <div className="h-10 w-10 bg-neutral-200 animate-pulse rounded-lg" />
          )}
          {isConnected && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-card">
              <CheckCircle2 className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* App Title & Status */}
        <div className="flex flex-col gap-1 items-center">
          <h2 className="font-bold text-lg text-foreground">{appName}</h2>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-sm ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-300"}`}
            />
            <span className="text-xs font-semibold text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full">
          {isLoading ? (
            <div className="w-full flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium animate-pulse">
                {statusText}
              </span>
            </div>
          ) : isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full py-2.5 rounded-sm bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              Disconnect Account
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              Connect {appName}
            </button>
          )}
        </div>

        {/* Informative Footer */}
        <div className="bg-muted/40 border border-border rounded-sm p-3 text-[10px] text-muted-foreground text-left leading-normal flex items-start gap-2 max-w-xs">
          <Lock className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0 mt-0.5" />
          <span>
            Aria platfrom uses composio for connection with third part. Totally
            secure and Transparent !
          </span>
        </div>
      </div>
    </div>
  );
}
