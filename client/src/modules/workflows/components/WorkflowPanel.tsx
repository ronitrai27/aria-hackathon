"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Check,
  ChevronDown,
  Clock3,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Play,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import FlowPreview from "../../Ai/components/FlowPreview";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface WorkflowPanelProps {
  isRightOpen: boolean;
  setIsRightOpen: (v: boolean) => void;
  activeTab: "editor" | "runs";
  setActiveTab: (v: "editor" | "runs") => void;
  workflowData: { nodes: any[]; edges: any[] } | null;
  setWorkflowData: (v: any) => void;
  isSaving: boolean;
  isWorkflowRunning: boolean;
  setIsWorkflowRunning: (v: boolean) => void;
  setCurrentStepIndex: (v: number | null) => void;
  nodeExecutionStatuses: Record<
    string,
    "pending" | "running" | "success" | "failed"
  >;
  isWorkflowReadyToRun: (nodes: any[]) => boolean;
  startSimulation: (nodes: any[]) => void;
  handleNodesChange: (nodes: any[]) => void;
  onSelectSuggestion: (prompt: string, apps: string[]) => void;
  onEditWorkflow: (text: string) => void;
  // Persisted workflow metadata (lifted from parent)
  savedWorkflowId: string | null;
  setSavedWorkflowId: (v: string | null) => void;
  isStarred: boolean;
  setIsStarred: (v: boolean) => void;
  workflowTitle: string;
  setWorkflowTitle: (v: string) => void;
}

export default function WorkflowPanel({
  isRightOpen,
  setIsRightOpen,
  activeTab,
  setActiveTab,
  workflowData,
  setWorkflowData,
  isSaving,
  isWorkflowRunning,
  setIsWorkflowRunning,
  setCurrentStepIndex,
  nodeExecutionStatuses,
  isWorkflowReadyToRun,
  startSimulation,
  handleNodesChange,
  onSelectSuggestion,
  onEditWorkflow,
  savedWorkflowId,
  setSavedWorkflowId,
  isStarred,
  setIsStarred,
  workflowTitle,
  setWorkflowTitle,
}: WorkflowPanelProps) {
  const toggleStarMutation = useMutation(api.workflows.toggleStar);
  const renameWorkflowMutation = useMutation(api.workflows.renameWorkflow);
  const savedWorkflows = useQuery(api.workflows.getWorkflows);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isWorkflowDropdownOpen, setIsWorkflowDropdownOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [frequency, setFrequency] = useState("once");

  // Close dropdown on outside click
  useEffect(() => {
    if (!isWorkflowDropdownOpen) return;
    function handleClose(e: MouseEvent) {
      const target = e.target as Node;
      const panel = document.getElementById("workflow-dropdown-panel");
      const btn = document.getElementById("workflow-dropdown-btn");
      if (panel && !panel.contains(target) && btn && !btn.contains(target)) {
        setIsWorkflowDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [isWorkflowDropdownOpen]);

  // ── Collapsed strip ────────────────────────────────────────────────────────
  if (!isRightOpen) {
    return (
      <div className="h-full w-full bg-muted/10 flex flex-col items-center py-4 border-l border-border select-none">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsRightOpen(true)}
          className="h-10! w-10 text-black rounded-sm mb-6 cursor-pointer"
          title="Open Preview"
        >
          <PanelRightOpen className="h-5 w-5!" />
        </Button>
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            className="text-xs font-bold tracking-wide text-muted-foreground uppercase writing-vertical rotate-180 select-none cursor-pointer hover:text-muted-foreground transition-colors outline-none"
            onClick={() => setIsRightOpen(true)}
            style={{ writingMode: "vertical-lr" }}
          >
            Workflow Preview Panel
          </button>
        </div>
      </div>
    );
  }

  // ── Open panel ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-background border-l border-border relative select-none">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0 bg-background/95 backdrop-blur-sm z-10">
        {/* Left: title + controls */}
        <div className="flex items-center gap-2 relative">
          <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={async () => {
                    const next = titleDraft.trim() || workflowTitle;
                    setWorkflowTitle(next);
                    setIsEditingTitle(false);
                    if (savedWorkflowId) {
                      try {
                        await renameWorkflowMutation({
                          id: savedWorkflowId as any,
                          name: next,
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="font-semibold text-sm text-foreground bg-transparent border-b border-blue-500 outline-none w-36"
                />
              ) : (
                <span className="font-semibold text-sm text-foreground max-w-[140px] truncate">
                  {workflowTitle}
                </span>
              )}

              {/* Pencil */}
              {!isEditingTitle && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded  hover:text-foreground"
                        onClick={() => {
                          setTitleDraft(workflowTitle);
                          setIsEditingTitle(true);
                        }}
                      >
                        <Pencil className="" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Rename workflow
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Star */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={`h-6 w-6 rounded transition-colors ${
                        isStarred
                          ? " text-yellow-500 hover:bg-yellow-100"
                          : " hover:text-yellow-500"
                      }`}
                      onClick={async () => {
                        const next = !isStarred;
                        setIsStarred(next);
                        if (savedWorkflowId) {
                          try {
                            await toggleStarMutation({
                              id: savedWorkflowId as any,
                            });
                          } catch (e) {
                            setIsStarred(!next);
                            console.error(e);
                          }
                        }
                      }}
                    >
                      <Star
                        className={`h-3.5 w-3.5 transition-colors ${
                          isStarred ? "fill-yellow-400 text-yellow-400" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isStarred ? "Unstar workflow" : "Star workflow"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Chevron dropdown */}
              {!isEditingTitle && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="workflow-dropdown-btn"
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded hover:text-foreground"
                        onClick={() => setIsWorkflowDropdownOpen((o) => !o)}
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            isWorkflowDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Switch workflow
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {isSaving ? (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Syncing...
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Canvas
              </span>
            )}
          </div>

          {/* Saved workflows dropdown */}
          {isWorkflowDropdownOpen && (
            <div
              id="workflow-dropdown-panel"
              className="absolute top-full left-0 mt-2 z-50! w-72 bg-white border border-neutral-200 rounded-md shadow-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                  Saved Workflows
                </span>
                <button
                  type="button"
                  onClick={() => setIsWorkflowDropdownOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {!savedWorkflows || savedWorkflows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[11px] text-neutral-400">
                    No saved workflows yet.
                  </div>
                ) : (
                  savedWorkflows.map((wf) => (
                    <button
                      key={wf._id}
                      type="button"
                      onClick={() => {
                        setWorkflowData({
                          nodes: wf.structure.nodes,
                          edges: wf.structure.edges,
                        });
                        setWorkflowTitle(wf.name);
                        setIsStarred(wf.isStarred);
                        setSavedWorkflowId(wf._id);
                        setIsWorkflowDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 transition-colors text-left group"
                    >
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          wf._id === savedWorkflowId
                            ? "bg-blue-600"
                            : "bg-neutral-100 group-hover:bg-neutral-200"
                        }`}
                      >
                        <FileText
                          className={`h-3.5 w-3.5 ${wf._id === savedWorkflowId ? "text-white" : "text-neutral-500"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-neutral-800 truncate">
                            {wf.name}
                          </span>
                          {wf.isStarred && (
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {
                            wf.structure.nodes.filter(
                              (n: any) => n.type !== "task_trigger",
                            ).length
                          }{" "}
                          steps · {new Date(wf.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {wf._id === savedWorkflowId && (
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
              {/* Always-visible Create New button */}
              <div className="px-2 py-1 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setWorkflowData(null);
                    setWorkflowTitle("Untitled");
                    setIsStarred(false);
                    setSavedWorkflowId(null);
                    setIsWorkflowDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors group"
                >
                  <div className="h-6 w-6 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center shrink-0 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold">
                    Create New Workflow
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: Editor / Runs tabs */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
          {(["editor", "runs"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: Run / Stop + collapse */}
        <div className="flex items-center gap-2">
          {activeTab === "runs" &&
            workflowData &&
            workflowData.nodes.length > 0 &&
            (isWorkflowRunning ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setIsWorkflowRunning(false);
                  setCurrentStepIndex(null);
                }}
                className="h-9 rounded-lg px-4 font-semibold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping mr-2" />
                Stop
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Schedule */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded"
                    >
                      <CalendarClock className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-72 p-4 rounded-sm!" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm">
                          Schedule Workflow
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Run automatically.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Time</Label>

                        <Input type="time" defaultValue="09:00" />
                      </div>

                      <div className="space-y-2">
                        <Label>Repeat</Label>

                        <Select defaultValue="once">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="once">Once</SelectItem>
                            <SelectItem value="daily">Every Day</SelectItem>
                            <SelectItem value="weekly">Every Week</SelectItem>
                            <SelectItem value="monthly">Every Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          Cancel
                        </Button>

                        <Button size="sm">Save</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Run */}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => startSimulation(workflowData.nodes)}
                  disabled={!isWorkflowReadyToRun(workflowData.nodes)}
                  className="h-8 rounded-sm px-2 text-xs bg-blue-600 hover:bg-blue-700 gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Run now
                </Button>
              </div>
            ))}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsRightOpen(false)}
            className="h-9 w-9 rounded-lg bg-muted/30"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative flex flex-col bg-muted/5 min-h-0">
        <div className="w-full h-full flex-1 min-h-0">
          <FlowPreview
            onSelectSuggestion={onSelectSuggestion}
            onEditWorkflow={onEditWorkflow}
            nodes={workflowData?.nodes}
            edges={workflowData?.edges}
            onChangeNodes={handleNodesChange}
            activeTab={activeTab}
            isRunning={activeTab === "runs" && isWorkflowRunning}
            nodeStatuses={activeTab === "runs" ? nodeExecutionStatuses : {}}
          />
        </div>
      </div>
    </div>
  );
}
