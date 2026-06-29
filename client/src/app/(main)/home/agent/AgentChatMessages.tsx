import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";
import ChatMessageItem, {
  StatusStepper,
  TraceLogsViewer,
} from "../../../../modules/Ai/components/ChatMessage";

const priorityBars: Record<string, React.ReactNode> = {
  low: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-yellow-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  medium: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-green-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-neutral-400 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
  high: (
    <div className="flex items-end gap-px h-3 mb-0.5">
      <div className="w-[4px] h-5 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-4 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-3 bg-red-500 rounded-[1px]" />
      <div className="w-[4px] h-[8px] bg-neutral-400 rounded-[1px]" />
    </div>
  ),
};

interface AgentChatMessagesProps {
  messages: any[];
  isGenerating: boolean;
  isStreamingResponse?: boolean;
  activeSteps: any[];
  activeTraceLogs: string[];
  pendingTasks?: any[] | null;
  pendingTasksStatus?: "pending" | "approved" | "rejected" | null;
  onApprove?: (approved: boolean) => void;
  isBrainMode?: boolean;
}

// Helper to parse raw trace logs into structured sub-agents and tool calls
function parseBrainLogs(traceLogs: string[]) {
  const steps: {
    id: string;
    label: string;
    status: "pending" | "running" | "completed" | "failed";
    details?: string;
    substeps?: {
      label: string;
      status: "pending" | "running" | "completed" | "failed";
    }[];
  }[] = [];

  const getStep = (id: string, defaultLabel: string) => {
    let step = steps.find((s) => s.id === id);
    if (!step) {
      step = { id, label: defaultLabel, status: "pending" };
      steps.push(step);
    }
    return step;
  };

  // 1. Setup Step
  const setupStep = getStep("setup", "Brain Session");
  setupStep.status = "running";
  setupStep.details = "Initializing...";

  // 2. Supervisor Step
  const supervisor = getStep("supervisor", "Aria Brain Supervisor");
  supervisor.status = "pending";
  supervisor.details = "Waiting for supervisor activation...";

  let hasToolsRun = false;

  for (const log of traceLogs) {
    // Session Setup transitions
    if (log.includes("Initializing graph execution")) {
      setupStep.status = "running";
      setupStep.details = "Session initialized.";
    }
    if (
      log.includes("Starting fresh conversation thread") ||
      log.includes("Appending new human message")
    ) {
      setupStep.status = "completed";
      setupStep.details = "Brain session active.";
      supervisor.status = "running";
      supervisor.details = "Reasoning...";
    }

    // Supervisor transitions
    if (
      log.includes("Running supervisor") ||
      log.includes("Running supervisor_node") ||
      log.includes("supervisor' started execution")
    ) {
      if (hasToolsRun) {
        const finalSupervisor = getStep(
          "supervisor_final",
          "Aria Brain Supervisor (Analyzing Results)",
        );
        finalSupervisor.status = "running";
        finalSupervisor.details = "Reasoning...";
      } else {
        supervisor.status = "running";
        supervisor.details = "Reasoning...";
      }
    }
    if (log.includes("Node 'supervisor' finished execution")) {
      const finalSupervisor = steps.find((s) => s.id === "supervisor_final");
      if (finalSupervisor) {
        finalSupervisor.status = "completed";
        finalSupervisor.details = "Reasoning finished.";
      } else {
        supervisor.status = "completed";
        supervisor.details = "Reasoning finished.";
      }
    }

    // Tool calls (Sub-agent triggers)
    if (
      log.includes("Calling tool [") ||
      log.includes("Running tool node for:")
    ) {
      hasToolsRun = true;
      const toolNames = [
        "fetch_memory",
        "get_browser_activity",
        "get_tasks",
        "create_tasks",
        "fetch_inbox",
      ];
      for (const tName of toolNames) {
        if (log.includes(tName)) {
          const stepId =
            tName === "fetch_memory"
              ? "memory"
              : tName === "get_browser_activity"
                ? "browser"
                : tName === "get_tasks" || tName === "create_tasks"
                  ? "tasks"
                  : "inbox";
          const stepLabel =
            tName === "fetch_memory"
              ? "Memory Sub-Agent"
              : tName === "get_browser_activity"
                ? "Browser History Sub-Agent"
                : tName === "get_tasks" || tName === "create_tasks"
                  ? "Tasks Sub-Agent"
                  : "Inbox Sub-Agent";
          const stepDetails =
            tName === "fetch_memory"
              ? "Searching knowledge store & graph..."
              : tName === "get_browser_activity"
                ? "Analyzing recent browser history..."
                : tName === "get_tasks"
                  ? "Fetching task checklist..."
                  : tName === "create_tasks"
                    ? "Staging new tasks for creation..."
                    : "Querying email, calendar, and Slack...";

          const step = getStep(stepId, stepLabel);
          step.status = "running";
          step.details = stepDetails;
          if (stepId === "inbox" && !step.substeps) {
            step.substeps = [];
          }
        }
      }
    }

    // Tool outputs (Sub-agent success)
    if (
      log.includes("returned:") ||
      log.includes("Node 'tools' finished execution") ||
      log.includes("Convex insertion response:")
    ) {
      const toolNames = [
        "fetch_memory",
        "get_browser_activity",
        "get_tasks",
        "create_tasks",
        "fetch_inbox",
      ];
      for (const tName of toolNames) {
        if (log.includes(tName)) {
          const stepId =
            tName === "fetch_memory"
              ? "memory"
              : tName === "get_browser_activity"
                ? "browser"
                : tName === "get_tasks" || tName === "create_tasks"
                  ? "tasks"
                  : "inbox";
          const stepLabel =
            tName === "fetch_memory"
              ? "Memory Sub-Agent"
              : tName === "get_browser_activity"
                ? "Browser History Sub-Agent"
                : tName === "get_tasks" || tName === "create_tasks"
                  ? "Tasks Sub-Agent"
                  : "Inbox Sub-Agent";

          const step = getStep(stepId, stepLabel);
          step.status = "completed";
          step.details =
            tName === "fetch_memory"
              ? "Memory search completed."
              : tName === "get_browser_activity"
                ? "Browser history retrieved."
                : tName === "get_tasks"
                  ? "Task checklist synchronized."
                  : tName === "create_tasks"
                    ? "Staged tasks created successfully."
                    : "Inbox check completed.";
        }
      }
    }

    // Tool error/failure (Sub-agent error)
    if (log.includes("Error executing") || log.includes("failed:")) {
      const toolNames = [
        "fetch_memory",
        "get_browser_activity",
        "get_tasks",
        "create_tasks",
        "fetch_inbox",
      ];
      for (const tName of toolNames) {
        if (log.includes(tName)) {
          const stepId =
            tName === "fetch_memory"
              ? "memory"
              : tName === "get_browser_activity"
                ? "browser"
                : tName === "get_tasks" || tName === "create_tasks"
                  ? "tasks"
                  : "inbox";
          const step = steps.find((s) => s.id === stepId);
          if (step) {
            step.status = "failed";
            step.details = "Failed to execute sub-agent.";
          }
        }
      }
    }

    // Inbox agent specific steps (nested list)
    if (log.includes("[Inbox Agent]")) {
      const inboxStep = getStep("inbox", "Inbox Sub-Agent");
      inboxStep.status = "running";
      if (!inboxStep.substeps) inboxStep.substeps = [];

      if (log.includes("Invoking COMPOSIO_SEARCH_TOOLS")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Search Gmail & Calendar Tools",
        );
        if (!sub)
          inboxStep.substeps.push({
            label: "Search Gmail & Calendar Tools",
            status: "running",
          });
      } else if (log.includes("Tool COMPOSIO_SEARCH_TOOLS returned")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Search Gmail & Calendar Tools",
        );
        if (sub) sub.status = "completed";
      } else if (log.includes("Invoking COMPOSIO_GET_TOOL_SCHEMAS")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Inspect API Schemas",
        );
        if (!sub)
          inboxStep.substeps.push({
            label: "Inspect API Schemas",
            status: "running",
          });
      } else if (log.includes("Tool COMPOSIO_GET_TOOL_SCHEMAS returned")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Inspect API Schemas",
        );
        if (sub) sub.status = "completed";
      } else if (log.includes("Invoking COMPOSIO_MULTI_EXECUTE_TOOL")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Batch Fetching Data",
        );
        if (!sub)
          inboxStep.substeps.push({
            label: "Batch Fetching Data",
            status: "running",
          });
      } else if (log.includes("Tool COMPOSIO_MULTI_EXECUTE_TOOL returned")) {
        const sub = inboxStep.substeps.find(
          (s) => s.label === "Batch Fetching Data",
        );
        if (sub) sub.status = "completed";
      } else if (
        log.includes("Connection required") ||
        log.includes("Missing connection")
      ) {
        inboxStep.status = "failed";
        inboxStep.details = "Connection required (Gmail/Calendar).";
      }
    }
  }

  // Ensure steps are ordered logically: Setup -> Supervisor -> Sub-Agents
  const ordered: typeof steps = [];
  const setup = steps.find((s) => s.id === "setup");
  if (setup) ordered.push(setup);
  const sv = steps.find((s) => s.id === "supervisor");
  if (sv) ordered.push(sv);

  steps.forEach((s) => {
    if (s.id !== "setup" && s.id !== "supervisor") {
      ordered.push(s);
    }
  });

  return ordered;
}

export default function AgentChatMessages({
  messages,
  isGenerating,
  isStreamingResponse = false,
  activeSteps,
  activeTraceLogs,
  pendingTasks,
  pendingTasksStatus,
  onApprove,
  isBrainMode,
}: AgentChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const steps = parseBrainLogs(activeTraceLogs);
  const uploadStep = activeSteps?.find((s) => s.worker === "upload_worker");
  if (uploadStep) {
    steps.unshift({
      id: "upload_worker",
      label: "Document Processing",
      status: uploadStep.status as any,
      details: uploadStep.message,
    });
  }

  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (
      messages.length > 0 ||
      isGenerating ||
      (pendingTasks &&
        pendingTasks.length > 0 &&
        pendingTasksStatus === "pending")
    ) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [
    messages,
    isGenerating,
    activeSteps,
    activeTraceLogs,
    pendingTasks,
    pendingTasksStatus,
  ]);

  useEffect(() => {
    if (stepsContainerRef.current) {
      stepsContainerRef.current.scrollTop =
        stepsContainerRef.current.scrollHeight;
    }
  }, [steps.length, isOpen]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 w-full max-w-4xl overflow-y-auto py-4 space-y-6 pr-2 select-text scrollbar-none flex flex-col">
      <style>{`
        @keyframes aria-morph-rotate {
          0% {
            transform: rotate(0deg);
            border-radius: 50%;
          }
          35% {
            border-radius: 50%;
          }
          50% {
            transform: rotate(180deg);
            border-radius: 8px;
          }
          85% {
            border-radius: 8px;
          }
          100% {
            transform: rotate(360deg);
            border-radius: 50%;
          }
        }
        .aria-morph-loading {
          animation: aria-morph-rotate 3s infinite ease-in-out;
        }
      `}</style>
      {messages.map((msg, idx) => (
        <ChatMessageItem key={idx} message={msg} />
      ))}

      {/* HITL Task Confirmation Panel */}
      {pendingTasks && pendingTasks.length > 0 && pendingTasksStatus && (
        <div className="flex w-full justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col gap-1 w-full max-w-lg">
            <div className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5 w-full">
              {pendingTasksStatus === "approved" ? (
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h3 className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 tracking-wide uppercase">
                    Tasks Approved & Created
                  </h3>
                </div>
              ) : pendingTasksStatus === "rejected" ? (
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <h3 className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 tracking-wide uppercase">
                    Tasks Creation Rejected
                  </h3>
                </div>
              ) : (
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 tracking-wide uppercase">
                    Tasks Awaiting Creation Approval
                  </h3>
                </div>
              )}

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {pendingTasks.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 shadow-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">
                        {t.title}
                      </span>
                      {t.priority && priorityBars[t.priority.toLowerCase()]}
                    </div>
                    {t.description && (
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {t.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {pendingTasksStatus === "approved" ? (
                <div className="text-center py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md select-none">
                  Approved ✅
                </div>
              ) : pendingTasksStatus === "rejected" ? (
                <div className="text-center py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md select-none">
                  Rejected ❌
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => onApprove?.(true)}
                    className="flex-grow py-1.5 px-3 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors shadow-xs cursor-pointer active:scale-98"
                  >
                    Approve & Insert
                  </button>
                  <button
                    onClick={() => onApprove?.(false)}
                    className="flex-grow py-1.5 px-3 rounded-md text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-950 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-800 transition-colors shadow-xs cursor-pointer active:scale-98"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(() => {
        const hasStagedAssistant =
          messages.length > 0 &&
          messages[messages.length - 1].role === "assistant";
        const isExecuting = activeSteps.some(
          (s: any) => s.status === "running" && s.worker !== "brain_supervisor",
        );

        const showLoader =
          isGenerating && activeSteps.length > 0 && !isStreamingResponse;
        if (showLoader) {
          // Conditional styling for Brain Mode Loader
          if (isBrainMode) {
            const formatTime = (sec: number) => {
              const m = Math.floor(sec / 60);
              const s = sec % 60;
              return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            };

            return (
              <div className="flex gap-3.5 w-full justify-start animate-in fade-in duration-300 mt-4">
                {/* Aria Avatar */}
                <div className="h-8 w-8 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0 aria-morph-loading mt-1">
                  <svg
                    fill="currentColor"
                    viewBox="0 0 36 48"
                    className="w-4 h-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Aria Avatar</title>
                    <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1 w-full max-w-[82%]">
                  <div className="py-2 px-1 text-sm leading-relaxed text-foreground dark:text-neutral-200">
                    {/* Header Line */}
                    <div
                      className="flex items-center justify-between cursor-pointer hover:opacity-90 select-none pb-2"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      <span className="text-[13px] text-muted-foreground dark:text-neutral-300 leading-relaxed font-semibold flex items-center gap-2">
                        Aria is processing your request...
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/50">
                          {formatTime(elapsed)}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Inline sub-agent steps */}
                    {isOpen && (
                      <div
                        ref={stepsContainerRef}
                        className="mt-4 space-y-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 py-1 max-h-60 overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-200"
                      >
                        {steps.map((step) => {
                          const isDone = step.status === "completed";
                          const isRunning = step.status === "running";
                          const isFailed = step.status === "failed";

                          return (
                            <div key={step.id} className="space-y-2">
                              <div className="flex items-start gap-3 text-xs">
                                {isDone ? (
                                  <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                                    <svg
                                      className="h-2.5 w-2.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                ) : isRunning ? (
                                  <div className="h-4 w-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                  </div>
                                ) : isFailed ? (
                                  <div className="h-4 w-4 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 rounded-full bg-zinc-100 dark:bg-zinc-850/80 border border-zinc-250 dark:border-zinc-750 flex items-center justify-center shrink-0 mt-0.5" />
                                )}

                                <div className="flex flex-col">
                                  <span
                                    className={`text-[12px] font-semibold ${isRunning ? "text-indigo-600 dark:text-indigo-400" : isDone ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}
                                  >
                                    {step.label}
                                  </span>
                                  {step.details && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                      {step.details}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Nested Substeps */}
                              {step.substeps && step.substeps.length > 0 && (
                                <div className="pl-7 space-y-2 border-l border-dashed border-zinc-200 dark:border-zinc-800 ml-2 py-0.5">
                                  {step.substeps.map((sub, sIdx) => {
                                    const subDone = sub.status === "completed";
                                    const subRunning = sub.status === "running";
                                    return (
                                      <div
                                        key={sIdx}
                                        className="flex items-center gap-2.5 text-[11px]"
                                      >
                                        {subDone ? (
                                          <svg
                                            className="h-3 w-3 text-emerald-500 shrink-0"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        ) : subRunning ? (
                                          <RefreshCw className="h-3 w-3 animate-spin text-indigo-500 shrink-0" />
                                        ) : (
                                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                                        )}
                                        <span
                                          className={
                                            subRunning
                                              ? "text-indigo-600 dark:text-indigo-400 font-medium"
                                              : "text-zinc-500 dark:text-zinc-400"
                                          }
                                        >
                                          {sub.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Fallback Standard mode Loader (Unchanged)
          return (
            <div className="flex gap-3.5 w-full justify-start mt-4">
              <div className="h-8 w-8 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0 aria-morph-loading mt-1">
                <svg
                  fill="currentColor"
                  viewBox="0 0 36 48"
                  className="w-4 h-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Aria Avatar</title>
                  <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1 w-full max-w-[82%]">
                <div className="rounded-2xl py-2 px-1 text-sm leading-relaxed text-foreground dark:text-neutral-200 rounded-tl-sm">
                  <p className="text-[13px] text-muted-foreground dark:text-neutral-200 leading-relaxed font-medium mb-3">
                    {isExecuting
                      ? "Executing..."
                      : "Processing your request..."}
                  </p>
                  <TraceLogsViewer
                    traceLogs={activeTraceLogs}
                    isGenerating={true}
                  />
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div ref={messagesEndRef} />
    </div>
  );
}
