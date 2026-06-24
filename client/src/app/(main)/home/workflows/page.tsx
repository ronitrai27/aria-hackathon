"use client";

import * as React from "react";
import {
  StepPopover,
  type ComposioAction,
} from "@/modules/workflows/components/StepPopover";
import { Button } from "@/components/ui/button";
import { Plus, Zap, AlertCircle } from "lucide-react";

export default function WorkflowsPage() {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<{
    appName: string;
    action: ComposioAction;
  } | null>(null);

  const handleSelectAction = (appName: string, action: ComposioAction) => {
    setSelectedAction({ appName, action });
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-2xl border border-border bg-neutral-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      {/* Grid Canvas Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] pointer-events-none" />

      {/* Main Canvas Interface */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Trigger Box Container */}
        <div className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-zinc-800/60 bg-neutral-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {selectedAction ? "Instant Trigger" : "Trigger"}
            </span>
            {selectedAction && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>

          {/* Body */}
          <div className="p-8 flex flex-col items-center justify-center min-h-[140px]">
            {selectedAction ? (
              <div className="flex flex-col items-center text-center gap-3 w-full">
                <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {selectedAction.appName} — {selectedAction.action.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
                    {selectedAction.action.description}
                  </p>
                </div>

                {/* Trigger selection for editing/changing */}
                <StepPopover
                  isOpen={isPopoverOpen}
                  onClose={() => setIsPopoverOpen(false)}
                  onSelectAction={handleSelectAction}
                  trigger={
                    <Button
                      onClick={() => setIsPopoverOpen(true)}
                      variant="ghost"
                      className="mt-2 text-xs h-8 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer"
                    >
                      Change trigger
                    </Button>
                  }
                />
              </div>
            ) : (
              /* Trigger selection when empty */
              <StepPopover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onSelectAction={handleSelectAction}
                trigger={
                  <Button
                    onClick={() => setIsPopoverOpen(true)}
                    className="h-11 px-5 gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm hover:shadow transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Add trigger
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Visual Connector Line + StepPopover triggers */}
        {selectedAction && (
          <>
            <div className="h-10 w-0.5 bg-blue-500 dark:bg-blue-600/80 my-0.5 animate-pulse" />
            <StepPopover
              isOpen={isPopoverOpen}
              onClose={() => setIsPopoverOpen(false)}
              onSelectAction={handleSelectAction}
              trigger={
                <button
                  onClick={() => setIsPopoverOpen(true)}
                  type="button"
                  className="h-9 w-9 rounded-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 flex items-center justify-center shadow-sm hover:shadow hover:scale-105 transition-all text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 group cursor-pointer"
                  title="Add next step"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                </button>
              }
            />
          </>
        )}

        {/* Help Banner */}
        <div className="mt-8 flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-200/50 bg-amber-50/20 dark:border-amber-950/20 dark:bg-amber-950/5 text-left max-w-xs">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-normal">
            Click <strong>Add trigger</strong> to view the categories list,
            search apps, choose integrations, and browse supported actions.
          </p>
        </div>
      </div>
    </div>
  );
}
