"use client";

import { Activity, AlertCircle, ArrowUpRight, Info } from "lucide-react";
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "../taskTypes";
import { startOfDay, differenceInDays } from "date-fns";

interface TaskTrackerCardProps {
  tasks: Task[];
  createdAt: number;
  deadline: number;
}

export const TaskTrackerCard = ({
  tasks,
  createdAt,
  deadline,
}: TaskTrackerCardProps) => {
  const {
    totalDays,
    daysConsumed,
    daysRemaining,
    totalTasks,
    completedTasks,
    overdueTasks,
    atRiskTasks,
    pendingTasks,
    completedPct,
    pendingPct,
    atRiskPct,
    overduePct,
  } = useMemo(() => {
    const now = Date.now();
    const today = startOfDay(new Date());
    const msInDay = 1000 * 60 * 60 * 24;

    const totalDays = Math.max(1, (deadline - createdAt) / msInDay);
    const daysConsumed = Math.max(0, (now - createdAt) / msInDay);
    const daysRemaining = Math.max(0, (deadline - now) / msInDay);

    const totalTasks = tasks?.length || 0;
    const completedTasks =
      tasks?.filter((t) => t.status === "completed").length || 0;
    const incompleteTasks =
      tasks?.filter((t) => t.status !== "completed") || [];

    const overdueTasks =
      incompleteTasks.filter((t) => {
        const endTask = startOfDay(new Date(t.estimation.endDate));
        return endTask < today;
      }).length || 0;

    const atRiskTasks =
      incompleteTasks.filter((t) => {
        const endTask = startOfDay(new Date(t.estimation.endDate));
        const daysLeft = differenceInDays(endTask, today);
        return endTask >= today && daysLeft <= 2;
      }).length || 0;

    const pendingTasks = Math.max(
      0,
      totalTasks - completedTasks - overdueTasks - atRiskTasks,
    );

    const completedPct =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const pendingPct = totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0;
    const atRiskPct = totalTasks > 0 ? (atRiskTasks / totalTasks) * 100 : 0;
    const overduePct = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    return {
      totalDays,
      daysConsumed,
      daysRemaining,
      totalTasks,
      completedTasks,
      overdueTasks,
      atRiskTasks,
      pendingTasks,
      completedPct,
      pendingPct,
      atRiskPct,
      overduePct,
    };
  }, [tasks, createdAt, deadline]);

  // Gap analysis: completed pct vs time consumed pct
  const timeConsumedPct = Math.min(100, (daysConsumed / totalDays) * 100);
  const gap = timeConsumedPct - completedPct;
  const isBehind = gap > 0;

  // Total blocks for the bar
  const totalBlocks = 35;
  const completedBlocks = Math.round((completedPct / 100) * totalBlocks);
  const pendingBlocks = Math.round((pendingPct / 100) * totalBlocks);
  const atRiskBlocks = Math.round((atRiskPct / 100) * totalBlocks);
  const overdueBlocks = Math.round((overduePct / 100) * totalBlocks);

  return (
    <div className="h-full w-full border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 shadow-xs p-4 flex flex-col justify-between relative overflow-visible">
      {/* HEADER */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-1.5 rounded-md border bg-white dark:bg-neutral-900",
              )}
            >
              <Activity className={cn("w-3.5 h-3.5 text-primary")} />
            </div>
            <h3 className="text-sm font-medium tracking-tight text-black dark:text-white">
              Task Tracker
            </h3>
          </div>
          {isBehind ? (
            <div className="group relative">
              <div
                className={cn(
                  "px-3 py-1.5 rounded-sm text-[10px] flex items-center gap-1 border border-accent bg-accent/60 text-rose-500 font-bold cursor-pointer",
                )}
              >
                <AlertCircle className="w-3 h-3" />
                {gap.toFixed(0)}% Behind
              </div>
              <div className="absolute right-0 top-full mt-2 z-50 flex flex-col items-start bg-card/95 backdrop-blur-xs border border-neutral-200/65 dark:border-neutral-850/65 text-foreground rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3.5 pointer-events-none w-[260px] opacity-0 scale-95 origin-top group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-left">
                <div className="flex items-center gap-1.5 justify-start mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="font-bold text-rose-500 tracking-wider text-[10px] uppercase">
                    Project Pace
                  </span>
                </div>
                <span className="font-medium text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                  You are behind schedule because the time elapsed on the
                  project is greater than the percentage of completed tasks.
                </span>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div
                className={cn(
                  "px-3 py-1.5 rounded-sm text-[10px] flex items-center gap-1 border border-accent bg-accent/60 text-green-400 font-bold cursor-pointer",
                )}
              >
                <ArrowUpRight className="w-3 h-3" />
                Ahead
              </div>
              <div className="absolute right-0 top-full mt-2 z-50 flex flex-col items-start bg-card/95 backdrop-blur-xs border border-neutral-200/65 dark:border-neutral-850/65 text-foreground rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3.5 pointer-events-none w-[260px] opacity-0 scale-95 origin-top group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-left">
                <div className="flex items-center gap-1.5 justify-start mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-emerald-400 tracking-wider text-[10px] uppercase">
                    Project Pace
                  </span>
                </div>
                <span className="font-medium text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                  You are ahead of schedule because your task completion
                  percentage exceeds the elapsed time.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* PROGRESS BARS */}
        <div className="space-y-3">
          {/* TASK COMPLETED */}
          <div className="space-y-1.5 cursor-pointer hover:bg-white dark:hover:bg-neutral-800/40 p-1.5 rounded-lg transition-colors group relative">
            <div className="flex justify-between text-xs font-semibold text-primary  items-center">
              <span className="flex items-center gap-1">
                Tasks Completed
                <Info className="w-3.5 h-3.5  cursor-help" />
              </span>
              <span className="text-muted-foreground">
                {completedTasks} / {totalTasks}
              </span>
            </div>
            <div className="flex gap-[2px] h-6 w-full">
              {Array.from({ length: totalBlocks }).map((_, i) => (
                <div
                  key={`completed-${i}`}
                  className={cn(
                    "flex-1 rounded-[1.5px] transition-colors",
                    i < completedBlocks
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                      : "bg-neutral-200 dark:bg-neutral-800",
                  )}
                />
              ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 flex flex-col items-start bg-card/95 backdrop-blur-xs border border-neutral-200/65 dark:border-neutral-850/65 text-foreground rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3.5 pointer-events-none w-[260px] opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-left">
              <div className="flex items-center gap-1.5 justify-start mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-emerald-400 tracking-wider text-[10px] uppercase">
                  Completed Tasks
                </span>
              </div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                Tasks you have successfully finished and marked as completed.
              </span>
            </div>
          </div>

          {/* TASK PENDING */}
          <div className="space-y-1.5 cursor-pointer hover:bg-white dark:hover:bg-neutral-800/40 p-1.5 rounded-lg transition-colors group relative">
            <div className="flex justify-between text-xs font-semibold text-primary items-center">
              <span className="flex items-center gap-1">
                Tasks Pending
                <Info className="w-3.5 h-3.5 cursor-help" />
              </span>
              <span className="text-muted-foreground">
                {pendingTasks} / {totalTasks}
              </span>
            </div>
            <div className="flex gap-[2px] h-6 w-full">
              {Array.from({ length: totalBlocks }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className={cn(
                    "flex-1 rounded-[1.5px] transition-colors",
                    i < pendingBlocks
                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      : "bg-neutral-200 dark:bg-neutral-800",
                  )}
                />
              ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 flex flex-col items-start bg-card/95 backdrop-blur-xs border border-neutral-200/65 dark:border-neutral-850/65 text-foreground rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3.5 pointer-events-none w-[260px] opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-left">
              <div className="flex items-center gap-1.5 justify-start mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="font-bold text-blue-500 tracking-wider text-[10px] uppercase">
                  Pending Tasks
                </span>
              </div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                Active tasks with plenty of time remaining (more than 2 days
                before the deadline).
              </span>
            </div>
          </div>

          {/* TASK AT RISK */}
          <div className="space-y-1.5 cursor-pointer hover:bg-white dark:hover:bg-neutral-800/40 p-1.5 rounded-lg transition-colors group relative">
            <div className="flex justify-between text-xs font-semibold text-primary items-center">
              <span className="flex items-center gap-1">
                Tasks At Risk
                <Info className="w-3.5 h-3.5 cursor-help" />
              </span>
              <span className="text-muted-foreground">
                {atRiskTasks} / {totalTasks}
              </span>
            </div>
            <div className="flex gap-[2px] h-6 w-full">
              {Array.from({ length: totalBlocks }).map((_, i) => (
                <div
                  key={`atrisk-${i}`}
                  className={cn(
                    "flex-1 rounded-[1.5px] transition-colors",
                    i < atRiskBlocks
                      ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                      : "bg-neutral-200 dark:bg-neutral-800",
                  )}
                />
              ))}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 flex flex-col items-start bg-card/95 backdrop-blur-xs border border-neutral-200/65 dark:border-neutral-850/65 text-foreground rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3.5 pointer-events-none w-[260px] opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-left">
              <div className="flex items-center gap-1.5 justify-start mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="font-bold text-orange-500 tracking-wider text-[10px] uppercase">
                  At Risk Tasks
                </span>
              </div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                Active tasks with deadlines approaching quickly (due today,
                tomorrow, or the day after).
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
