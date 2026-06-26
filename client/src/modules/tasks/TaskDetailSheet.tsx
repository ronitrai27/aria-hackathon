"use client";

import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Clock, Flag, X, CircleDashed, CircleDot, CirclePause, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG } from "./taskTypes";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  "not-started": <CircleDashed className="w-3.5 h-3.5 text-neutral-400 shrink-0" />,
  "in-progress": <CircleDot className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />,
  "on-hold": <CirclePause className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
  delayed: <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
};

const priorityConfig: Record<
  Task["priority"],
  { label: string; color: string; bg: string }
> = {
  high: { label: "High", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  medium: { label: "Medium", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  low: { label: "Low", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
};

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  if (!task) return null;
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = priorityConfig[task.priority];
  const isCompleted = task.status === "completed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] bg-card border-border p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle
              className={cn(
                "text-base font-semibold leading-snug text-left",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Status + Priority pills */}
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted",
                statusCfg.color,
              )}
            >
              {STATUS_ICONS[task.status]}
              {statusCfg.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                priorityCfg.bg,
                priorityCfg.color,
              )}
            >
              <Flag className="w-3 h-3" />
              {priorityCfg.label} priority
            </span>
          </div>

          {/* Description */}
          {task.description ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No description added.</p>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Start</p>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  {format(task.estimation.startDate, "MMM d, yyyy")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due</p>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {format(task.estimation.endDate, "MMM d, yyyy")}
                </div>
              </div>
            </div>

            {task.finalCompletedAt && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold mb-1">
                  Completed
                </p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {format(task.finalCompletedAt, "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attachments
              </p>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 border border-border rounded-md px-2 py-1"
                  >
                    {att.name}
                    {att.size && (
                      <span className="text-muted-foreground">
                        ({Math.round(att.size / 1024)}KB)
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              Created {format(task.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
            {task.updatedAt !== task.createdAt && (
              <p className="text-[10px] text-muted-foreground">
                Updated {format(task.updatedAt, "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
