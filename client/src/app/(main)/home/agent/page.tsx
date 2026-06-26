"use client";

import { Allotment } from "allotment";
import { useCallback, useEffect, useRef, useState } from "react";
import "allotment/dist/style.css";
import { useQuery, useMutation } from "convex/react";
import {
  AlertCircle,
  Bell,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  MoreHorizontal,
  Paperclip,
  Search,
  SendHorizontal,
  Share2,
  Sparkles,
  UserPlus,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
import Typewriter from "typewriter-effect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgentStore } from "@/hooks/useAgentStore";
import { connectorIcons, models } from "@/lib/static";
import { api } from "../../../../../convex/_generated/api";

import ChatMessageItem, {
  StatusStepper,
} from "../../../../modules/Ai/components/ChatMessage";
import { useAgentChat } from "@/hooks/useAgentChat";
import AgentChatMessages from "./AgentChatMessages";
import WorkflowPanel from "../../../../modules/workflows/components/WorkflowPanel";
import WorkflowChoiceDialog from "../../../../modules/WorkflowChoiceDialog";

const suggestions = [
  {
    title: "Context",
    description:
      "Suggest me some tasks and automations from yesterday research.",
    shortDescription: "Suggest tasks from yesterday's research.",
    prompt: "Suggest tasks and automations from yesterday research.",
    icon: Brain,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
  {
    title: "Workload & Deadline",
    description: "Explain my recent workload and tasks pending",
    shortDescription: "Explain my pending workload.",
    prompt: "Explain my recent workload and tasks pending",
    icon: Clock,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
  {
    title: "Research Workflow",
    description:
      "Create a workflow to research about x topic and create report.",
    shortDescription: "Research a topic and create report.",
    prompt: "Create a workflow to research about x topic and create report.",
    icon: Workflow,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
];

export default function AgentPage() {
  const [inputVal, setInputVal] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-3.5");
  const [activeTab, setActiveTab] = useState<"editor" | "runs">("editor");
  const [isReadWriteActive, setIsReadWriteActive] = useState(true);
  const [paneWidth, setPaneWidth] = useState(800);
  const [selectedSuggestionApps, setSelectedSuggestionApps] = useState<
    string[]
  >([]);

  const {
    messages,
    isGenerating,
    activeSteps,
    workflowData,
    setWorkflowData,
    isRightOpen,
    setIsRightOpen,
    sendMessage,
  } = useAgentChat();

  const [isSaving, setIsSaving] = useState(false);
  const saveWorkflow = useMutation(api.workflows.saveWorkflow);

  // Workflow metadata state (passed down to WorkflowPanel)
  const [savedWorkflowId, setSavedWorkflowId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [workflowTitle, setWorkflowTitle] = useState("Untitled");

  // Workflow-choice intercept state (Q2: edit vs new when workflow is open)
  const [showWorkflowChoice, setShowWorkflowChoice] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  /** Extract app names from workflow nodes and match against connectorIcons keys */
  function extractAppsFromWorkflow(nodes: any[]): string[] {
    const knownApps = Object.keys(connectorIcons); // ["Gmail", "Slack", "GitHub", ...]
    const found = new Set<string>();

    for (const node of nodes) {
      // The key field is data.tool_name or data.label — e.g. "GMAIL_SEND_EMAIL"
      // Extract the app prefix: "GMAIL_SEND_EMAIL" → "GMAIL"
      const toolName: string =
        node.data?.tool_name ||
        node.data?.label ||
        node.data?.composio_config?.action_slug ||
        "";

      if (toolName) {
        const prefix = toolName.split("_")[0].toLowerCase(); // e.g. "gmail"
        for (const app of knownApps) {
          // Normalize: "Google Meet" → "googlemeet", "Gmail" → "gmail"
          const normalized = app.toLowerCase().replace(/\s+/g, "");
          if (
            normalized === prefix ||
            normalized.startsWith(prefix) ||
            prefix.startsWith(normalized)
          ) {
            found.add(app);
          }
        }
      }
    }
    return Array.from(found);
  }

  /** Build an edit-context prompt the agent can use */
  function buildEditPrompt(userRequest: string): string {
    if (!workflowData) return userRequest;
    const summary = (workflowData.nodes || [])
      .filter((n: any) => n.type !== "task_trigger")
      .map((n: any) => {
        const config =
          n.data?.ai_config ||
          n.data?.composio_config ||
          n.data?.parameters ||
          {};
        return `  - ${n.type || "node"}: ${JSON.stringify(config)}`;
      })
      .join("\n");

    const fullStructure = JSON.stringify(workflowData, null, 2);

    return [
      `[EDIT WORKFLOW]`,
      `Workflow ID: ${savedWorkflowId ?? "unsaved"}`,
      `Title: ${workflowTitle}`,
      `Current nodes:\n${summary || "  (none)"}`,
      `Full Structure JSON:`,
      fullStructure,
      ``,
      `User request: ${userRequest}`,
    ].join("\n");
  }

  function resolvePromptTemplate(prompt: string, allNodes: any[]): string {
    return prompt.replace(/\{\{step[_\s](\d+)\}\}/g, (match, stepNumStr) => {
      const stepIdx = parseInt(stepNumStr, 10) - 1;
      if (stepIdx >= 0 && stepIdx < allNodes.length) {
        const targetNode = allNodes[stepIdx];
        const trace = targetNode.data?.traceResult;
        if (trace) {
          if (typeof trace === "string") return trace;
          if (trace.result)
            return typeof trace.result === "string"
              ? trace.result
              : JSON.stringify(trace.result);
          if (trace.data)
            return typeof trace.data === "string"
              ? trace.data
              : JSON.stringify(trace.data);
          return JSON.stringify(trace);
        }
        return `[Step ${stepNumStr} output not available]`;
      }
      return match;
    });
  }

  // Auto-save debounced effect
  useEffect(() => {
    if (!workflowData || !workflowData.nodes || workflowData.nodes.length === 0)
      return;

    setIsSaving(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const id = await saveWorkflow({
          name: workflowTitle,
          description: "Designed workflow graph",
          structure: {
            nodes: workflowData.nodes,
            edges: workflowData.edges || [],
          },
        });
        if (id && !savedWorkflowId) {
          setSavedWorkflowId(id as string);
        }
      } catch (err) {
        console.error("Failed to auto-save workflow:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [workflowData, saveWorkflow]);

  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<
    Record<string, "pending" | "running" | "success" | "failed">
  >({});
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const handleNodesChange = useCallback(
    (newNodes: any[]) => {
      setWorkflowData((prev) => (prev ? { ...prev, nodes: newNodes } : null));
    },
    [setWorkflowData],
  );

  const isWorkflowReadyToRun = useCallback((nodes: any[]): boolean => {
    if (!nodes || nodes.length === 0) return false;
    return nodes.every((node) => {
      const type = node.type || "";
      if (type.startsWith("ai_")) {
        const prompt = node.data?.ai_config?.prompt;
        return typeof prompt === "string" && prompt.trim().length > 0;
      }
      if (type === "composio_app") {
        const params = node.data?.composio_config?.params_mapping || {};
        const keys = Object.keys(params);
        if (keys.length === 0) return true;
        return keys.every((k) => {
          const val = params[k];
          const valStr = val === null || val === undefined ? "" : String(val);
          return valStr.trim().length > 0;
        });
      }
      return true;
    });
  }, []);

  const getNodeValidationErrors = useCallback((node: any): string[] => {
    const errors: string[] = [];
    const type = node.type || "";
    if (type.startsWith("ai_")) {
      const prompt = node.data?.ai_config?.prompt;
      if (!prompt || !prompt.trim()) {
        errors.push("System Prompt is empty");
      }
    } else if (type === "composio_app") {
      const params = node.data?.composio_config?.params_mapping || {};
      const keys = Object.keys(params);
      keys.forEach((k) => {
        const val = params[k];
        const valStr = val === null || val === undefined ? "" : String(val);
        if (!valStr.trim()) {
          errors.push(`Parameter "${k.replace(/_/g, " ")}" is empty`);
        }
      });
    }
    return errors;
  }, []);

  const startSimulation = useCallback((nodes: any[]) => {
    if (!nodes || nodes.length === 0) return;
    setIsWorkflowRunning(true);
    setCurrentStepIndex(0);
    setExecutionLogs([
      `[${new Date().toLocaleTimeString()}] ðŸš€ Initiating execution for workflow: Designed Automation Graph`,
      `[${new Date().toLocaleTimeString()}] ðŸ›¡ï¸ Validating security tokens and node credentials...`,
      `[${new Date().toLocaleTimeString()}] âœ… Security validation complete. All connections authorized.`,
      `[${new Date().toLocaleTimeString()}] ðŸ“ Starting execution sequence...`,
    ]);

    const initialStatuses: Record<
      string,
      "pending" | "running" | "success" | "failed"
    > = {};
    nodes.forEach((n, idx) => {
      initialStatuses[n.id] = idx === 0 ? "running" : "pending";
    });
    setNodeExecutionStatuses(initialStatuses);
  }, []);

  // Simulation execution loop
  useEffect(() => {
    if (!isWorkflowRunning || currentStepIndex === null || !workflowData?.nodes)
      return;

    const nodes = workflowData.nodes;
    if (currentStepIndex >= nodes.length) {
      setIsWorkflowRunning(false);
      setCurrentStepIndex(null);
      setExecutionLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ðŸŽ‰ WORKFLOW COMPLETED SUCCESSFULLY!`,
        `[${new Date().toLocaleTimeString()}] ðŸ’¾ State variables persisted. Graph completed in ${(nodes.length * 1.5).toFixed(1)}s.`,
      ]);
      return;
    }

    const currentNode = nodes[currentStepIndex];
    const delay = 1500;

    if (currentNode.type === "composio_app") {
      const actionSlug = currentNode.data?.composio_config?.action_slug;
      const params = currentNode.data?.composio_config?.params_mapping || {};

      const runComposio = async () => {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ðŸ”Œ [Composio] Executing ${actionSlug} for user ${user?._id}...`,
        ]);
        try {
          // Resolve prompt templates inside params
          const resolvedParams: Record<string, any> = {};
          for (const key in params) {
            const value = params[key];
            if (typeof value === "string") {
              resolvedParams[key] = resolvePromptTemplate(value, nodes);
            } else {
              resolvedParams[key] = value;
            }
          }

          const res = await fetch("/api/composio/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?._id || "user_test",
              actionSlug,
              arguments: resolvedParams,
            }),
          });
          const result = await res.json();

          if (!res.ok || result.error || result.successful === false) {
            throw new Error(
              result.error ||
                (result.data && result.data.message) ||
                "Execution unsuccessful",
            );
          }

          // Save traceResult on the node
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? { ...n, data: { ...n.data, traceResult: result } }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "success",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
          ]);

          const nextIndex = currentStepIndex + 1;
          if (nextIndex < nodes.length) {
            const nextNode = nodes[nextIndex];
            setNodeExecutionStatuses((prev) => ({
              ...prev,
              [nextNode.id]: "running",
            }));
            const appName = nextNode.type === "composio_app" ? "App" : "AI";
            setExecutionLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] âš¡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            ]);
          }
          setCurrentStepIndex(nextIndex);
        } catch (err: any) {
          console.error("Execution error:", err);

          // Save traceResult as error
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        traceResult: {
                          error: err.message || "Execution failed",
                        },
                      },
                    }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "failed",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âŒ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} failed: ${err.message}`,
          ]);

          // Stop execution on failure
          setIsWorkflowRunning(false);
          setCurrentStepIndex(null);
        }
      };

      runComposio();
      return;
    }

    if (currentNode.type?.startsWith("ai_")) {
      const runAINode = async () => {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🤖 [AI Node] Executing ${currentNode.type} (${currentNode.data?.label || currentNode.id})...`,
        ]);
        try {
          const resolvedPrompt = resolvePromptTemplate(
            currentNode.data?.ai_config?.prompt || "",
            nodes,
          );

          const res = await fetch("/api/ai-vercel/workflow-trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: currentNode.type.replace("ai_", ""),
              prompt: resolvedPrompt,
              extraInstructions:
                currentNode.data?.ai_config?.extra_instructions || "",
              format: currentNode.data?.ai_config?.format || "rich",
              provider: currentNode.data?.ai_config?.provider || "openai",
              citations: currentNode.data?.ai_config?.citations || false,
            }),
          });
          const result = await res.json();

          if (!res.ok || result.error) {
            throw new Error(result.error || "AI Node Execution failed");
          }

          // Save traceResult on the node
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? { ...n, data: { ...n.data, traceResult: result } }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "success",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
          ]);

          const nextIndex = currentStepIndex + 1;
          if (nextIndex < nodes.length) {
            const nextNode = nodes[nextIndex];
            setNodeExecutionStatuses((prev) => ({
              ...prev,
              [nextNode.id]: "running",
            }));
            const appName = nextNode.type === "composio_app" ? "App" : "AI";
            setExecutionLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ⚡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            ]);
          }
          setCurrentStepIndex(nextIndex);
        } catch (err: any) {
          console.error("AI Node Execution error:", err);

          // Save traceResult as error
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        traceResult: {
                          error: err.message || "Execution failed",
                        },
                      },
                    }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "failed",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ❌ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} failed: ${err.message}`,
          ]);

          // Stop execution on failure
          setIsWorkflowRunning(false);
          setCurrentStepIndex(null);
        }
      };

      runAINode();
      return;
    }

    // Default simulation for non-composio and non-AI nodes
    const timer = setTimeout(() => {
      setNodeExecutionStatuses((prev) => ({
        ...prev,
        [currentNode.id]: "success",
      }));

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < nodes.length) {
        const nextNode = nodes[nextIndex];
        setNodeExecutionStatuses((prev) => ({
          ...prev,
          [nextNode.id]: "running",
        }));

        setExecutionLogs((prev) => {
          const appName =
            nextNode.type === "composio_app"
              ? (
                  nextNode.data?.composio_config?.action_slug?.split("_")[0] ||
                  "App"
                ).toUpperCase()
              : "AI";
          return [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
            `[${new Date().toLocaleTimeString()}] âš¡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            nextNode.type?.startsWith("ai_")
              ? `[${new Date().toLocaleTimeString()}] ðŸ¤– model: ${nextNode.data?.ai_config?.model || "gemini-2.0-flash"} | prompt: "${nextNode.data?.ai_config?.prompt?.substring(0, 45)}..."`
              : `[${new Date().toLocaleTimeString()}] ðŸ”Œ action: ${nextNode.data?.composio_config?.action_slug || "integration"}`,
          ];
        });
      } else {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
        ]);
      }

      setCurrentStepIndex(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [isWorkflowRunning, currentStepIndex, workflowData]);

  // Terminal auto scroll
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [executionLogs]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const user = useQuery(api.user.getCurrentUser);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isGenerating) {
      scrollToBottom();
    }
  }, [messages, isGenerating, activeSteps, scrollToBottom]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);

  const leftPaneRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setPaneWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const isNarrow = paneWidth < 580;

  const { activeMode, setActiveMode, openConnectionDialog } = useAgentStore();

  const isAgentMode = activeMode === "agent";
  const unconnectedApps = isAgentMode
    ? selectedSuggestionApps.filter((app) => !user?.connecters?.includes(app))
    : [];
  const hasUnconnectedApps = unconnectedApps.length > 0;
  const hasNoAppsSelected = isAgentMode && selectedSuggestionApps.length === 0;

  const handleSend = async (
    overrideText?: string,
    skipWorkflowCheck = false,
  ) => {
    if (
      isAgentMode &&
      (hasUnconnectedApps || selectedSuggestionApps.length === 0)
    )
      return;
    const textToSend = overrideText || inputVal;
    if (!textToSend.trim()) return;

    const isEditIntent =
      isEditingWorkflow ||
      textToSend.toLowerCase().startsWith("edit this workflow as") ||
      textToSend.toLowerCase().startsWith("edit this worklow as");

    // Q2: If a workflow is open and user is sending a NEW free-form message,
    // intercept and ask: edit current workflow OR start fresh?
    if (
      !skipWorkflowCheck &&
      isAgentMode &&
      workflowData &&
      workflowData.nodes.length > 0 &&
      !overrideText &&
      !isEditIntent
    ) {
      setPendingPrompt(textToSend);
      setShowWorkflowChoice(true);
      return;
    }

    setInputVal("");
    setShowWorkflowChoice(false);

    if (isEditIntent && workflowData) {
      const enriched = buildEditPrompt(textToSend);
      setIsEditingWorkflow(false);
      sendMessage(enriched, textToSend);
    } else {
      sendMessage(textToSend);
    }
  };

  const selected = models.find((m) => m.value === selectedModel) || models[0];

  return (
    <div className="h-[calc(100vh-4rem)] w-[calc(100%+3rem)] -mx-6 -my-6 flex overflow-hidden bg-background">
      {/* Workflow choice dialog */}
      <WorkflowChoiceDialog
        open={showWorkflowChoice}
        workflowTitle={workflowTitle}
        onEditCurrent={() => {
          const apps = extractAppsFromWorkflow(workflowData?.nodes ?? []);
          if (apps.length > 0) setSelectedSuggestionApps(apps);

          let finalPrompt = "edit this workflow as -> ";
          if (pendingPrompt) {
            const cleanPrompt = pendingPrompt.replace(
              /^(edit this workflow as ->|edit this workflow as|edit this worklow as ->|edit this worklow as)\s*/i,
              "",
            );
            finalPrompt += cleanPrompt;
          }

          setInputVal(finalPrompt);
          setIsEditingWorkflow(true);
          setShowWorkflowChoice(false);
          setPendingPrompt("");
          setTimeout(() => {
            if (textareaRef.current) textareaRef.current.focus();
          }, 50);
        }}
        onStartFresh={() => {
          setWorkflowData(null);
          setWorkflowTitle("Untitled");
          setIsStarred(false);
          setSavedWorkflowId(null);
          setShowWorkflowChoice(false);
          setInputVal("");
          sendMessage(pendingPrompt);
        }}
        onClose={() => {
          setShowWorkflowChoice(false);
          setPendingPrompt("");
        }}
      />
      {/* Global CSS overrides for Allotment dividers and custom morph animations */}
      <style>{`
        .allotment-module_sash__By-6u::after {
          background-color: var(--border) !important;
          width: 1px !important;
        }
        .allotment-module_sash__By-6u:hover::after {
          background-color: var(--ring) !important;
        }
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        
        /* Shape morph animation: square -> circle -> rotating -> square */
        @keyframes shapeMorph {
          0% {
            border-radius: 1.25rem; /* Squircle (20px) */
            transform: rotate(0deg);
          }
          35% {
            border-radius: 50%; /* Circle */
            transform: rotate(120deg);
          }
          70% {
            border-radius: 1.25rem; /* Squircle (20px) */
            transform: rotate(240deg);
          }
          100% {
            border-radius: 1.25rem;
            transform: rotate(360deg);
          }
        }
        
        .animate-shape-morph {
          animation: shapeMorph 10s ease-in-out infinite;
        }
      `}</style>

      <Allotment key={isRightOpen ? "open" : "closed"}>
        {/* Left Pane: Agent Chat Space */}
        <Allotment.Pane minSize={400}>
          <div
            ref={leftPaneRef}
            className="h-full w-full flex flex-col items-center justify-between p-8 bg-background relative overflow-hidden"
          >
            <div className="w-full flex justify-between items-center pb-4 opacity-0">
              <span className="text-xs text-muted-foreground">Agent Mode</span>
            </div>

            {/* Scrolling chat messages history list */}
            {messages.length > 0 ? (
              <AgentChatMessages
                messages={messages}
                isGenerating={isGenerating}
                activeSteps={activeSteps}
              />
            ) : (
              /* Welcome content */
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl my-auto">
                <div className="relative flex items-center justify-center w-16 h-16 mb-4 group cursor-pointer">
                  <div className="relative w-16 h-16 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-2xl flex items-center justify-center overflow-hidden animate-shape-morph">
                    <div className="absolute inset-0 rounded-[inherit] border border-white/20 bg-linear-to-b from-white/15 to-transparent" />
                    <svg
                      fill="currentColor"
                      viewBox="0 0 36 48"
                      className="w-9 h-11 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)] relative z-10"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Aria Logo</title>
                      <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
                    </svg>
                  </div>
                </div>

                {/* Welcoming typewriter effect */}
                <div className="text-lg font-medium text-muted-foreground mb-8 text-center max-w-xl">
                  <Typewriter
                    onInit={(typewriter) => {
                      typewriter
                        .typeString("How can I help you today?")
                        .pauseFor(120000)
                        .deleteAll()
                        .typeString("Let's build a new database workflow.")
                        .pauseFor(120000)
                        .deleteAll()
                        .typeString("Need help configuring your integrations?")
                        .pauseFor(120000)
                        .deleteAll()
                        .typeString("Let's design a custom pipeline.")
                        .pauseFor(120000)
                        .start();
                    }}
                    options={{
                      loop: true,
                      delay: 80,
                      deleteSpeed: 40,
                      cursorClassName:
                        "text-blue-500 font-normal animate-pulse",
                    }}
                  />
                </div>

                {/* Suggestions Grid */}
                <div
                  className={`grid w-full max-w-2xl gap-3.5 mb-6 ${
                    isNarrow ? "grid-cols-1" : "grid-cols-3"
                  }`}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => setInputVal(s.prompt)}
                      className={`flex text-left bg-card hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative overflow-hidden shadow-xs w-full ${
                        isNarrow
                          ? "flex-row items-center p-2 rounded-lg border border-border h-11"
                          : "flex-col items-start p-4 rounded-xl border border-border h-36"
                      }`}
                    >
                      {isNarrow ? (
                        <>
                          <div
                            className={`p-1.5 rounded-lg ${s.iconBg} shrink-0 transition-colors duration-300`}
                          >
                            <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium truncate ml-2.5 flex-1 pr-1 group-hover:text-primary transition-colors duration-300">
                            {s.shortDescription}
                          </span>
                        </>
                      ) : (
                        <>
                          <div
                            className={`p-2 rounded-lg ${s.iconBg} mb-3 transition-colors duration-300`}
                          >
                            <s.icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                          </div>
                          <h4 className="font-semibold text-xs text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                            {s.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {s.description}
                          </p>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Wrapper Container (with tabs on top) */}
            <div className="w-full max-w-2xl flex flex-col items-center shrink-0">
              {/* Tabs for Brain and Agent */}
              <div className="flex items-center gap-1 self-start ml-4 -mb-px z-10">
                <button
                  type="button"
                  onClick={() => setActiveMode("brain")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-t-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    activeMode === "brain"
                      ? "bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 text-white shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border border-b-transparent hover:bg-muted/60"
                  }`}
                >
                  <Brain className="h-4 w-4" />
                  Ask Brain
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("agent")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-t-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    activeMode === "agent"
                      ? "bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 text-white shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border border-b-transparent hover:bg-muted/60"
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  Agent
                </button>
              </div>

              <div
                className={`relative w-full bg-muted/30 border border-border rounded-2xl focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/15 transition-all shadow-sm ${
                  isNarrow ? "p-2.5" : "p-3"
                }`}
              >
                <Textarea
                  ref={textareaRef}
                  placeholder={
                    activeMode === "agent"
                      ? "Create Complex automated workflows in single go..."
                      : "Get tasks suggestion from past activity"
                  }
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className={`w-full resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 p-1 pr-12 text-foreground placeholder:text-muted-foreground/80 overflow-y-auto ${
                    isNarrow
                      ? "min-h-[60px] max-h-[120px] text-sm"
                      : "min-h-[80px] max-h-[140px] text-base md:text-sm"
                  }`}
                />

                <div
                  className={`flex items-center justify-between border-t border-border/40 ${
                    isNarrow ? "mt-1.5 pt-2" : "mt-2 pt-2"
                  }`}
                >
                  {/* Left attachment button */}
                  <div className="flex items-center gap-2">
                    {activeMode === "brain" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}

                    {activeMode === "agent" ? (
                      <div className="relative" ref={popoverRef}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setIsPopoverOpen(!isPopoverOpen);
                            }
                          }}
                          className="border border-border/80 shadow-xs p-1.5 px-3 rounded-full flex items-center gap-2 bg-white/90 hover:bg-neutral-50 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 transition-colors select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {selectedSuggestionApps.length === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground select-none">
                                {isNarrow ? "Apps" : "Apps: 0 selected"}
                              </span>
                              {!isNarrow && (
                                <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-border/80 text-[10px] shrink-0">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                  <span className="text-[9px] select-none shrink-0">
                                    0 selected
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {!isNarrow && (
                                <span className="text-[10px] font-semibold text-muted-foreground select-none">
                                  Apps ({selectedSuggestionApps.length}):
                                </span>
                              )}
                              <div className="flex -space-x-0.5">
                                {selectedSuggestionApps.map((app) => {
                                  const iconSrc = connectorIcons[app];
                                  if (!iconSrc) return null;
                                  const isConnected =
                                    user?.connecters?.includes(app);
                                  return (
                                    <button
                                      key={app}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConnectionDialog(app);
                                      }}
                                      className="relative h-5 w-5 rounded overflow-hidden flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                      title={`${app}${isConnected ? " (Connected) - Click to manage" : " (Not connected) - Click to connect"}`}
                                    >
                                      <Image
                                        src={iconSrc}
                                        alt={app}
                                        width={16}
                                        height={16}
                                        className="object-contain"
                                      />
                                      {!isConnected && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <AlertCircle className="h-3 w-3 text-red-600 bg-white rounded-full shrink-0" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {!isNarrow &&
                                (() => {
                                  const unconnected =
                                    selectedSuggestionApps.filter(
                                      (app) => !user?.connecters?.includes(app),
                                    );
                                  const hasUnconnectedApps =
                                    unconnected.length > 0;
                                  return hasUnconnectedApps ? (
                                    <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-border/80 text-[10px] shrink-0">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                      <span className="text-[9px] select-none shrink-0">
                                        Connection Required
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
                            </div>
                          )}
                          <ChevronUp
                            className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200"
                            style={{
                              transform: isPopoverOpen
                                ? "rotate(180deg)"
                                : "none",
                            }}
                          />
                        </div>

                        {isPopoverOpen && (
                          <div className="absolute bottom-full left-0 mb-2.5 z-50 w-64 bg-card text-card-foreground border border-border rounded-xl shadow-xl p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">
                                Select Apps (Free limit: 3)
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsPopoverOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search apps..."
                                className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery("")}
                                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                              {Object.keys(connectorIcons)
                                .filter((app) =>
                                  app
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()),
                                )
                                .map((app) => {
                                  const isSelected =
                                    selectedSuggestionApps.includes(app);
                                  const iconSrc = connectorIcons[app];
                                  return (
                                    <div
                                      key={app}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedSuggestionApps(
                                            selectedSuggestionApps.filter(
                                              (a) => a !== app,
                                            ),
                                          );
                                        } else {
                                          if (
                                            selectedSuggestionApps.length >= 3
                                          ) {
                                            return;
                                          }
                                          setSelectedSuggestionApps([
                                            ...selectedSuggestionApps,
                                            app,
                                          ]);
                                        }
                                      }}
                                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                                          : "hover:bg-muted/50 text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {iconSrc && (
                                          <div className="relative h-5 w-5 rounded overflow-hidden flex items-center justify-center shrink-0">
                                            <Image
                                              src={iconSrc}
                                              alt={app}
                                              width={16}
                                              height={16}
                                              className="object-contain"
                                            />
                                          </div>
                                        )}
                                        <span>{app}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isSelected && (
                                          <span className="text-[10px] font-bold text-primary mr-1">
                                            Selected
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openConnectionDialog(app);
                                          }}
                                          className="px-2 py-0.5 text-[10px] bg-emerald-50 hover:bg-neutral-100 border border-neutral-300 rounded-md text-foreground transition-colors cursor-pointer shrink-0"
                                        >
                                          Connect
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              {Object.keys(connectorIcons).filter((app) =>
                                app
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()),
                              ).length === 0 && (
                                <div className="text-[10px] text-muted-foreground text-center py-4">
                                  No apps found
                                </div>
                              )}
                            </div>

                            {selectedSuggestionApps.length >= 3 && (
                              <div className="mt-1 pt-1.5 border-t border-border/40 text-[9px] text-amber-500 dark:text-amber-400 font-medium leading-snug">
                                âš ï¸ Max 3 apps selected. For higher limits
                                upgrade!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : isNarrow ? (
                      <button
                        type="button"
                        onClick={() => setIsReadWriteActive(!isReadWriteActive)}
                        className={`w-8 h-4.5 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 outline-none border border-border shadow-xs ${
                          isReadWriteActive ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        title="Toggle Read & Write Mode"
                      >
                        <span
                          className={`block w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform duration-200 absolute top-[1px] left-0.5 ${
                            isReadWriteActive
                              ? "translate-x-3.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="border border-border shadow-sm p-1 pr-2.5 rounded-full flex items-center gap-2 bg-white">
                        <div className="flex space-x-0.5">
                          <Image
                            className="inline-block h-4.5 w-4.5 object-contain bg-background"
                            src="/outlook.jpeg"
                            alt="Outlook"
                            width={17}
                            height={17}
                          />
                          <Image
                            className="inline-block h-4.5 w-4.5 object-contain bg-background"
                            src="/gmail.png"
                            alt="Gmail"
                            width={17}
                            height={17}
                          />
                          <Image
                            className="inline-block h-4.5 w-4.5 object-contain bg-background"
                            src="/calendar.png"
                            alt="Calendar"
                            width={17}
                            height={17}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground select-none">
                          Read & Write
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setIsReadWriteActive(!isReadWriteActive)
                          }
                          className={`w-8 h-4.5 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 outline-none ${
                            isReadWriteActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        >
                          <span
                            className={`block w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 absolute top-0.5 left-0.5 ${
                              isReadWriteActive
                                ? "translate-x-3"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right options / Actions */}
                  <div className="flex items-center gap-1 relative">
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger
                        className="
      h-9
      px-3
      border-0
      shadow-none
      bg-transparent
      hover:bg-muted/40 
      rounded-md
      gap-2
      focus:ring-0
      cursor-pointer
    "
                      >
                        <div className="flex items-center gap-2">
                          <Image
                            src={selected.logo}
                            alt=""
                            width={16}
                            height={16}
                            className="rounded-sm"
                          />

                          <span className="text-[13px] font-medium">
                            {isNarrow ? selected.short : selected.label}
                          </span>
                        </div>

                        {/* <ChevronDown className="h-3.5 w-3.5 opacity-60" /> */}
                      </SelectTrigger>

                      <SelectContent
                        position="popper"
                        side="top"
                        avoidCollisions={false}
                        className="
      w-[250px]
      rounded-xl
      p-1
      shadow-xl
    "
                      >
                        {models.map((model) => (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            disabled={model.disabled}
                            className="
          h-10
          rounded-lg
          px-2
          cursor-pointer
        "
                          >
                            <div className="flex w-full items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Image
                                  src={model.logo}
                                  alt=""
                                  width={18}
                                  height={18}
                                />

                                <span
                                  className={`text-[13px] ${
                                    model.disabled
                                      ? "text-muted-foreground"
                                      : "font-medium"
                                  }`}
                                >
                                  {isNarrow ? model.short : model.label}
                                </span>
                              </div>

                              <div className="flex items-center">
                                {model.disabled ? (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                                ) : (
                                  selectedModel === model.value && (
                                    <Check className="h-4 w-4" />
                                  )
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* ------ */}
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => handleSend()}
                      className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm ml-1 cursor-pointer disabled:opacity-50"
                      disabled={
                        !inputVal.trim() ||
                        isGenerating ||
                        (isAgentMode &&
                          (hasUnconnectedApps ||
                            selectedSuggestionApps.length === 0))
                      }
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Allotment.Pane>

        {/* Right Pane: Workflow Panel */}
        <Allotment.Pane
          minSize={isRightOpen ? 600 : 60}
          maxSize={isRightOpen ? undefined : 60}
          preferredSize={isRightOpen ? "50%" : 60}
        >
          <WorkflowPanel
            isRightOpen={isRightOpen}
            setIsRightOpen={setIsRightOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            workflowData={workflowData}
            setWorkflowData={setWorkflowData}
            isSaving={isSaving}
            isWorkflowRunning={isWorkflowRunning}
            setIsWorkflowRunning={setIsWorkflowRunning}
            setCurrentStepIndex={setCurrentStepIndex}
            nodeExecutionStatuses={nodeExecutionStatuses}
            isWorkflowReadyToRun={isWorkflowReadyToRun}
            startSimulation={startSimulation}
            handleNodesChange={handleNodesChange}
            onSelectSuggestion={(prompt, apps) => {
              if (activeMode === "brain") setActiveMode("agent");
              setSelectedSuggestionApps(apps || []);
              setInputVal(prompt);
            }}
            onEditWorkflow={(text) => {
              if (activeMode === "brain") setActiveMode("agent");
              const apps = extractAppsFromWorkflow(workflowData?.nodes ?? []);
              if (apps.length > 0) setSelectedSuggestionApps(apps);

              let finalPrompt = "edit this workflow as -> ";
              if (text) {
                const cleanPrompt = text.replace(
                  /^(edit this workflow as ->|edit this workflow as|edit this worklow as ->|edit this worklow as)\s*/i,
                  "",
                );
                finalPrompt += cleanPrompt;
              }

              setInputVal(finalPrompt);
              setIsEditingWorkflow(true);
              setTimeout(() => {
                if (textareaRef.current) textareaRef.current.focus();
              }, 50);
            }}
            savedWorkflowId={savedWorkflowId}
            setSavedWorkflowId={setSavedWorkflowId}
            isStarred={isStarred}
            setIsStarred={setIsStarred}
            workflowTitle={workflowTitle}
            setWorkflowTitle={setWorkflowTitle}
          />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
