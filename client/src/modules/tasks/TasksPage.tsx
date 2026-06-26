"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  Flag,
  LayoutList,
  Loader2,
  Plus,
  Search,
  Table,
  KanbanSquare,
  Trash2,
  SlidersHorizontal,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "./taskTypes";
import { ALL_STATUSES, STATUS_CONFIG } from "./taskTypes";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { ListTab } from "./TaskListView";
import { TableTab } from "./TableTab";
import { KanbanTab } from "./KanbanTab";

const TABS = [
  { id: "List", label: "List", icon: LayoutList },
  { id: "Table", label: "Table", icon: Table },
  { id: "Kanban", label: "Kanban", icon: KanbanSquare },
];

export function TasksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = useQuery((api as any).tasks.getTasks) as Task[] | undefined;
  const [activeTab, setActiveTab] = useState<"List" | "Table" | "Kanban">(
    "List",
  );
  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks">[]>([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteTasks = useMutation((api as any).tasks.deleteTasks);

  const handleDeleteTasks = async () => {
    try {
      await deleteTasks({ ids: selectedTaskIds });
      toast.success(`${selectedTaskIds.length} tasks deleted successfully`);
      setSelectedTaskIds([]);
    } catch {
      toast.error("Failed to delete tasks");
    }
  };

  const isLoading = tasks === undefined;

  // Filter tasks based on search and priority filter
  const filtered = (tasks ?? []).filter((t: Task) => {
    const matchSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  return (
    <div className="flex flex-col gap-6 w-full h-full p-2 relative">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 " />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              My Tasks
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage your personal tasks
          </p>
        </div>
        <CreateTaskDialog
          trigger={
            <Button className="gap-2 rounded-sm cursor-pointer">
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          }
        />
      </div>

      {/* ─── Tabs & Filters Row ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border/40 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as "List" | "Table" | "Kanban");
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-1.5 rounded-sm! text-sm font-medium transition-all duration-200 select-none cursor-pointer outline-none",
                  isActive
                    ? "bg-white border border-border font-semibold"
                    : "text-foreground hover:bg-muted/30",
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm bg-muted border-border focus-visible:ring-0 rounded-md"
            />
          </div>

          {/* Priority filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-1.5 text-xs border-border bg-muted/40",
                  priorityFilter !== "all" &&
                    "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-900",
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                {priorityFilter === "all"
                  ? "Priority"
                  : `${priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border"
            >
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    "text-xs cursor-pointer gap-2",
                    priorityFilter === p && "font-semibold",
                  )}
                >
                  {p === "all" ? (
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  ) : (
                    <Flag
                      className={cn(
                        "w-3.5 h-3.5",
                        p === "high" && "text-red-500",
                        p === "medium" && "text-yellow-500",
                        p === "low" && "text-blue-400",
                      )}
                    />
                  )}
                  {p === "all"
                    ? "All priorities"
                    : `${p.charAt(0).toUpperCase() + p.slice(1)}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bulk Delete Button */}
          {selectedTaskIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 text-xs animate-in fade-in zoom-in duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedTaskIds.length} Tasks
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-neutral-900 border-neutral-800 shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-primary">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. This will permanently delete{" "}
                    <span className="text-primary font-semibold">
                      {selectedTaskIds.length}
                    </span>{" "}
                    tasks and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-primary hover:bg-neutral-700">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTasks}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="mt-2 max-w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full">
            {activeTab === "List" && (
              <ListTab
                tasks={filtered}
                selectedTaskIds={selectedTaskIds}
                setSelectedTaskIds={setSelectedTaskIds}
              />
            )}
            {activeTab === "Table" && (
              <TableTab
                tasks={filtered}
                selectedTaskIds={selectedTaskIds}
                setSelectedTaskIds={setSelectedTaskIds}
              />
            )}
            {activeTab === "Kanban" && <KanbanTab tasks={filtered} />}
          </div>
        )}
      </div>
    </div>
  );
}
