import { Doc } from "../../../convex/_generated/dataModel";

export type Task = Doc<"tasks">;

export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; accent: string }
> = {
  "not-started": {
    label: "Not Started",
    color: "text-neutral-500",
    accent: "bg-neutral-400",
  },
  "in-progress": {
    label: "In Progress",
    color: "text-purple-500",
    accent: "bg-purple-500",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-500",
    accent: "bg-emerald-500",
  },
  "on-hold": {
    label: "On Hold",
    color: "text-yellow-500",
    accent: "bg-yellow-500",
  },
  delayed: {
    label: "Delayed",
    color: "text-red-500",
    accent: "bg-red-500",
  },
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const ALL_STATUSES: TaskStatus[] = [
  "not-started",
  "in-progress",
  "on-hold",
  "delayed",
  "completed",
];
