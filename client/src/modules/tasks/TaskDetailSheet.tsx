"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Flag,
  X,
  CircleDashed,
  CircleDot,
  CirclePause,
  AlertCircle,
  CheckCircle2Icon,
} from "lucide-react";
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
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditTaskDialog } from "./EditTaskDialog";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  "not-started": (
    <CircleDashed className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
  ),
  "in-progress": (
    <CircleDot className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />
  ),
  "on-hold": <CirclePause className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
  delayed: <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />,
  completed: (
    <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
  ),
};

const priorityConfig: Record<
  Task["priority"],
  { label: string; color: string; bg: string }
> = {
  high: {
    label: "High",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  low: {
    label: "Low",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
};

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
}: TaskDetailSheetProps) {
  const deleteTask = useMutation((api as any).tasks.deleteTask);
  const toggleHold = useMutation((api as any).tasks.toggleTaskHold);

  if (!task) return null;
  const isCompleted = task.status === "completed";

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask({ id: task._id as Id<"tasks"> });
        toast.success("Task deleted");
        onOpenChange(false);
      } catch (err) {
        toast.error("Failed to delete task");
        console.error(err);
      }
    }
  };

  const handleToggleHold = async () => {
    try {
      const newStatus = await toggleHold({ id: task._id as Id<"tasks"> });
      toast.success(
        newStatus === "on-hold" ? "Task put on hold" : "Task resumed",
      );
    } catch (err) {
      toast.error("Failed to update task status");
      console.error(err);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] bg-card border-border p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <EditTaskDialog
              task={task}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                >
                  Edit Task
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleToggleHold}
            >
              {task.status === "on-hold" ? "Resume Task" : "Mark Hold"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              Delete Task
            </Button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title Name */}
          <h2
            className={cn(
              "text-lg font-bold tracking-tight text-foreground leading-tight",
              isCompleted && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </h2>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              Created {format(task.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </div>
            {task.updatedAt && task.updatedAt !== task.createdAt && (
              <div>
                Updated {format(task.updatedAt, "MMM d, yyyy 'at' h:mm a")}
              </div>
            )}
          </div>

          {/* Duration Boxes */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-border bg-neutral-50 dark:bg-neutral-900/50 p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Start
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                {format(task.estimation.startDate, "MMM d, yyyy")}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-neutral-50 dark:bg-neutral-900/50 p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Due
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {format(task.estimation.endDate, "MMM d, yyyy")}
              </div>
            </div>
          </div>

          <Separator className="bg-border/60" />

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </p>
            {task.description ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No description added.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
