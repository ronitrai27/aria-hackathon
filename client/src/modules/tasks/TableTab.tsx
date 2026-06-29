"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Check,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  FileCodeCorner,
  FolderPen,
  ChartPie,
  Hourglass,
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  CircleDashed,
  CircleDot,
  CirclePause,
  CheckCircle2,
} from "lucide-react";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  "not-started": (
    <CircleDashed className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
  ),
  "in-progress": (
    <CircleDot className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />
  ),
  "on-hold": <CirclePause className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
  delayed: <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
};
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG } from "./taskTypes";
import { EditTaskDialog } from "./EditTaskDialog";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { CreateTaskDialog } from "./CreateTaskDialog";

// ─── Priority bars ─────────────────────────────────────────────────────────────
const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-yellow-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-neutral-400  rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400  rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400  rounded-[1px]" />
    </div>
  ),
};

const PriorityBadge = ({ priority = "medium" }: { priority?: string }) => (
  <div className="flex items-center justify-center w-full">
    {priorityBars[priority] ?? priorityBars.medium}
  </div>
);

const PAGE_SIZE = 10;

interface TableTabProps {
  tasks: Task[];
  selectedTaskIds: Id<"tasks">[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<Id<"tasks">[]>>;
}

export const TableTab = ({
  tasks,
  selectedTaskIds,
  setSelectedTaskIds,
}: TableTabProps) => {
  const [page, setPage] = useState(0);
  const [selectedTaskForSheet, setSelectedTaskForSheet] = useState<Task | null>(
    null,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteTask = useMutation((api as any).tasks.deleteTask);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTask = useMutation((api as any).tasks.updateTask);

  const handleDelete = async (id: Id<"tasks">) => {
    try {
      await deleteTask({ id });
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleComplete = async (id: Id<"tasks">) => {
    try {
      await updateTask({ id, status: "completed" });
      toast.success("Task marked as complete");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  const paginatedTasks = tasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleTask = (taskId: Id<"tasks">) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const toggleAll = () => {
    if (
      selectedTaskIds.length === paginatedTasks.length &&
      paginatedTasks.length > 0
    ) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(paginatedTasks.map((t) => t._id as Id<"tasks">));
    }
  };

  return (
    <div className="relative border-none flex flex-col">
      <div
        className="overflow-auto flex-1"
        style={{ minHeight: "calc(100vh - 320px)" }}
      >
        <Table>
          <TableHeader className="dark:bg-neutral-800 bg-neutral-200/50 z-10">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-[50px] px-6 py-4">
                <Checkbox
                  checked={
                    selectedTaskIds.length === paginatedTasks.length &&
                    paginatedTasks.length > 0
                  }
                  onCheckedChange={toggleAll}
                  className="rounded border-purple-200 hover:border-purple-300 dark:border-purple-800/80 bg-muted/40 data-[state=checked]:bg-purple-100/70 dark:data-[state=checked]:bg-purple-950/40 data-[state=checked]:border-purple-400 dark:data-[state=checked]:border-purple-800 data-[state=checked]:text-purple-700 dark:data-[state=checked]:text-purple-300 data-checked:bg-purple-100/70 dark:data-checked:bg-purple-950/40 data-checked:border-purple-400 dark:data-checked:border-purple-800 data-checked:text-purple-700 dark:data-checked:text-purple-300 transition-all duration-200 cursor-pointer"
                />
              </TableHead>
              <TableHead className="text-[15px] dark:text-primary text-foreground font-medium px-4 min-w-[180px] border-r dark:border-neutral-700 border-neutral-200">
                <div className="flex items-center gap-2">
                  <FolderPen className="w-4 h-4" /> Task Name
                </div>
              </TableHead>
              <TableHead className="text-[15px] dark:text-primary text-foreground font-medium px-4 border-r dark:border-neutral-700 border-neutral-200">
                <div className="flex items-center gap-2">
                  <ChartPie className="w-4 h-4" /> Status
                </div>
              </TableHead>
              <TableHead className="text-[15px] dark:text-primary text-foreground font-medium px-4 border-r dark:border-neutral-700 border-neutral-200">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4" /> Duration
                </div>
              </TableHead>
              <TableHead className="text-[15px] dark:text-primary text-foreground font-medium px-4 border-r dark:border-neutral-700 border-neutral-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 justify-center">
                    <ChartNoAxesColumnIncreasing className="w-4 h-4" /> Priority
                  </div>
                </div>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 p-4 mx-auto">
                    <p className="text-base font-medium text-primary">
                      Empty Workspace
                    </p>
                    <p className="text-muted-foreground text-sm text-center max-w-xs">
                      Create your first task and start managing your work the
                      right way.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <CreateTaskDialog
                        trigger={
                          <Button
                            variant="default"
                            size="sm"
                            className="rounded-full text-[11px]"
                          >
                            <Plus className="w-4 h-4" /> Add Task
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => {
                const isSelected = selectedTaskIds.includes(
                  task._id as Id<"tasks">,
                );
                const overdue =
                  task.estimation?.endDate < Date.now() &&
                  task.status !== "completed";

                return (
                  <TableRow
                    key={task._id}
                    className={cn(
                      "group dark:border-b dark:border-neutral-800 border-b border-neutral-200 dark:hover:bg-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer",
                      isSelected && "bg-primary/5",
                    )}
                    onClick={() => setSelectedTaskForSheet(task)}
                  >
                    <TableCell
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleTask(task._id as Id<"tasks">)
                        }
                        className="rounded border-purple-200 hover:border-purple-300 dark:border-purple-800/80 bg-muted/40 data-[state=checked]:bg-purple-100/70 dark:data-[state=checked]:bg-purple-950/40 data-[state=checked]:border-purple-400 dark:data-[state=checked]:border-purple-800 data-[state=checked]:text-purple-700 dark:data-[state=checked]:text-purple-300 data-checked:bg-purple-100/70 dark:data-checked:bg-purple-950/40 data-checked:border-purple-400 dark:data-checked:border-purple-800 data-checked:text-purple-700 dark:data-checked:text-purple-300 transition-all duration-200 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="px-4 text-sm font-medium border-r border-b dark:border-neutral-700 border-neutral-200 text-muted-foreground transition-colors dark:group-hover:text-primary group-hover:text-foreground max-w-[180px]">
                      <div className="flex items-center gap-1.5 capitalize w-full min-w-0">
                        <span className="dark:text-primary text-foreground truncate">
                          {task.title}
                        </span>
                        {overdue && (
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
                                  Overdue: due on{" "}
                                  {format(
                                    task.estimation.endDate,
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 border-r border-b dark:border-neutral-700 border-neutral-200">
                      <Badge
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[12px] flex items-center gap-1.5 border font-semibold capitalize whitespace-nowrap dark:bg-neutral-800/80 bg-neutral-100/80 dark:text-neutral-200 text-neutral-800 border-neutral-300 dark:border-neutral-700",
                        )}
                      >
                        {STATUS_ICONS[task.status as TaskStatus]}
                        {STATUS_CONFIG[task.status as TaskStatus]?.label ??
                          task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 dark:group-hover:text-primary group-hover:text-foreground transition-colors border-r border-b dark:border-neutral-700 border-neutral-200">
                      <span className="flex items-center justify-center gap-1.5">
                        {format(task.estimation.startDate, "MMM d")} —{" "}
                        {format(task.estimation.endDate, "MMM d")}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 border-r border-b text-muted-foreground dark:group-hover:text-primary group-hover:text-foreground transition-colors dark:border-neutral-700 border-neutral-200">
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell
                      className="px-4 text-right border-b dark:border-neutral-700 border-neutral-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                          >
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
                              onSelect={() =>
                                handleComplete(task._id as Id<"tasks">)
                              }
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
                                  This action cannot be undone. This will
                                  permanently delete this task.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-900">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDelete(task._id as Id<"tasks">)
                                  }
                                  className="bg-red-600 text-white hover:bg-red-700 border-none"
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t dark:border-neutral-800 border-neutral-200">
        <div className="text-xs font-medium text-muted-foreground tracking-wider">
          Showing {tasks.length === 0 ? 0 : page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, tasks.length)} of {tasks.length}{" "}
          Results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="h-7 px-3 text-[10px] font-semibold bg-transparent dark:border-neutral-800 border-neutral-200 dark:text-primary text-foreground transition-all disabled:opacity-20"
          >
            <ChevronLeft size={12} className="mr-1" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 text-[10px] font-bold p-0 dark:bg-primary/10 bg-primary/5 dark:text-primary text-primary/80 border dark:border-primary/20 border-primary/10 rounded-md"
            >
              {page + 1}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="h-7 px-3 text-[10px] font-semibold bg-transparent dark:border-neutral-800 border-neutral-200 dark:text-primary text-foreground transition-all disabled:opacity-20"
          >
            Next <ChevronRight size={12} className="ml-1" />
          </Button>
        </div>
      </div>

      <TaskDetailSheet
        task={selectedTaskForSheet}
        open={!!selectedTaskForSheet}
        onOpenChange={(open) => !open && setSelectedTaskForSheet(null)}
      />
    </div>
  );
};
