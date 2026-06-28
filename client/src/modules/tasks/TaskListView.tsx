"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  Clock,
  Edit,
  FolderPen,
  Minus,
  MoreHorizontal,
  Plus,
  TextQuote,
  Info,
  CircleDashed,
  CircleDot,
  CirclePause,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG, ALL_STATUSES } from "./taskTypes";
import { EditTaskDialog } from "./EditTaskDialog";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { CreateTaskDialog } from "./CreateTaskDialog";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  "not-started": <CircleDashed className="w-4 h-4 text-neutral-400 shrink-0" />,
  "in-progress": (
    <CircleDot className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
  ),
  "on-hold": <CirclePause className="w-4 h-4 text-yellow-500 shrink-0" />,
  delayed: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
};

// ─── Priority bars (exact WeKraft style) ──────────────────────────────────────
const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-yellow-500 rounded-[1px]" />
      <div className="w-[4px] h-4 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-3 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-3 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
};

const PriorityBadge = ({ priority = "medium" }: { priority?: string }) => (
  <div className="flex items-center justify-center w-full">
    {priorityBars[priority] ?? priorityBars.medium}
  </div>
);

// ─── Status badge with icon ────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[12px] flex items-center gap-1.5 border font-medium capitalize whitespace-nowrap dark:bg-primary/10 bg-primary/5 dark:text-primary text-primary/80",
        cfg.color,
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.accent)} />
      {cfg.label}
    </span>
  );
};

// ─── Overdue indicator ────────────────────────────────────────────────────────
const OverdueIcon = ({ task }: { task: Task }) => {
  const overdue =
    task.estimation?.endDate < Date.now() && task.status !== "completed";
  if (!overdue) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-primary/80 shrink-0 ml-auto cursor-pointer" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="px-2 py-2 bg-neutral-900 border border-neutral-800 text-neutral-200"
        >
          <p className="text-[11px] font-medium">
            Overdue: due on {format(task.estimation.endDate, "MMM d, yyyy")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Row context menu ─────────────────────────────────────────────────────────
const TaskRowMenu = ({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: () => void;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStatus = useMutation((api as any).tasks.updateTask);

  const handleComplete = async () => {
    try {
      await updateStatus({ id: task._id, status: "completed" });
      toast.success("Task marked as complete");
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-xl shadow-xl border-muted/50"
      >
        <EditTaskDialog
          task={task}
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="gap-2 focus:bg-primary/5 cursor-pointer text-xs font-semibold py-2"
            >
              <Edit className="w-4 h-4" /> Edit Task
            </DropdownMenuItem>
          }
        />
        {task.status !== "completed" && (
          <DropdownMenuItem
            onSelect={handleComplete}
            className="gap-2 focus:bg-primary/5 cursor-pointer text-xs py-2"
          >
            <Check className="w-4 h-4" /> Mark as Complete
          </DropdownMenuItem>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="gap-2 focus:bg-red-500/10 text-red-500 cursor-pointer text-xs font-semibold py-2"
            >
              <AlertCircle className="w-4 h-4" /> Delete Task
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white border border-neutral-200 shadow-xl max-w-md rounded-xl p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neutral-900 font-semibold">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-500">
                This action cannot be undone. This will permanently delete this
                task and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 text-white hover:bg-red-700 border-none"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Task Group (one per status) ──────────────────────────────────────────────
interface TaskGroupProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  defaultExpanded?: boolean;
  selectedTaskIds: Id<"tasks">[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<Id<"tasks">[]>>;
  onTaskClick: (task: Task) => void;
  onDelete: (id: Id<"tasks">) => void;
}

const TaskGroup = ({
  title,
  tasks,
  status,
  defaultExpanded = false,
  selectedTaskIds,
  setSelectedTaskIds,
  onTaskClick,
  onDelete,
}: TaskGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const groupTaskIds = tasks.map((t) => t._id as Id<"tasks">);
  const isAllGroupSelected =
    tasks.length > 0 &&
    groupTaskIds.every((id) => selectedTaskIds.includes(id));

  const toggleAll = () => {
    if (isAllGroupSelected) {
      setSelectedTaskIds((prev) =>
        prev.filter((id) => !groupTaskIds.includes(id)),
      );
    } else {
      setSelectedTaskIds((prev) => {
        const next = [...prev];
        groupTaskIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const toggleTask = (taskId: Id<"tasks">) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  return (
    <div>
      {/* Group Header */}
      <div
        className={cn(
          "flex items-center justify-between mb-4 px-4 dark:bg-neutral-800 bg-neutral-200/55 py-1.5 rounded-md",
          status === "not-started" && "border-l-4 border-neutral-400",
          status === "in-progress" && "border-l-4 border-blue-400",
          status === "on-hold" && "border-l-4 border-yellow-500",
          status === "delayed" && "border-l-4 border-red-500",
          status === "completed" && "border-l-4 border-emerald-500",
        )}
      >
        <div
          className="flex items-center gap-3 cursor-pointer w-full select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground bg-muted rounded transition-transform duration-200",
              !isExpanded && "-rotate-90",
            )}
          />
          {STATUS_ICONS[status]}
          <h2 className="text-base tracking-tight flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
            {title}
            <span className="text-[10px] font-medium text-muted-foreground dark:bg-muted bg-neutral-100 px-1.5 py-0.5 rounded">
              {tasks.length}
            </span>
          </h2>
        </div>
        <CreateTaskDialog
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 rounded-md transition-all hover:bg-primary/10 hover:text-primary p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          }
        />
      </div>

      {/* Rows */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full dark:bg-background bg-card mt-2"
          >
            <Table className="border-t border-b dark:border-neutral-700 border-neutral-200">
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:bg-neutral-900 bg-neutral-100 border-none">
                  <TableHead className="w-[50px] px-4">
                    <Checkbox
                      checked={isAllGroupSelected}
                      onCheckedChange={toggleAll}
                      className="rounded border-purple-200 hover:border-purple-300 dark:border-purple-800/80 bg-muted/40 data-[state=checked]:bg-purple-100/70 dark:data-[state=checked]:bg-purple-950/40 data-[state=checked]:border-purple-400 dark:data-[state=checked]:border-purple-800 data-[state=checked]:text-purple-700 dark:data-[state=checked]:text-purple-300 data-checked:bg-purple-100/70 dark:data-checked:bg-purple-950/40 data-checked:border-purple-400 dark:data-checked:border-purple-800 data-checked:text-purple-700 dark:data-checked:text-purple-300 transition-all duration-200 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="px-4 text-sm font-medium dark:text-primary capitalize tracking-widest min-w-[200px] border-r border-b dark:border-neutral-700 border-neutral-200">
                    <div className="flex items-center gap-2">
                      <FolderPen className="w-4 h-4" /> Task Name
                    </div>
                  </TableHead>
                  <TableHead className="px-4 text-sm font-medium capitalize tracking-widest w-[200px] min-w-[150px] border-r border-b dark:border-neutral-700 border-neutral-200">
                    <div className="flex items-center gap-2">
                      <TextQuote className="w-4 h-4" /> Description
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px] dark:text-primary text-foreground font-medium px-4 border-r border-b dark:border-neutral-700 border-neutral-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Duration
                    </div>
                  </TableHead>
                  <TableHead className="text-[13px] dark:text-primary text-foreground font-medium px-4 border-b dark:border-neutral-700 border-neutral-200">
                    <div className="flex items-center gap-2">
                      <ChartNoAxesColumnIncreasing className="w-4 h-4" />{" "}
                      Priority
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-none">
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No tasks under {title.toLowerCase()}
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow
                      key={task._id}
                      className={cn(
                        "group border-none dark:hover:bg-neutral-900 hover:bg-neutral-100 transition-all duration-200 cursor-pointer",
                        selectedTaskIds.includes(task._id as Id<"tasks">) &&
                          "bg-primary/5",
                      )}
                      onClick={() => onTaskClick(task)}
                    >
                      <TableCell
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedTaskIds.includes(
                            task._id as Id<"tasks">,
                          )}
                          onCheckedChange={() =>
                            toggleTask(task._id as Id<"tasks">)
                          }
                          className="rounded border-purple-200 hover:border-purple-300 dark:border-purple-800/80 bg-muted/40 data-[state=checked]:bg-purple-100/70 dark:data-[state=checked]:bg-purple-950/40 data-[state=checked]:border-purple-400 dark:data-[state=checked]:border-purple-800 data-[state=checked]:text-purple-700 dark:data-[state=checked]:text-purple-300 data-checked:bg-purple-100/70 dark:data-checked:bg-purple-950/40 data-checked:border-purple-400 dark:data-checked:border-purple-800 data-checked:text-purple-700 dark:data-checked:text-purple-300 transition-all duration-200 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="p-2.5 border-r border-b dark:border-neutral-700 border-neutral-200 max-w-[180px]">
                        <span className="text-sm font-medium dark:text-primary text-foreground capitalize flex items-center gap-1.5 transition-colors w-full min-w-0">
                          <span className="truncate">{task.title}</span>
                          <OverdueIcon task={task} />
                        </span>
                      </TableCell>
                      <TableCell className="p-2.5 border-r border-b dark:border-neutral-700 border-neutral-200 max-w-[180px]">
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 dark:group-hover:text-primary group-hover:text-foreground transition-colors line-clamp-1 max-w-[180px] truncate font-medium">
                          {task.description || "No description provided yet..."}
                        </p>
                      </TableCell>
                      <TableCell className="p-2.5 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300 dark:group-hover:text-primary group-hover:text-foreground border-r border-b dark:border-neutral-700 border-neutral-200 transition-colors font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {format(task.estimation.startDate, "MMM d")} —{" "}
                            {format(task.estimation.endDate, "MMM d")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2.5 border-b dark:border-neutral-700 border-neutral-200 text-muted-foreground dark:group-hover:text-primary group-hover:text-foreground whitespace-nowrap transition-colors">
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell
                        className="p-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TaskRowMenu
                          task={task}
                          onDelete={() => onDelete(task._id as Id<"tasks">)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── List Tab ─────────────────────────────────────────────────────────────────
interface ListTabProps {
  tasks: Task[];
  selectedTaskIds: Id<"tasks">[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<Id<"tasks">[]>>;
}

export const ListTab = ({
  tasks,
  selectedTaskIds,
  setSelectedTaskIds,
}: ListTabProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteTask = useMutation((api as any).tasks.deleteTask);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: Id<"tasks">) => {
    try {
      await deleteTask({ id });
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const grouped: Record<TaskStatus, Task[]> = {
    "not-started": tasks.filter((t) => t.status === "not-started"),
    "in-progress": tasks.filter((t) => t.status === "in-progress"),
    "on-hold": tasks.filter((t) => t.status === "on-hold"),
    delayed: tasks.filter((t) => t.status === "delayed"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  const GROUPS: TaskStatus[] = [
    "not-started",
    "in-progress",
    "on-hold",
    "delayed",
    "completed",
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
      {GROUPS.map((status) => (
        <TaskGroup
          key={status}
          title={STATUS_CONFIG[status].label}
          tasks={grouped[status]}
          status={status}
          defaultExpanded={tasks.length === 0 || grouped[status].length > 0}
          selectedTaskIds={selectedTaskIds}
          setSelectedTaskIds={setSelectedTaskIds}
          onTaskClick={handleTaskClick}
          onDelete={handleDelete}
        />
      ))}

      <TaskDetailSheet
        task={selectedTask}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
};
