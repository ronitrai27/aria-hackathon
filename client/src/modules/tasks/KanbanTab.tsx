"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import {
  Calendar,
  GripVertical,
  Plus,
  SeparatorVertical,
  ArrowDownNarrowWide,
  Info,
  CircleDashed,
  CircleDot,
  CirclePause,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG, ALL_STATUSES } from "./taskTypes";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { CreateTaskDialog } from "./CreateTaskDialog";

// ─── Column header icons (matching WeKraft's KANBAN_COLUMN_ICONS) ─────────────
const COLUMN_ICONS: Record<TaskStatus, React.ReactNode> = {
  "not-started": <CircleDashed className="w-4 h-4 text-neutral-400 shrink-0" />,
  "in-progress": <CircleDot className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />,
  "on-hold": <CirclePause className="w-4 h-4 text-yellow-500 shrink-0" />,
  delayed: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
};

// ─── Priority bars ────────────────────────────────────────────────────────────
const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3">
      <div className="w-[3px] h-4 bg-yellow-500 rounded-[1px]" />
      <div className="w-[3px] h-3 dark:bg-neutral-600 bg-neutral-300 rounded-[1px]" />
      <div className="w-[3px] h-2 dark:bg-neutral-600 bg-neutral-300 rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3">
      <div className="w-[3px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[3px] h-3 bg-green-500 rounded-[1px]" />
      <div className="w-[3px] h-2 dark:bg-neutral-600 bg-neutral-300 rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3">
      <div className="w-[3px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[3px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[3px] h-2 bg-red-500 rounded-[1px]" />
    </div>
  ),
};

// ─── Kanban Card ──────────────────────────────────────────────────────────────
const TaskCard = ({
  task,
  isOverlay,
}: {
  task: Task;
  isOverlay?: boolean;
}) => {
  const overdue =
    task.estimation?.endDate < Date.now() && task.status !== "completed";

  return (
    <Card
      className={cn(
        "group cursor-pointer p-0 transition-all duration-300 border border-border shadow-sm hover:shadow-xl dark:bg-muted bg-card backdrop-blur-sm rounded-md",
        isOverlay && "border-primary shadow-2xl ring-4 ring-primary/5 scale-[1.02]",
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-xs leading-relaxed tracking-tight line-clamp-2 dark:group-hover:text-primary group-hover:text-foreground transition-colors flex items-center gap-2">
            {overdue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 dark:text-primary/70 text-primary shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-200">
                    <p className="text-[11px] font-medium">
                      Overdue: due on {format(task.estimation.endDate, "MMM d, yyyy")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {task.title}
          </h4>
          <GripVertical className="w-4 h-4 text-muted-foreground dark:group-hover:text-primary/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
        </div>

        <div className="flex items-center justify-between pt-5 gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Priority bars */}
            <div className="flex items-center gap-2 shrink-0">
              {priorityBars[task.priority] ?? priorityBars.medium}
            </div>

            {/* Due date chip */}
            <div className="flex items-center gap-2 px-2 py-1 rounded dark:bg-card bg-neutral-100 border border-border/30 text-[10px] dark:text-primary/60 text-primary font-bold dark:group-hover:bg-primary/5 group-hover:bg-primary/10 dark:group-hover:text-primary group-hover:text-primary transition-all shrink-0">
              <Calendar className="w-3 h-3 mb-0.5" />
              <span>{format(task.estimation.endDate, "dd MMM")}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Sortable task wrapper ────────────────────────────────────────────────────
const SortableTask = ({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-primary/30 border-dashed rounded-2xl h-[130px] bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <TaskCard task={task} />
    </div>
  );
};

// ─── Column ───────────────────────────────────────────────────────────────────
interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const Column = ({
  status,
  tasks,
  onTaskClick,
  isCollapsed,
  onToggle,
}: ColumnProps) => {
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: "Column" },
  });

  const isCompleted = status === "completed";
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-500 ease-in-out dark:bg-sidebar bg-neutral-100 rounded-lg border border-border overflow-hidden shadow-sm h-fit min-h-[560px] max-h-[calc(100vh-320px)]",
        isCollapsed
          ? "min-w-[60px] w-[60px] dark:bg-sidebar bg-neutral-100 border-none shadow-none"
          : "min-w-[320px] w-[320px]",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "p-2 flex border-b sticky top-0 z-10 transition-all duration-300",
          isCollapsed
            ? "flex-col items-center gap-4 h-full border-b-0 bg-transparent"
            : cn(
                "items-center justify-between font-bold",
                isCompleted
                  ? "bg-green-500 dark:bg-green-600 text-white"
                  : "dark:bg-muted bg-accent dark:text-white text-black",
              ),
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5",
            !isCollapsed && isCompleted && "[&_svg]:text-white",
            isCollapsed && "flex-col mt-2",
          )}
        >
          {!isCollapsed && COLUMN_ICONS[status]}
          <h3
            className={cn(
              "font-semibold tracking-tight capitalize transition-all duration-300",
              isCollapsed
                ? "dark:text-white text-black [writing-mode:vertical-lr] rotate-180 text-lg py-4"
                : isCompleted
                  ? "text-white text-sm font-bold"
                  : "dark:text-white text-black text-sm font-bold",
            )}
          >
            {cfg.label}
          </h3>
          <Badge
            variant="secondary"
            className={cn(
              "font-bold h-5 w-5 rounded-full border-none flex items-center justify-center p-0 text-xs",
              isCollapsed || !isCompleted
                ? "dark:bg-primary/5 bg-primary/10 dark:text-primary/60 text-primary"
                : "bg-white/20 text-white",
            )}
          >
            {tasks.length}
          </Badge>
        </div>

        <div
          className={cn(
            "flex items-center gap-3",
            !isCollapsed && isCompleted && "[&_svg]:text-white",
            isCollapsed && "order-first",
          )}
        >
          {!isCollapsed && (
            <CreateTaskDialog
              trigger={
                <button
                  aria-label="Add task"
                  className={cn(
                    "transition-colors p-1.5 rounded-lg",
                    isCompleted
                      ? "text-white hover:bg-white/10"
                      : "dark:text-primary text-foreground dark:hover:bg-primary/5 hover:bg-neutral-200",
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              }
            />
          )}
          <button
            onClick={onToggle}
            aria-label="Toggle collapse"
            className={cn(
              "transition-colors p-1.5 rounded-lg",
              isCollapsed || !isCompleted
                ? "dark:text-primary text-foreground dark:hover:bg-primary/5 hover:bg-neutral-200"
                : "text-white hover:bg-white/10",
            )}
          >
            <SeparatorVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3.5 flex flex-col gap-3.5 overflow-y-auto transition-opacity duration-300",
          isCollapsed ? "opacity-0 invisible h-0 p-0" : "opacity-100 visible",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTask
              key={task._id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {!isCollapsed && tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-primary/5 rounded-2xl min-h-[120px] text-primary/20 italic text-[11px] font-medium tracking-wide">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Kanban Board ─────────────────────────────────────────────────────────────
interface KanbanTabProps {
  tasks: Task[];
}

export const KanbanTab = ({ tasks }: KanbanTabProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () => new Set(),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTask = useMutation((api as any).tasks.updateTask);

  const toggleColumn = (status: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t._id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    let newStatus: TaskStatus | null = null;

    // Dropped on a column header?
    if (ALL_STATUSES.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
    } else {
      // Dropped on another task — inherit its status
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask) newStatus = overTask.status;
    }

    const task = tasks.find((t) => t._id === activeTaskId);
    if (task && newStatus && task.status !== newStatus) {
      try {
        await updateTask({ id: task._id as Id<"tasks">, status: newStatus });
        toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
      } catch {
        toast.error("Failed to update status");
      }
    }

    setActiveTask(null);
  };

  return (
    <div
      className={cn(
        "flex w-full overflow-x-auto pb-10 scroll-smooth transition-all duration-300 gap-6",
        tasks.length === 0 && "items-center justify-center min-h-[500px]",
      )}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-start justify-center space-y-1.5 p-4 w-[360px] mx-auto">
          <p className="text-base font-medium text-primary">Empty Workspace</p>
          <p className="text-muted-foreground text-sm">
            Create your first task to get started using this interactive kanban
            board.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <CreateTaskDialog
              trigger={
                <Button variant="default" size="sm" className="rounded-full text-[11px]">
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {ALL_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onTaskClick={setSelectedTask}
              isCollapsed={collapsedColumns.has(status)}
              onToggle={() => toggleColumn(status)}
            />
          ))}
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80 scale-105 transition-transform">
                <TaskCard task={activeTask} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
};
