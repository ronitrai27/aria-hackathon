"use client";

import { useMemo, useState, useRef } from "react";
import { format, startOfDay, differenceInDays } from "date-fns";
import {
  Hourglass,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "../taskTypes";
import { STATUS_CONFIG } from "../taskTypes";

interface OverdueDebtCardProps {
  tasks: Task[];
}

type OverdueTaskItem = {
  id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  startDate: number;
  endDate: number;
  daysOverdue: number;
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

const POPUP_HEIGHT = 130; // estimated popup height in px
const POPUP_GAP = 6;

export const OverdueDebtCard = ({ tasks }: OverdueDebtCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoveredTask, setHoveredTask] = useState<OverdueTaskItem | null>(null);
  const [popupTop, setPopupTop] = useState<number>(0);

  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return (tasks || [])
      .filter((t) => {
        const isCompleted = t.status === "completed";
        const endTask = startOfDay(new Date(t.estimation.endDate));
        return !isCompleted && endTask < today;
      })
      .map((t) => {
        const endTask = startOfDay(new Date(t.estimation.endDate));
        return {
          id: t._id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          startDate: t.estimation.startDate,
          endDate: t.estimation.endDate,
          daysOverdue: differenceInDays(today, endTask),
        } as OverdueTaskItem;
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [tasks]);

  const totalTasksCount = tasks?.length || 0;
  const overdueCount = overdueTasks.length;

  const handleRowMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    task: OverdueTaskItem,
  ) => {
    if (cardRef.current) {
      const rowRect = e.currentTarget.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const rowTopInCard = rowRect.top - cardRect.top;
      const rowBottomInCard = rowRect.bottom - cardRect.top;

      // Show popup above the row if there's space, otherwise below
      const top =
        rowTopInCard >= POPUP_HEIGHT + POPUP_GAP
          ? rowTopInCard - POPUP_HEIGHT - POPUP_GAP
          : rowBottomInCard + POPUP_GAP;

      setPopupTop(top);
    }
    setHoveredTask(task);
  };

  const handleRowMouseLeave = () => {
    setHoveredTask(null);
  };

  const debtStatus = useMemo(() => {
    if (overdueCount > 2) {
      return {
        label: "Debt Zone",
        textClass: "text-rose-500",
        icon: <AlertCircle className="w-3 h-3" />,
      };
    } else if (overdueCount > 0) {
      return {
        label: "Warning",
        textClass: "text-orange-500",
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    } else {
      return {
        label: "Healthy",
        textClass: "text-emerald-500",
        icon: <ShieldCheck className="w-3 h-3" />,
      };
    }
  }, [overdueCount]);

  return (
    <div
      ref={cardRef}
      className="h-full w-full border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 shadow-xs p-4 flex flex-col relative overflow-visible"
    >
      {/* DYNAMIC HOVER POPUP — task log style + delay days at top-right */}
      {hoveredTask &&
        (() => {
          const dbStatusLabel =
            STATUS_CONFIG[hoveredTask.status]?.label || hoveredTask.status;
          const tooltipLabel = `${dbStatusLabel} (Overdue)`;
          const tooltipDotClass =
            "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]";
          const tooltipTextClass = "text-red-500";
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex flex-col gap-1 bg-card border border-border text-foreground rounded-xl shadow-lg p-2.5 w-[200px]"
              style={{ top: popupTop }}
            >
              {/* Title row + delay days top-right */}
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-bold truncate text-foreground capitalize flex-1">
                  {hoveredTask.title.split("#")[0]}
                </div>
                <span className="text-[10px] font-bold text-red-500 shrink-0">
                  -{hoveredTask.daysOverdue}d
                </span>
              </div>
              {/* Date range */}
              <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground font-semibold">
                <Clock className="w-3 h-3 text-muted-foreground/75" />
                <span>
                  {format(new Date(hoveredTask.startDate), "MMM d")} –{" "}
                  {format(new Date(hoveredTask.endDate), "MMM d")}
                </span>
              </div>
              {/* Status row */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    tooltipDotClass,
                  )}
                />
                <span
                  className={cn(
                    "text-[9.5px] font-extrabold uppercase tracking-wide",
                    tooltipTextClass,
                  )}
                >
                  {tooltipLabel}
                </span>
              </div>
            </div>
          );
        })()}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md border bg-white dark:bg-neutral-900">
            <Hourglass className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-medium tracking-tight text-neutral-900 dark:text-white/90">
            Overdue Debt
          </h3>
        </div>
        <div
          className={cn(
            "px-3 py-1.5 rounded-sm text-[10px] flex items-center gap-1 border border-accent bg-accent/60 font-bold",
            debtStatus.textClass,
          )}
        >
          {debtStatus.icon}
          {debtStatus.label}
        </div>
      </div>

      {/* STAT SUMMARY */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-2.5 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="text-xl font-bold font-mono tracking-tight leading-none mb-1 text-primary">
            {totalTasksCount}
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold">
            Total Tasks
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-2.5 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="text-xl font-bold font-mono tracking-tight leading-none mb-1 text-rose-500">
            {overdueCount}
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold">
            Delayed Tasks
          </div>
        </div>
      </div>

      {/* LIST SECTION */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-[10px] font-bold text-primary flex items-center justify-between uppercase tracking-wider mb-2.5">
          <span>Worst Delayed Tasks</span>
          <span className="text-xs font-mono text-muted-foreground normal-case">
            Delay
          </span>
        </div>

        {/* Scrollable list with thin visible right scrollbar */}
        <div
          className={cn(
            "space-y-1 max-h-[92px] overflow-y-auto pr-1",
            "[&::-webkit-scrollbar]:w-[3px]",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-neutral-300",
            "dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
          )}
        >
          {overdueTasks.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic py-6 flex flex-col items-center justify-center">
              No overdue tasks detected.
            </div>
          ) : (
            overdueTasks.map((t, idx) => (
              <div
                key={t.id}
                className="flex justify-between items-center text-xs py-1.5 px-2 border-b border-neutral-100 dark:border-neutral-900/60 last:border-b-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded transition-colors duration-150"
                onMouseEnter={(e) => handleRowMouseEnter(e, t)}
                onMouseLeave={handleRowMouseLeave}
              >
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize truncate max-w-[210px]">
                  {idx + 1}. {t.title.split("#")[0]}
                </span>
                <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 shrink-0">
                  -{t.daysOverdue}d
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PERMANENT FOOTER */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3 shrink-0" />
          <span className="font-medium">Scroll to view all delayed tasks</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3 shrink-0" />
          <span className="font-medium">Hover to view task details</span>
        </div>
      </div>
    </div>
  );
};
