"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { AlertCircle, ChevronRight, Flag, Loader2, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG } from "./taskTypes";

function StatusDot({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <span className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm", cfg.accent)} />;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; textColor: string; iconColor: string; bg: string }
> = {
  high: {
    label: "High",
    textColor: "text-red-700 dark:text-red-300",
    iconColor: "text-red-500",
    bg: "bg-red-500/10 dark:bg-red-500/20",
  },
  medium: {
    label: "Medium",
    textColor: "text-yellow-700 dark:text-yellow-300",
    iconColor: "text-yellow-500",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
  },
  low: {
    label: "Low",
    textColor: "text-blue-700 dark:text-blue-300",
    iconColor: "text-blue-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
  },
};

interface EditTaskDialogProps {
  trigger: React.ReactNode;
  task: Task;
}

export function EditTaskDialog({ trigger, task }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(task.estimation.startDate),
    to: new Date(task.estimation.endDate),
  });
  const [isPending, setIsPending] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Sync state when the task prop changes
  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDate({
        from: new Date(task.estimation.startDate),
        to: new Date(task.estimation.endDate),
      });
      setDuplicateError(false);
    }
  }, [open, task]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTask = useMutation((api as any).tasks.updateTask);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!date?.from || !date?.to) {
      toast.error("Please select a start and end date");
      return;
    }

    try {
      setIsPending(true);
      setDuplicateError(false);
      await updateTask({
        id: task._id as Id<"tasks">,
        title,
        description: description.trim() || undefined,
        status,
        priority,
        estimation: {
          startDate: date.from.getTime(),
          endDate: date.to.getTime(),
        },
      });
      toast.success("Task updated");
      setOpen(false);
    } catch (err: any) {
      const msg = err?.data ?? err?.message ?? "";
      if (msg === "DUPLICATE_TITLE" || msg.includes("DUPLICATE_TITLE")) {
        setDuplicateError(true);
      } else {
        toast.error("Failed to update task");
        console.error(err);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full sm:max-w-[540px] bg-card border border-border shadow-2xl p-0 overflow-hidden text-foreground rounded-xl">
        {/* Header Breadcrumb */}
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
            <span className="hover:text-foreground transition-colors cursor-pointer">My Tasks</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-foreground font-semibold">Edit Task</span>
          </div>
        </DialogHeader>

        {/* Body content with clear and bounded input fields */}
        <div className="p-6 space-y-5">
          {/* Task Title Input Box */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Task Title
            </Label>
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (duplicateError) setDuplicateError(false);
              }}
              className={cn(
                "h-10 text-sm bg-muted/10 border border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
                duplicateError && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500"
              )}
            />
            {duplicateError && (
              <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                You already have a task with this name
              </p>
            )}
          </div>

          {/* Properties row */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Task Settings
            </Label>
            <div className="flex items-center gap-2.5 overflow-x-auto whitespace-nowrap py-1">
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 rounded-lg text-xs bg-muted/10 border-border/80 hover:bg-muted/20 text-muted-foreground hover:text-foreground font-semibold transition-all shrink-0 px-4"
                  >
                    <StatusDot status={status} />
                    <span>{STATUS_CONFIG[status].label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border border-border shadow-lg rounded-lg min-w-[140px]" align="start">
                  <div className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 text-muted-foreground/60 border-b border-border/60">
                    Status
                  </div>
                  {(["not-started", "in-progress", "on-hold", "delayed", "completed"] as TaskStatus[]).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setStatus(s)}
                      className="gap-2.5 cursor-pointer text-xs py-2 px-3 focus:bg-primary/5 hover:bg-primary/5 rounded-md"
                    >
                      <StatusDot status={s} />
                      <span>{STATUS_CONFIG[s].label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 gap-2 rounded-lg text-xs bg-muted/10 border-border/80 hover:bg-muted/20 text-muted-foreground hover:text-foreground font-semibold transition-all shrink-0 px-4",
                      priorityConfig[priority].textColor
                    )}
                  >
                    <Flag className={cn("w-3.5 h-3.5", priorityConfig[priority].iconColor)} />
                    <span>{priorityConfig[priority].label} Priority</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border border-border shadow-lg rounded-lg min-w-[140px]" align="start">
                  <div className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 text-muted-foreground/60 border-b border-border/60">
                    Priority
                  </div>
                  {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => setPriority(p)}
                      className="gap-2.5 cursor-pointer text-xs py-2 px-3 focus:bg-primary/5 hover:bg-primary/5 rounded-md"
                    >
                      <Flag className={cn("w-3.5 h-3.5", priorityConfig[p].iconColor)} />
                      <span className={priorityConfig[p].textColor}>{priorityConfig[p].label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Duration Range Picker */}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 gap-2 rounded-lg text-xs bg-muted/10 border-border/80 hover:bg-muted/20 text-muted-foreground hover:text-foreground font-semibold transition-all shrink-0 px-4",
                      date?.from && "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <CalendarRange className="w-3.5 h-3.5 text-muted-foreground/80" />
                    {date?.from ? (
                      date.to ? (
                        <>{format(date.from, "MMM dd")} – {format(date.to, "MMM dd")}</>
                      ) : (
                        format(date.from, "MMM dd")
                      )
                    ) : (
                      "Select Dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-xl rounded-lg" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={date?.from ?? new Date()}
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate?.from && newDate?.to) {
                        setIsDatePickerOpen(false);
                      }
                    }}
                    numberOfMonths={1}
                    className="rounded-lg"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description Textarea Box */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              placeholder="Add details, notes or description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[140px] text-sm bg-muted/10 border border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none placeholder:text-muted-foreground/40 p-3 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-muted/10">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="h-9 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-all"
          >
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={handleSave}
            className="h-9 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 shadow-sm hover:shadow transition-all duration-200"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving Changes…
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
