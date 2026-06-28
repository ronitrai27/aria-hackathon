"use client";

import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  format,
  getDay,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChartNoAxesGantt,
  ChevronDown,
  ClipboardList,
  Clock,
  Filter,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Task } from "../taskTypes";
import { STATUS_CONFIG } from "../taskTypes";

export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  deadlineDate: Date;
  totalDays: number;
  slab: 1 | 2 | 3;
  allowedTicks: number[];
}

export const useTimelineConfig = (
  projectCreatedAt: number | undefined,
  projectDeadline: number | undefined
): TimelineConfig | null => {
  return useMemo(() => {
    if (projectCreatedAt == null || !projectDeadline) return null;

    const startDate = startOfDay(new Date(projectCreatedAt));
    const deadline = new Date(projectDeadline);
    const deadlineDate = startOfDay(deadline);
    const deadlineEnd = endOfDay(deadline);
    const endDate = endOfDay(addDays(deadline, 5));

    const slabSpanDays = Math.max(1, differenceInDays(deadlineEnd, startDate));
    const totalDays = Math.max(1, differenceInDays(endDate, startDate));

    let slab: 1 | 2 | 3 = 1;
    let allowedTicks: number[] = [2, 3, 5];

    if (slabSpanDays <= 90) {
      slab = 1;
      allowedTicks = [2, 3, 5];
    } else if (slabSpanDays <= 180) {
      slab = 2;
      allowedTicks = [3, 5, 10];
    } else {
      slab = 3;
      allowedTicks = [5, 10];
    }

    return {
      startDate,
      endDate,
      deadlineDate,
      totalDays,
      slab,
      allowedTicks,
    };
  }, [projectCreatedAt, projectDeadline]);
};

const TRACK_MIN_PX = 900;

function TimelineDayAxis({
  config,
  tasks,
  dayInterval,
}: {
  config: TimelineConfig;
  tasks?: Task[];
  dayInterval: number;
}) {
  const tick = dayInterval;

  const days = useMemo(() => {
    const start = startOfDay(config.startDate);
    const end = startOfDay(config.endDate);
    return eachDayOfInterval({ start, end });
  }, [config.startDate, config.endDate]);

  const colMinWidth = dayInterval === 2 ? 22 : dayInterval === 3 ? 18 : 14;
  const naturalWidth = days.length * colMinWidth;
  const trackWidth = Math.max(TRACK_MIN_PX, naturalWidth);
  const columnWidthPercentage = 100 / days.length;

  const taskRowHeight = 42; 
  const computedHeight = 75 + (tasks?.length || 0) * taskRowHeight + 40;
  const containerHeight = Math.max(440, computedHeight);

  return (
    <div className="w-full min-w-0 overflow-auto max-h-[500px] dark:bg-card">
      <div
        className="relative flex min-h-[440px] w-full pl-0.5"
        style={{
          width: `max(${trackWidth}px, 100%)`,
          height: `${containerHeight}px`,
        }}
      >
        {days.map((day, i) => {
          const dow = getDay(day);
          const weekend = dow === 0 || dow === 6;
          const isMajorTick = i % tick === 0;
          const prevMajor = i >= tick ? days[i - tick] : undefined;
          const showMonth =
            isMajorTick &&
            (i === 0 ||
              !prevMajor ||
              day.getMonth() !== prevMajor.getMonth() ||
              day.getFullYear() !== prevMajor.getFullYear());
          const isDeadline = isSameDay(day, config.deadlineDate);
          const isMonthStart = day.getDate() === 1;

              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  style={{ width: `${columnWidthPercentage}%` }}
                  className={cn(
                    "relative shrink-0 border-l dark:border-border/70 border-border first:border-l-0",
                    weekend && "dark:bg-muted/35 bg-accent/50"
                  )}
                >
                  <div className="flex h-full min-h-[200px] flex-col">
                    <div className="relative flex shrink-0 flex-col items-center border-b border-border/40 bg-muted/5 pb-2 pt-1">
                      {(isMajorTick || isDayToday) && (
                        <>
                          <div
                            className={cn(
                              "w-px rounded-full",
                              isDayToday
                                ? "h-5 bg-primary w-0.5"
                                : isMonthStart
                                ? "h-7 bg-violet-500 w-0.5"
                                : "h-4 bg-black/20 dark:bg-white/20"
                            )}
                          />
                          <span
                            className={cn(
                              "mt-1.5 text-center text-[10px] font-bold leading-none tabular-nums",
                              isDayToday
                                ? "text-primary font-black text-[9px]"
                                : isMonthStart
                                ? "text-violet-500 font-black"
                                : "text-primary/80"
                            )}
                          >
                            {isDayToday ? `Today (${format(day, "d")})` : showMonth ? format(day, "MMM d") : format(day, "d")}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="min-h-[72px] flex-1" />
              </div>
            </div>
          );
        })}

        {/* Task Slabs overlay */}
        <div className="absolute top-[75px] left-1 right-0 z-30 flex flex-col gap-2.5 p-2 px-1 pointer-events-none">
          {tasks?.map((task, idx) => {
            const start = startOfDay(new Date(task.estimation.startDate));
            const end = startOfDay(new Date(task.estimation.endDate));

            if (end < config.startDate || start > config.endDate) return null;

            const displayStart =
              start < config.startDate ? config.startDate : start;
            const displayEnd = end > config.endDate ? config.endDate : end;

            const startOffsetDays = Math.max(
              0,
              differenceInDays(displayStart, config.startDate)
            );
            const durationDays = Math.max(
              1,
              differenceInDays(displayEnd, displayStart) + 1
            );
            const actualDurationDays = differenceInDays(end, start) + 1;

            const left = `${(startOffsetDays / days.length) * 100}%`;
            const width = `max(${(durationDays / days.length) * 100}%, 150px)`;

            const getTaskUI = (t: Task) => {
              const today = startOfDay(new Date());
              const endTask = startOfDay(new Date(t.estimation.endDate));
              const daysLeft = differenceInDays(endTask, today);

              const defaultBarClass =
                "bg-white dark:bg-neutral-900 border-border/80 text-foreground hover:border-primary/30 shadow-xs";

              // 1. Completed
              if (t.status === "completed") {
                return {
                  barClass: defaultBarClass,
                  icon: <ClipboardList size={15} className="text-emerald-500" />,
                  category: "completed",
                };
              }
              // 2. Overdue
              if (endTask < today) {
                return {
                  barClass: defaultBarClass,
                  icon: <AlertTriangle size={15} className="text-red-500 animate-pulse" />,
                  category: "overdue",
                };
              }
              // 3. At Risk
              if (daysLeft >= 0 && daysLeft <= 2) {
                return {
                  barClass: defaultBarClass,
                  icon: <AlertCircle size={15} className="text-orange-500" />,
                  category: "atrisk",
                };
              }
              // 4. Pending (all other incomplete)
              return {
                barClass: defaultBarClass,
                icon: <AlertCircle size={15} className="text-blue-500" />,
                category: "pending",
              };
            };

            const taskUI = getTaskUI(task);
            const today = startOfDay(new Date());
            const endTask = startOfDay(new Date(task.estimation.endDate));
            const daysLeft = differenceInDays(endTask, today);
            const isTaskCompleted = task.status === "completed";
            const isTaskOverdue = !isTaskCompleted && endTask < today;
            const isTaskAtRisk = !isTaskCompleted && !isTaskOverdue && daysLeft >= 0 && daysLeft <= 2;

            // Determine label and style for the tooltip dynamically
            const dbStatusLabel = STATUS_CONFIG[task.status]?.label || task.status;
            let tooltipLabel = dbStatusLabel;
            let tooltipDotClass = STATUS_CONFIG[task.status]?.accent || "bg-neutral-500";
            let tooltipTextClass = STATUS_CONFIG[task.status]?.color || "text-neutral-500";

            if (isTaskCompleted) {
              tooltipLabel = "Completed";
              tooltipDotClass = "bg-emerald-500";
              tooltipTextClass = "text-emerald-500";
            } else if (isTaskAtRisk) {
              tooltipLabel = `${dbStatusLabel} (At Risk)`;
              tooltipDotClass = "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]";
              tooltipTextClass = "text-orange-500";
            } else if (isTaskOverdue) {
              tooltipLabel = `${dbStatusLabel} (Overdue)`;
              tooltipDotClass = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]";
              tooltipTextClass = "text-red-500";
            } else {
              // If only a single word, show the color of the icon
              const isSingleWord = dbStatusLabel.trim().split(/\s+/).length === 1;
              if (isSingleWord) {
                if (task.status === "delayed") {
                  tooltipDotClass = "bg-red-500";
                  tooltipTextClass = "text-red-500";
                } else {
                  tooltipDotClass = "bg-blue-500";
                  tooltipTextClass = "text-blue-500";
                }
              }
            }

            return (
              <div
                key={task._id}
                className="relative h-8 pointer-events-auto flex items-center hover:z-50"
              >
                <div
                  className={cn(
                    "absolute h-8 rounded-md border flex items-center pl-1.5 pr-3 shadow-xs group transition-all hover:shadow-md hover:scale-[1.03] cursor-pointer hover:z-50",
                    taskUI.barClass
                  )}
                  style={{ left, width }}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full">
                    {/* Icon */}
                    <div className="h-5 w-5 flex items-center justify-center shrink-0">
                      {taskUI.icon}
                    </div>

                    {/* Title */}
                    <span className="text-[11px] font-semibold capitalize truncate leading-none flex-1">
                      {task.title.split("#")[0]}
                    </span>

                    {/* Duration */}
                    <span className="text-[9px] font-bold text-black dark:text-white bg-muted px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
                      {actualDurationDays}d
                    </span>
                  </div>

                  {/* HOVER STATUS TOOLTIP */}
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col gap-1.5 bg-card border border-border text-foreground rounded-xl shadow-lg p-3 pointer-events-none min-w-[200px]",
                    idx < 2 ? "top-full mt-2" : "bottom-full mb-2"
                  )}>
                    <div className="text-[11.5px] font-bold truncate text-foreground capitalize">
                      {task.title.split("#")[0]}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground font-semibold">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/75" />
                      <span>
                        {format(task.estimation.startDate, "MMM d")} -{" "}
                        {format(task.estimation.endDate, "MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
                      <span className={cn("w-1.5 h-1.5 rounded-full", tooltipDotClass)} />
                      <span className={cn("text-[10px] font-extrabold uppercase tracking-wide", tooltipTextClass)}>
                        {tooltipLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TaskTimelineCardProps {
  tasks: Task[];
  projectCreatedAt: number;
  projectDeadline: number;
}

export const TaskTimelineCard = ({
  tasks,
  projectCreatedAt,
  projectDeadline,
}: TaskTimelineCardProps) => {
  const config = useTimelineConfig(projectCreatedAt, projectDeadline);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dayInterval, setDayInterval] = useState<number>(3);

  useEffect(() => {
    if (config && !config.allowedTicks.includes(dayInterval)) {
      setDayInterval(config.allowedTicks[0]);
    }
  }, [config, dayInterval]);

  if (!config) return null;

  const filteredTasks = useMemo(() =>
    (tasks ?? []).filter((task) => {
      if (statusFilter === "all") return true;
      const taskStatus = task.status.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const currentFilter = statusFilter.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return taskStatus === currentFilter;
    }),
  [tasks, statusFilter]);

  return (
    <div className="w-full bg-sidebar border rounded-xl overflow-hidden shadow-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary border rounded-md">
            <ChartNoAxesGantt className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Task Logs</h3>
          <span className="ml-2 rounded-full border bg-accent/40 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Task Count: {filteredTasks.length}
          </span>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-[11px] font-semibold text-muted-foreground">Overdue</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-[11px] font-semibold text-muted-foreground">At Risk</span>
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-[10px] font-bold capitalize border border-border"
              >
                <Filter className="w-3 h-3 text-muted-foreground" />
                <span>
                  {statusFilter === "all"
                    ? "All Statuses"
                    : statusFilter === "in-progress"
                    ? "In Progress"
                    : statusFilter}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                Filter by Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { label: "All Statuses", value: "all" },
                { label: "Not Started", value: "not-started" },
                { label: "In Progress", value: "in-progress" },
                { label: "Completed", value: "completed" },
                { label: "Delayed", value: "delayed" },
                { label: "On Hold", value: "on-hold" },
              ].map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className="text-xs gap-2"
                >
                  <span className="capitalize">{s.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Grid Interval Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-[10px] font-bold border border-border"
              >
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{dayInterval}d Tick</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[120px]">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                Grid Interval
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {config.allowedTicks.map((val) => (
                <DropdownMenuItem
                  key={val}
                  onClick={() => setDayInterval(val)}
                  className="text-xs gap-2"
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      dayInterval === val ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  <span>{val} Days</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="p-4">
        <TimelineDayAxis
          config={config}
          tasks={filteredTasks}
          dayInterval={dayInterval}
        />
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10 text-[11px] font-bold text-muted-foreground/80">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span className="tracking-wider uppercase text-[9px]">Start Date:</span>
          <span className="text-foreground">
            {format(config.startDate, "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </div>
  );
};
