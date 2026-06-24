"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  GitBranch,
  Sparkles,
  CheckSquare,
  FileText,
  Plug,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { connectorIcons } from "@/lib/static";

export interface ComposioAction {
  name: string;
  description: string;
  type?: "trigger" | "action";
}

interface StepPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (appName: string, action: ComposioAction) => void;
  trigger: React.ReactNode;
}

type ViewState = "categories" | "apps" | "actions" | "placeholder";

interface Category {
  id: ViewState;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
}

export function StepPopover({
  isOpen,
  onClose,
  onSelectAction,
  trigger,
}: StepPopoverProps) {
  const user = useQuery(api.user.getCurrentUser);
  const connectedApps = user?.connecters ?? [];

  // State
  const [viewStack, setViewStack] = React.useState<ViewState[]>(["categories"]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const [selectedApp, setSelectedApp] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Composio fetched actions state
  const [actions, setActions] = React.useState<ComposioAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = React.useState(false);

  const activeView = viewStack[viewStack.length - 1];

  // Reset view when popover opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setViewStack(["categories"]);
      setSelectedCategory(null);
      setSelectedApp(null);
      setSearchQuery("");
      setActions([]);
    }
  }, [isOpen]);

  // Fetch actions from Composio proxy endpoint when App is selected
  React.useEffect(() => {
    if (selectedApp && activeView === "actions") {
      setIsLoadingActions(true);
      setActions([]);

      fetch(`/api/composio/tools?toolkit_slug=${selectedApp.toLowerCase()}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load actions");
          return res.json();
        })
        .then((data) => {
          const items = data.items || [];
          // Deduplicate and filter out actions
          const mapped: ComposioAction[] = items.map((item: any) => ({
            name: item.name,
            description: item.description || "No description provided.",
            type:
              item.name.toLowerCase().includes("trigger") ||
              item.name.toLowerCase().includes("receive") ||
              item.name.toLowerCase().includes("on_")
                ? "trigger"
                : "action",
          }));
          setActions(mapped.slice(0, 20)); // Limit to top 20 actions
        })
        .catch((err) => {
          console.error("Error fetching Composio actions:", err);
          toast.error(`Failed to retrieve tools for ${selectedApp}`);
        })
        .finally(() => {
          setIsLoadingActions(false);
        });
    }
  }, [selectedApp, activeView]);

  // Navigate to new view
  const navigateTo = (view: ViewState) => {
    setViewStack((prev) => [...prev, view]);
    setSearchQuery(""); // Clear search on navigation
  };

  // Back navigation
  const navigateBack = () => {
    if (viewStack.length > 1) {
      setViewStack((prev) => prev.slice(0, prev.length - 1));
      setSearchQuery("");
    }
  };

  // Select a category
  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.label);
    if (category.id === "apps") {
      navigateTo("apps");
    } else {
      navigateTo("placeholder");
    }
  };

  // Select an App
  const handleAppClick = (appName: string) => {
    setSelectedApp(appName);
    navigateTo("actions");
  };

  // Select Action/Trigger
  const handleActionClick = (action: ComposioAction) => {
    if (selectedApp) {
      const cleanName = cleanActionName(action.name, selectedApp);
      toast.success(`Configured: ${cleanName} in ${selectedApp}`);
      if (onSelectAction) {
        onSelectAction(selectedApp, {
          ...action,
          name: cleanName,
        });
      }
      onClose();
    }
  };

  // Clean action names to make them human readable
  const cleanActionName = (name: string, appName: string) => {
    let cleaned = name;
    const prefix = `${appName.toLowerCase()}_`;
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length);
    }
    return cleaned
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Categories definition
  const categories: Category[] = [
    {
      id: "apps",
      label: "Apps",
      description: "Automate actions in apps like Gmail, Notion, and HubSpot",
      icon: Zap,
      iconColor: "text-blue-500",
      iconBg:
        "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40",
    },
    {
      id: "placeholder",
      label: "Flow control",
      description: "Add logic like paths, waiting, and looping",
      icon: GitBranch,
      iconColor: "text-emerald-500",
      iconBg:
        "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40",
    },
    {
      id: "placeholder",
      label: "AI",
      description: "Add smart automations like summarizing and extracting",
      icon: Sparkles,
      iconColor: "text-purple-500",
      iconBg:
        "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40",
    },
    {
      id: "placeholder",
      label: "Tasks",
      description: "Start run when something happened in tasks",
      icon: CheckSquare,
      iconColor: "text-amber-500",
      iconBg:
        "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40",
    },
    {
      id: "placeholder",
      label: "Form",
      description: "Runs when user creates some form -> and anything submits",
      icon: FileText,
      iconColor: "text-pink-500",
      iconBg:
        "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40",
    },
  ];

  // Filter categories by query
  const filteredCategories = categories.filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // App listing logic
  const allAppNames = Object.keys(connectorIcons);

  // Filter apps
  const matchedApps = allAppNames.filter((appName) =>
    appName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayConnectedApps = matchedApps.filter((app) =>
    connectedApps.includes(app),
  );
  const displayAllApps = matchedApps;

  // Action/Trigger list logic for selected app
  const filteredActions = actions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Title render logic
  const getTitle = () => {
    switch (activeView) {
      case "categories":
        return "Add a step";
      case "apps":
        return "Select App";
      case "actions":
        return selectedApp || "Select Action";
      case "placeholder":
        return selectedCategory || "Integrations";
      default:
        return "Add a step";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={16}
        className="w-[380px] max-h-[500px] p-0 flex flex-col bg-background border border-border shadow-2xl rounded-2xl overflow-hidden z-50"
      >
        {/* Header Section */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0">
          {viewStack.length > 1 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={navigateBack}
              className="h-7 w-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1">
            {getTitle()}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-7 w-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-900 text-muted-foreground shrink-0 cursor-pointer"
          >
            <span className="text-xs font-semibold">✕</span>
          </Button>
        </div>

        {/* Search Bar - Hidden in placeholder views */}
        {activeView !== "placeholder" && (
          <div className="px-4 py-2 border-b border-border/40 bg-muted/20 shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeView === "categories"
                    ? "Search apps and actions..."
                    : activeView === "apps"
                      ? "Search integrations..."
                      : `Search actions for ${selectedApp}...`
                }
                className="pl-8 pr-3 h-9 w-full rounded-xl bg-background border-neutral-200 dark:border-zinc-800 text-xs focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-offset-0"
              />
            </div>
          </div>
        )}

        {/* Content Section with custom scroll-bar */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
          {/* 1. CATEGORIES VIEW */}
          {activeView === "categories" && (
            <div className="flex flex-col gap-1.5">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className="flex items-center gap-3.5 p-2.5 rounded-xl border border-neutral-100/60 dark:border-zinc-900/60 hover:border-neutral-200 dark:hover:border-zinc-800 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-all text-left group cursor-pointer"
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border ${category.iconBg}`}
                    >
                      <category.icon
                        className={`h-4.5 w-4.5 ${category.iconColor}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {category.label}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate leading-normal mt-0.5">
                        {category.description}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <p className="text-xs">No categories match your search</p>
                </div>
              )}
            </div>
          )}

          {/* 2. APPS VIEW (Connected vs All Apps) */}
          {activeView === "apps" && (
            <div className="flex flex-col gap-5">
              {/* Connected Apps Section */}
              {displayConnectedApps.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-1 py-0.5">
                    <Plug className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                      Connected to Your Account
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {displayConnectedApps.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => handleAppClick(app)}
                        className="flex items-center justify-between p-2 rounded-xl border border-emerald-200/50 dark:border-emerald-950/20 bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/15 hover:border-emerald-300 dark:hover:border-emerald-900 transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-neutral-100 dark:border-zinc-900 bg-white p-0.5 flex items-center justify-center shrink-0">
                            <Image
                              src={connectorIcons[app] || "/logo.svg"}
                              alt={app}
                              width={20}
                              height={20}
                              className="object-contain"
                            />
                          </div>
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {app}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                            Connected
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Integrations Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider px-1">
                  All App Integrations ({displayAllApps.length})
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {displayAllApps.length > 0 ? (
                    displayAllApps.map((app) => {
                      const isConnected = connectedApps.includes(app);
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => handleAppClick(app)}
                          className={`flex items-center justify-between p-2 rounded-xl border hover:bg-neutral-50/60 dark:hover:bg-zinc-900/60 transition-colors text-left group cursor-pointer ${
                            isConnected
                              ? "border-emerald-200/40 bg-emerald-50/5"
                              : "border-neutral-100 dark:border-zinc-900 hover:border-neutral-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg overflow-hidden border border-neutral-100 dark:border-zinc-900 bg-white p-0.5 flex items-center justify-center shrink-0">
                              <Image
                                src={connectorIcons[app] || "/logo.svg"}
                                alt={app}
                                width={20}
                                height={20}
                                className="object-contain"
                              />
                            </div>
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                              {app}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isConnected && (
                              <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 mr-1">
                                Connected
                              </span>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      No matching apps found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. APP FUNCTIONS LIST (Fetched dynamically from Composio) */}
          {activeView === "actions" && (
            <div className="flex flex-col gap-1.5">
              <div className="px-1 mb-1.5 flex items-center gap-2">
                <div className="h-5.5 w-5.5 rounded-md overflow-hidden bg-white p-0.5 border border-border flex items-center justify-center">
                  <Image
                    src={connectorIcons[selectedApp || ""] || "/logo.svg"}
                    alt={selectedApp || ""}
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                </div>
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Available Actions (Composio)
                </span>
              </div>

              {isLoadingActions ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  <span className="text-[10px]">
                    Retrieving tools from Composio...
                  </span>
                </div>
              ) : filteredActions.length > 0 ? (
                filteredActions.map((action) => (
                  <button
                    key={action.name}
                    type="button"
                    onClick={() => handleActionClick(action)}
                    className="flex flex-col p-2.5 rounded-xl border border-neutral-100 dark:border-zinc-900 hover:border-neutral-200 dark:hover:border-zinc-800 hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {cleanActionName(action.name, selectedApp || "")}
                      </span>
                      {action.type && (
                        <span
                          className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            action.type === "trigger"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                          }`}
                        >
                          {action.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      {action.description}
                    </p>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No matching tools found.
                </div>
              )}
            </div>
          )}

          {/* 4. PLACEHOLDER / COMING SOON VIEW (Flow Control, AI, Tasks, Form) */}
          {activeView === "placeholder" && (
            <div className="flex flex-col items-center justify-center py-8 text-center px-2">
              <div className="h-14 w-14 rounded-2xl bg-neutral-50 dark:bg-zinc-950 flex items-center justify-center border border-neutral-200 dark:border-zinc-800 mb-5 shadow-sm">
                {selectedCategory === "Flow control" && (
                  <GitBranch className="h-7 w-7 text-emerald-500" />
                )}
                {selectedCategory === "AI" && (
                  <Sparkles className="h-7 w-7 text-purple-500 animate-pulse" />
                )}
                {selectedCategory === "Tasks" && (
                  <CheckSquare className="h-7 w-7 text-amber-500" />
                )}
                {selectedCategory === "Form" && (
                  <FileText className="h-7 w-7 text-pink-500" />
                )}
              </div>
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {selectedCategory} Integration
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                We are actively designing the custom capabilities for{" "}
                {selectedCategory}. In the future, you will be able to construct
                logic branches, insert intelligent agent instructions, bind to
                task schedules, or run custom forms.
              </p>
              <div className="mt-6 flex flex-col gap-1.5 w-full max-w-[180px]">
                <Button
                  variant="outline"
                  onClick={navigateBack}
                  className="rounded-xl h-9 text-[10px] w-full cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-900"
                >
                  Back to Categories
                </Button>
                <Button
                  onClick={onClose}
                  className="rounded-xl h-9 text-[10px] w-full cursor-pointer bg-neutral-900 hover:bg-neutral-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-black text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
