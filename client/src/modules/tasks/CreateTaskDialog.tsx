"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Flag,
  CalendarRange,
  CircleDashed,
  CircleDot,
  CirclePause,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "./taskTypes";
import { STATUS_CONFIG } from "./taskTypes";
import { Label } from "@/components/ui/label";

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

function StatusDot({ status }: { status: TaskStatus }) {
  return STATUS_ICONS[status];
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

// ─── Priority bars ─────────────────────────────────────────────────────────────
const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3 mb-0.5 shrink-0">
      <div className="w-[4px] h-5 bg-yellow-500 rounded-[1px]" />
      <div className="w-[4px] h-4 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-3 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3 mb-0.5 shrink-0">
      <div className="w-[4px] h-5 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-3 dark:bg-neutral-400 bg-accent rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3 mb-0.5 shrink-0">
      <div className="w-[4px] h-5 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-[8px] dark:bg-neutral-400 bg-accent rounded-[1px]" />
    </div>
  ),
};

interface CreateTaskDialogProps {
  trigger: React.ReactNode;
}

export function CreateTaskDialog({ trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not-started");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTask = useMutation((api as any).tasks.createTask);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("not-started");
    setPriority("medium");
    setDate(undefined);
    setDuplicateError(false);
  };

  const handleCreate = async () => {
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
      await createTask({
        title,
        description: description.trim() || undefined,
        status,
        priority,
        estimation: {
          startDate: date.from.getTime(),
          endDate: date.to.getTime(),
        },
      });
      toast.success("Task created");
      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.data ?? err?.message ?? "";
      if (msg === "DUPLICATE_TITLE" || msg.includes("DUPLICATE_TITLE")) {
        setDuplicateError(true);
      } else {
        toast.error("Failed to create task");
        console.error(err);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full min-w-[600px] bg-card border border-border shadow-xl p-0 overflow-hidden text-foreground rounded-xl">
        {/* Header Breadcrumb */}
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border bg-neutral-100">
          <div className="flex items-center gap-1.5 text-xs text font-medium select-none">
            <span className="hover:text-foreground transition-colors cursor-pointer">
              My Tasks
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground font-semibold">New Task</span>
          </div>
        </DialogHeader>

        {/* Body content with clear and bounded input fields */}
        <div className="p-6 space-y-5">
          {/* Task Title Input Box */}
          <div className="space-y-1.5">
            <Label className="text-sm">Task Title</Label>
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (duplicateError) setDuplicateError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              className={cn(
                "h-10 text-sm bg-neutral-100 border border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
                duplicateError &&
                  "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
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
            <Label className="text-sm">Task Settings</Label>
            <div className="flex items-center gap-2.5 overflow-x-auto whitespace-nowrap py-1">
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 rounded-lg text-xs bg-neutral-100 border border-border/80 hover:bg-muted/20 transition-all shrink-0 px-4"
                  >
                    <StatusDot status={status} />
                    <span>{STATUS_CONFIG[status].label}</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-popover border border-border shadow-lg rounded-lg min-w-[140px]"
                  align="start"
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 text-muted-foreground/60 border-b border-border/60">
                    Status
                  </div>
                  {(
                    [
                      "not-started",
                      "in-progress",
                      "on-hold",
                      "delayed",
                      "completed",
                    ] as TaskStatus[]
                  ).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setStatus(s)}
                      className="gap-2.5 cursor-pointer text-xs py-2 px-3 focus:bg-accent hover:bg-accent rounded-md"
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
                    className="h-10 gap-2 rounded-lg text-xs bg-neutral-100 border border-border/80 hover:bg-muted/20 transition-all shrink-0 px-4"
                  >
                    {priorityBars[priority]}
                    <span className="capitalize">{priority} Priority</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-popover border border-border shadow-lg rounded-lg min-w-[140px]"
                  align="start"
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 text-muted-foreground/60 border-b border-border/60">
                    Priority
                  </div>
                  {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => setPriority(p)}
                      className="gap-2.5 cursor-pointer text-xs py-2 px-3 focus:bg-accent hover:bg-accent rounded-md"
                    >
                      {priorityBars[p]}
                      <span className="capitalize">{p}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Duration Range Picker */}
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 rounded-lg text-xs bg-neutral-100 border border-border/80 hover:bg-muted/20 transition-all shrink-0 px-4"
                  >
                    <CalendarRange className="w-3.5 h-3.5 text-muted-foreground/80" />
                    <span>
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "MMM dd")} –{" "}
                            {format(date.to, "MMM dd")}
                          </>
                        ) : (
                          format(date.from, "MMM dd")
                        )
                      ) : (
                        "Select Duration"
                      )}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-popover border border-border shadow-xl rounded-lg"
                  align="start"
                >
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
              className="min-h-[140px] text-sm bg-neutral-50 dark:bg-neutral-900 border border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none placeholder:text-muted-foreground/40 p-3 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-neutral-100 dark:bg-neutral-950">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="h-9 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-all"
          >
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={handleCreate}
            className="h-9 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 shadow-sm hover:shadow transition-all duration-200"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating Task…
              </span>
            ) : (
              "Create Task"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
