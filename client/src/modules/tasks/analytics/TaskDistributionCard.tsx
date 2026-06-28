"use client";

import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Cell, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { ClipboardList, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "../taskTypes";

interface TaskDistributionCardProps {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  "not-started": "#808080", // Gray
  "in-progress": "#3b82f6", // Blue
  "on-hold": "#f59e0b", // Yellow/Amber
  delayed: "#ef4444", // Red
  completed: "#10b981", // Emerald
};

export const TaskDistributionCard = ({ tasks }: TaskDistributionCardProps) => {
  const totalTasks = tasks?.length || 0;

  const statusCounts = useMemo(
    () =>
      tasks?.reduce(
        (acc: Record<string, number>, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {
          "not-started": 0,
          "in-progress": 0,
          "on-hold": 0,
          delayed: 0,
          completed: 0,
        },
      ) || {},
    [tasks],
  );

  const chartData = useMemo(
    () =>
      Object.entries(statusCounts)
        .map(([status, count]) => ({
          name: status,
          value: count,
          fill: STATUS_COLORS[status] || "hsl(var(--muted))",
        }))
        .filter((item) => item.value > 0),
    [statusCounts],
  );

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_COLORS).map(([status, color]) => [
          status,
          {
            label: status
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            color,
          },
        ]),
      ),
    [],
  );

  return (
    <div className="h-full w-full border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 shadow-xs p-4 flex flex-col justify-between relative overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md border bg-white dark:bg-neutral-900")}>
            <LayoutGrid className={cn("w-3.5 h-3.5 text-primary")} />
          </div>
          <h3 className="text-sm font-medium tracking-tight text-neutral-900 dark:text-white/90">
            Task Distribution
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] cursor-pointer"
        >
          All Tasks <ClipboardList className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* CHART CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-2">
        {totalTasks === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm italic flex flex-col items-center gap-4">
            <p>
              <ClipboardList className="w-7 h-7" />
            </p>
            No tasks found
          </div>
        ) : (
          <div className="w-full relative flex items-center justify-center min-h-[140px]">
            <ChartContainer config={chartConfig} className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => (
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {String(name)
                                .split("-")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")}
                              :
                            </span>
                            <span className="font-mono font-bold">{value}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={64}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        className="hover:opacity-80 transition-all duration-300 cursor-pointer"
                      />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold font-sans"
                              >
                                {totalTasks}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 18}
                                className="fill-muted-foreground text-[10px] tracking-tight font-medium uppercase"
                              >
                                Total Tasks
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </div>
    </div>
  );
};
