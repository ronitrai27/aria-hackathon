"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";

import {
  LineChart,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  RefreshCw,
  Calendar as CalendarIcon,
  Trash2,
  Sparkles,
  FileText,
  Send,
  Database,
  Bell,
  Cpu,
  Layers,
  Globe,
  Activity,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// List of colorful icons for workflows
const ICONS = [
  FileText,
  Send,
  Database,
  Bell,
  Cpu,
  Layers,
  Globe,
  Activity,
  Zap,
  Sparkles,
];
const BG_COLORS = [
  "bg-violet-50 text-violet-600 border border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50",
  "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
  "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
  "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
  "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
  "bg-cyan-50 text-cyan-600 border border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50",
  "bg-pink-50 text-pink-600 border border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/50",
];

const getWorkflowIconDetails = (name: string, id: string) => {
  const code = (name + id)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const IconComponent = ICONS[code % ICONS.length];
  const bgClass = BG_COLORS[code % BG_COLORS.length];
  return { IconComponent, bgClass };
};

export default function WorkflowsPage() {
  const router = useRouter();

  // Queries & Mutations
  const workflows = useQuery(api.workflows.getWorkflows);
  const updateStatus = useMutation(api.workflows.updateStatus);
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">(
    "all",
  );
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: "single" | "bulk";
    id?: string;
    name?: string;
  }>({ isOpen: false, type: "single" });

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Toggle select all on current page
  const handleToggleSelectAll = () => {
    const pageIds = paginatedWorkflows.map((w) => w._id as string);
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        pageIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmDelete({ isOpen: true, type: "bulk" });
  };

  // Working filter logic
  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    return workflows.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || w.status === statusFilter;

      let matchesDate = true;
      if (dateRange.from) {
        const createdDate = new Date(w.createdAt);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = createdDate >= fromDate;
      }
      if (dateRange.to) {
        const createdDate = new Date(w.createdAt);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && createdDate <= toDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [workflows, searchQuery, statusFilter, dateRange]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage) || 1;
  const paginatedWorkflows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkflows.slice(start, start + itemsPerPage);
  }, [filteredWorkflows, currentPage]);

  const startIndex = filteredWorkflows.length
    ? (currentPage - 1) * itemsPerPage + 1
    : 0;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredWorkflows.length,
  );

  // Stats
  const workflowsCount = workflows?.length || 0;
  const freeLimit = 5;
  const isLimitReached = workflowsCount >= freeLimit;

  // Toggle Status
  const handleToggleStatus = async (id: any, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "draft" : "active";
    try {
      await updateStatus({ id, status: nextStatus });
      toast.success(`Workflow set to ${nextStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Delete Workflow
  const handleDelete = (id: any, name: string) => {
    setConfirmDelete({ isOpen: true, type: "single", id, name });
  };

  const executeDelete = async () => {
    if (confirmDelete.type === "single" && confirmDelete.id) {
      try {
        await deleteWorkflow({ id: confirmDelete.id as any });
        toast.success("Workflow deleted successfully");
      } catch (error) {
        toast.error("Failed to delete workflow");
      }
    } else if (confirmDelete.type === "bulk") {
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        try {
          await deleteWorkflow({ id: id as any });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} workflow(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} workflow(s)`);
      }

      setSelectedIds([]);
    }
    setConfirmDelete({ isOpen: false, type: "single" });
  };

  // Custom scheduling formatter matching the image
  const formatScheduled = (
    name: string,
    scheduled?: { time: string; frequency: string },
  ) => {
    if (name === "New Lead Onboarding") return "Every Monday, 10:00 AM";
    if (name === "Invoice Reminder") return "Every Friday, 4:00 PM";
    if (name === "Daily Summary Report") return "Every day, 9:00 AM";
    if (name === "Support Ticket Routing") return "On event";
    if (name === "Data Sync Pipeline") return "Every 6 hours";

    if (!scheduled) return "On event";

    const formatTime12h = (timeStr: string) => {
      const parts = timeStr.split(":");
      if (parts.length < 2) return timeStr;
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      if (isNaN(hours)) return timeStr;
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    };

    const timeFormatted = formatTime12h(scheduled.time);
    const freq = scheduled.frequency.toLowerCase();

    if (freq === "once") return `Once, ${timeFormatted}`;
    if (freq === "daily") return `Daily, ${timeFormatted}`;
    if (freq === "weekly") return `Weekly, ${timeFormatted}`;
    if (freq === "monthly") return `Monthly, ${timeFormatted}`;

    return `${scheduled.frequency.charAt(0).toUpperCase() + scheduled.frequency.slice(1)}, ${timeFormatted}`;
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
          Workflows <LineChart className="w-6 h-6" />
        </h1>
        <div className="flex items-center gap-3">
          <Button
            className="gap-2 text-xs rounded-md shadow-sm"
            onClick={() => {
              if (isLimitReached) {
                toast.error(
                  "Free plan limit reached! Delete a workflow to create a new one.",
                );
                return;
              }
              router.push("/home/agent");
            }}
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-transparent via-purple-50 to-purple-200 border border-border px-6 py-4 flex items-center justify-between min-h-[200px] dark:bg-violet-950/10 dark:border-violet-900/50">
        {/* Left — text + CTAs */}
        <div className="relative z-10 min-w-[400px]! space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
            Automate. Orchestrate. Elevate.
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Build powerful workflows that connect your apps,
            <br />
            agents, and data — all in one place.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              className="bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 text-xs px-4 h-8 rounded-sm shadow-sm"
              onClick={() => {
                if (isLimitReached) {
                  toast.error("Free plan limit reached!");
                  return;
                }
                router.push("/home/agent");
              }}
            >
              Create Now +
            </Button>
          </div>
        </div>

        {/* Right — decorative flow diagram */}
        <div className="relative w-full select-none">
          <Image
            src="/idk.svg"
            alt="Workflow"
            width={360}
            height={360}
            className="absolute -top-24 right-0 opacity-90"
          />
        </div>
      </div>

      {/* ── Control bar (Filters & Count Limit Indicator) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border  rounded-md px-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Working Search Bar */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 " />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 text-xs rounded-md border border-neutral-200 bg-neutral-50"
            />
          </div>

          {/* Status Filter (Working) */}
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs rounded-md border border-neutral-200 bg-neutral-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter (Working, Shadcn style) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs rounded-md border bg-neutral-50 font-normal "
              >
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} -{" "}
                      {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd")
                  )
                ) : (
                  "Date Range"
                )}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-md" align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={{
                  from: dateRange.from,
                  to: dateRange.to,
                }}
                onSelect={(range: any) => setDateRange(range || {})}
                numberOfMonths={1}
                className="rounded-md border bg-popover"
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-2 border-t flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({})}
                    className="text-xs text-red-500 hover:text-red-600 h-8"
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side controls & Limit Tracker */}
        <div className="flex items-center gap-4">
          {/* Workflows limit display */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Limit:{" "}
              <span className="font-semibold text-foreground">
                {workflowsCount}
              </span>{" "}
              / {freeLimit} workflows
            </span>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLimitReached ? "bg-red-500" : "bg-purple-400"
                }`}
                style={{
                  width: `${Math.min((workflowsCount / freeLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Grid/List View Toggles + Refresh Button */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toast.success("Refreshed workflows list")}
              className="h-9 w-9 rounded-md border text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBulkDelete}
                className="h-9 w-9 rounded-md border border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Workflows Table ─────────────────────────────────────── */}
      <div className=" overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b text-xs text-neutral-800 uppercase ">
                <th className="py-4 px-4 w-12 text-center font-medium">
                  <Checkbox
                    className="rounded"
                    checked={
                      paginatedWorkflows.length > 0 &&
                      paginatedWorkflows.every((w) =>
                        selectedIds.includes(w._id),
                      )
                    }
                    onCheckedChange={handleToggleSelectAll}
                  />
                </th>
                <th className="py-4 px-4 font-medium text-muted-foreground/80 normal-case">
                  Workflow
                </th>
                <th className="py-4 px-4 text-center font-medium text-muted-foreground/80 normal-case">
                  Steps
                </th>
                <th className="py-4 px-4 font-medium text-muted-foreground/80 normal-case">
                  Last run
                </th>
                <th className="py-4 px-4 font-medium text-muted-foreground/80 normal-case">
                  Scheduled
                </th>
                <th className="py-4 px-4 font-medium text-muted-foreground/80 normal-case">
                  Created at
                </th>
                <th className="py-4 px-4 text-right pr-6 font-medium text-muted-foreground/80 normal-case">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workflows === undefined ? (
                // Loading Skeleton Rows
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="h-4 w-4 bg-muted rounded mx-auto" />
                      </td>
                      <td className="py-4 px-4 flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-lg" />
                        <div className="space-y-2">
                          <div className="h-4 w-48 bg-muted rounded" />
                          <div className="h-3 w-32 bg-muted rounded" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-10 bg-muted rounded mx-auto" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-28 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-muted rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-6 w-12 bg-muted rounded ml-auto" />
                      </td>
                    </tr>
                  ))
              ) : paginatedWorkflows.length === 0 ? (
                // Empty State
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <p className="text-base font-semibold">
                      No workflows found
                    </p>
                    <p className="text-xs mt-1">
                      Try adjusting your filters or create a new workflow.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedWorkflows.map((w) => {
                  const { IconComponent, bgClass } = getWorkflowIconDetails(
                    w.name,
                    w._id,
                  );
                  const isWorkflowActive = w.status === "active";

                  return (
                    <tr
                      key={w._id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors group/row"
                    >
                      <td className="py-4 px-4 text-center">
                        <Checkbox
                          className="rounded"
                          checked={selectedIds.includes(w._id)}
                          onCheckedChange={() => handleToggleSelect(w._id)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-sm flex items-center justify-center shrink-0 ${bgClass}`}
                          >
                            <IconComponent className="h-4 w-4 text-neutral-700!" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() =>
                                  router.push(`/home/agent?workflowId=${w._id}`)
                                }
                                className="capitalize text-foreground text-sm hover:underline cursor-pointer"
                              >
                                {w.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isWorkflowActive
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                    : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50"
                                }`}
                              >
                                {isWorkflowActive ? "Active" : "Draft"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center bg-neutral-100 text-black text-xs font-medium px-2 py-1 rounded border min-w-[28px]">
                          {w.structure?.nodes?.length || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              w.lastRun
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          />
                          <span>
                            {w.lastRun
                              ? formatDistanceToNow(new Date(w.lastRun), {
                                  addSuffix: true,
                                }).replace("about ", "")
                              : "Never"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-muted-foreground">
                        {formatScheduled(w.name, w.scheduled)}
                      </td>
                      <td className="py-4 px-4 text-xs text-muted-foreground font-medium">
                        {format(new Date(w.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-4 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          {/* Toggle switch directly in actions column instead of 3-dots */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground group-hover/row:text-foreground transition-colors">
                              {isWorkflowActive ? "Active" : "Draft"}
                            </span>
                            <Switch
                              size="default"
                              checked={isWorkflowActive}
                              onCheckedChange={() =>
                                handleToggleStatus(w._id, w.status || "draft")
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(w._id, w.name)}
                              className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination at the bottom ───────────────────────── */}
      {filteredWorkflows.length > 0 && (
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">{startIndex}</span>{" "}
            to <span className="font-semibold text-foreground">{endIndex}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {filteredWorkflows.length}
            </span>{" "}
            workflows
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 rounded-md font-semibold ${
                    currentPage === pageNum
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Workflow Deletions */}
      <Dialog
        open={confirmDelete.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmDelete((prev) => ({ ...prev, isOpen: false }))
        }
      >
        <DialogContent className="sm:max-w-md rounded-xl p-6 shadow-lg border bg-white dark:bg-neutral-900">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              {confirmDelete.type === "single"
                ? "Delete Workflow"
                : "Delete Selected Workflows"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {confirmDelete.type === "single"
                ? `Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedIds.length} selected workflow(s)? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirmDelete({ isOpen: false, type: "single" })
              }
              className="text-xs h-9 px-4 rounded-lg cursor-pointer border border-neutral-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={executeDelete}
              className="text-xs h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
