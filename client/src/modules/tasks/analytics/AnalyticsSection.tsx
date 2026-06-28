"use client";

import React, { useMemo } from "react";
import { Activity } from "lucide-react";
import type { Task } from "../taskTypes";

import { TaskDistributionCard } from "./TaskDistributionCard";
import { OverdueDebtCard } from "./OverdueDebtCard";
import { TaskTrackerCard } from "./TaskTrackerCard";
import { TaskTimelineCard } from "./TaskTimelineCard";

// ==========================================
// MAIN ANALYTICS SECTION
// ==========================================

interface AnalyticsSectionProps {
  tasks: Task[];
}

export default function AnalyticsSection({ tasks }: AnalyticsSectionProps) {
  const activeTasks = tasks ?? [];

  // Compute timeline boundaries dynamically from the tasks
  const { projectCreatedAt, projectDeadline } = useMemo(() => {
    if (activeTasks.length === 0) {
      const today = Date.now();
      return {
        projectCreatedAt: today - 10 * 24 * 60 * 60 * 1000,
        projectDeadline: today + 10 * 24 * 60 * 60 * 1000,
      };
    }

    const starts = activeTasks.map((t) => t.estimation.startDate);
    const ends = activeTasks.map((t) => t.estimation.endDate);

    return {
      projectCreatedAt: Math.min(...starts),
      projectDeadline: Math.max(...ends),
    };
  }, [activeTasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Productivity Diagnostics
        </h2>
        <p className="text-sm text-muted-foreground">
          Actionable diagnostics explaining behavior patterns and potential timeline risk.
        </p>
      </div>

      {/* Grid Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: The Three Cards */}
        <TaskDistributionCard tasks={activeTasks} />
        
        <OverdueDebtCard tasks={activeTasks} />

        <TaskTrackerCard
          tasks={activeTasks}
          createdAt={projectCreatedAt}
          deadline={projectDeadline}
        />

        {/* Row 2: The Timeline logs box (spans all 3 cols) */}
        <div className="col-span-1 md:col-span-3">
          <TaskTimelineCard
            tasks={activeTasks}
            projectCreatedAt={projectCreatedAt}
            projectDeadline={projectDeadline}
          />
        </div>
      </div>
    </div>
  );
}
