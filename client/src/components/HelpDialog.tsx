"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Workflow,
  CheckSquare,
  Zap,
  X,
  Layers,
  Sparkles,
  Search,
  Upload,
  Clock,
  Compass,
} from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "workflows" | "tasks" | "productivity";

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("workflows");

  const tabs = [
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "tasks", label: "Tasks & Brain AI", icon: CheckSquare },
    { id: "productivity", label: "Productivity", icon: Zap },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[700px] w-[90vw] p-0 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center text-white shrink-0">
              <svg
                fill="currentColor"
                viewBox="0 0 36 48"
                className="w-4 h-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                Aria User Guide
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Learn how to maximize your AI-powered companion workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-900 px-4 bg-zinc-50/20 dark:bg-zinc-950/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[48vh] overflow-y-auto space-y-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {activeTab === "workflows" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Designing Integrations & Workflows
                </h3>
                <p>
                  Switch to <strong>Agent Mode</strong> via the sidebar.
                  Describe your automation goal in chat (e.g.{" "}
                  <i>
                    "Schedule a calendar invite and post the details to Slack"
                  </i>
                  ). Aria will generate a visual live canvas node map.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                    Configure Node Parameters
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li>
                      Click the <strong>Edit (gear)</strong> button on any
                      workflow card.
                    </li>
                    <li>
                      Type variables directly in fields or use outputs from
                      previous nodes.
                    </li>
                    <li>
                      Remove optional fields (like <code>attendees</code>) by
                      clicking the <strong>Trash icon</strong> next to it to
                      skip validation.
                    </li>
                    <li>
                      Restore deleted fields anytime from the{" "}
                      <strong>"Removed Fields"</strong> section via the{" "}
                      <strong>Undo</strong> button.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                    Parameter Templates
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li>
                      Reference outputs using{" "}
                      <code>{"{{step_1.propertyName}}"}</code>.
                    </li>
                    <li>
                      Access lists using brackets:{" "}
                      <code>{"{{step_3.channels[0].id}}"}</code>.
                    </li>
                    <li>
                      Aria automatically parses JSON outputs from AI nodes so
                      you can access nested fields like{" "}
                      <code>{"{{step_2.title}}"}</code> or{" "}
                      <code>{"{{step_2.start_time}}"}</code>.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
                <h4 className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  💡 Date & Time Formats:
                </h4>
                <p className="text-xs">
                  Always use standard ISO 8601 formatting for calendar starts or
                  deadlines (e.g. <code>2026-06-30T14:00:00</code> for 2:00 PM
                  on June 30, 2026).
                </p>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  AI Task Suggestion & Brain Mode
                </h3>
                <p>
                  Aria is designed to understand your workflow proactively.
                  Switch to <strong>Brain Mode</strong> in the chat to ask Aria
                  to search or create tasks based on your workspace context.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-800 dark:text-zinc-100">
                      Upload Documents
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Drag & drop PDF, CSV, or text docs into the chat. Aria
                      parses files to extract deadlines, actions, and technology
                      requirements, compiling them into clean task drafts.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-800 dark:text-zinc-100">
                      Inbox & Browser Activity Analysis
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Aria scans unread emails, calendar schedules, and your
                      browser tabs (last 48h) to detect what you are working on,
                      cross-referencing your bookmarks and inbox threads to
                      suggest tasks you might have missed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-800 dark:text-zinc-100">
                      Human-in-the-Loop Gate
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Aria never inserts tasks directly without authorization.
                      Proposed tasks appear in a clean sidebar card list. You
                      can review details, make edits, and click{" "}
                      <strong>Approve & Insert</strong> to write them to Convex
                      or <strong>Reject</strong> to cancel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "productivity" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Supercharge Your Productivity
                </h3>
                <p>
                  Aria aggregates insights across your browser extension and
                  connected integrations to serve as an intelligent companion.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 text-center space-y-1.5 bg-zinc-50/30 dark:bg-zinc-900/10">
                  <Clock className="h-5 w-5 mx-auto text-blue-500" />
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-100">
                    Deadlines & Priorities
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Set estimation durations and tag priority (Low, Medium,
                    High) to structure your daily queue.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 text-center space-y-1.5 bg-zinc-50/30 dark:bg-zinc-900/10">
                  <Compass className="h-5 w-5 mx-auto text-emerald-500" />
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-100">
                    Browser Extension
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Install the extension to track reading durations and scroll
                    depths, providing insights into focus drop-offs.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 text-center space-y-1.5 bg-zinc-50/30 dark:bg-zinc-900/10">
                  <Sparkles className="h-5 w-5 mx-auto text-amber-500" />
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-100">
                    AI Daily Digest
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Receive summarized alerts for unread Gmail items, Slack
                    threads, and upcoming events.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs">
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  💡 Smart Suggestions:
                </span>{" "}
                Aria tracks when your active tab count spikes or when calendar
                meetings pile up, automatically prompting you to schedule breaks
                or delegate pending items to keep your cognitive load
                manageable.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("start-quick-tour"));
            }}
            className="rounded-lg px-4 py-2 text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            Start Tour
          </Button>
          <Button
            onClick={onClose}
            className="rounded-lg px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
