import { useState, useCallback, useEffect } from "react";
import {
  ChatMessage,
  formatMessageContent,
} from "@/modules/Ai/components/ChatMessage";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

export function useBrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [activeTraceLogs, setActiveTraceLogs] = useState<string[]>([]);
  const [activeSteps, setActiveSteps] = useState<
    Array<{ worker: string; status: string; message: string }>
  >([]);
  const [pendingTasks, setPendingTasks] = useState<any[] | null>(null);
  const [pendingTasksStatus, setPendingTasksStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  
  const searchParams = useSearchParams();
  const [threadId, setThreadId] = useState(
    () => searchParams?.get("threadId") || `brain_thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  );

  const router = useRouter();

  // Sync threadId from URL to state, and clear messages when switching
  useEffect(() => {
    const urlThreadId = searchParams?.get("threadId");
    if (urlThreadId && urlThreadId !== threadId) {
      setThreadId(urlThreadId);
      setMessages([]);
      setActiveSteps([]);
      setActiveTraceLogs([]);
    }
  }, [searchParams, threadId]);

  // Redirect if URL has no threadId (e.g. direct landing on /home/agent)
  useEffect(() => {
    const urlThreadId = searchParams?.get("threadId");
    if (!urlThreadId) {
      router.replace(`/home/agent?threadId=${threadId}`);
    }
  }, [searchParams, threadId, router]);

  const user = useQuery(api.user.getCurrentUser);
  const existingSession = useQuery(api.brain.getSession, { threadId });
  const saveSession = useMutation(api.brain.saveSession);

  const isLoadingSession = existingSession === undefined;

  // Hydrate messages on load
  useEffect(() => {
    if (existingSession && messages.length === 0 && existingSession.messages.length > 0) {
      setMessages(existingSession.messages);
    }
  }, [existingSession, messages.length]);

  // Sync conversation to database when generation finishes
  useEffect(() => {
    if (messages.length > 0 && user?._id && !isGenerating) {
      saveSession({
        userId: user._id,
        threadId: threadId,
        messages: messages,
      }).catch((err) => console.error("Failed to save session:", err));
    }
  }, [messages, user?._id, threadId, saveSession, isGenerating]);

  // Core SSE stream consumer
  const consumeStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    startTime: number,
    initialSteps: Array<{ worker: string; status: string; message: string }>,
  ) => {
    const decoder = new TextDecoder();
    let buffer = "";
    const accumulatedTraceLogs: string[] = [];
    const accumulatedSteps = [...initialSteps];

    // Helper to safely update or append the current turn's assistant message
    const updateOrAddAssistantMessage = (content: string, overwrite = false) => {
      setMessages((prev) => {
        const list = [...prev];
        
        // Find the index of the last user message
        let lastUserIdx = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].role === "user") {
            lastUserIdx = i;
            break;
          }
        }

        // Find the assistant message belonging to the current turn (after the last user message)
        let assistantIdx = -1;
        if (lastUserIdx !== -1) {
          for (let i = list.length - 1; i > lastUserIdx; i--) {
            if (list[i].role === "assistant" && !(list[i] as any).isSystemNotification) {
              assistantIdx = i;
              break;
            }
          }
        }

        if (assistantIdx !== -1) {
          list[assistantIdx] = {
            ...list[assistantIdx],
            content: overwrite ? content : (list[assistantIdx].content + content),
          };
        } else {
          list.push({
            role: "assistant",
            content: content,
          });
        }
        return list;
      });
    };

    let hasHitlRequest = false;
    let hasError = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName = "";
          let dataStr = "";

          const lines = part.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.substring(5).trim();
            }
          }

          if (dataStr) {
            try {
              const payload = JSON.parse(dataStr);
              console.log(`[useBrainChat] Event: "${eventName}"`, payload);

              if (eventName === "trace_log") {
                const message = payload.message || "";
                accumulatedTraceLogs.push(message);
                setActiveTraceLogs([...accumulatedTraceLogs]);
              } else if (eventName === "brain_thought") {
                const thought = payload.message || "";
                if (thought) {
                  setIsStreamingResponse(true);
                  updateOrAddAssistantMessage(thought, false);
                }
              } else if (eventName === "brain_tool_call") {
                const toolName = payload.tool_name || "";
                const argsStr = JSON.stringify(payload.args || {});
                const log = `🔧 Calling tool [${toolName}] with args: ${argsStr}`;
                accumulatedTraceLogs.push(log);
                setActiveTraceLogs([...accumulatedTraceLogs]);

                // Update active steps
                const existingIdx = accumulatedSteps.findIndex(
                  (s) => s.worker === toolName,
                );
                const detailsMsg = `Executing tool: ${toolName}...`;
                if (existingIdx !== -1) {
                  accumulatedSteps[existingIdx] = {
                    worker: toolName,
                    status: "running",
                    message: detailsMsg,
                  };
                } else {
                  accumulatedSteps.push({
                    worker: toolName,
                    status: "running",
                    message: detailsMsg,
                  });
                }
                setActiveSteps([...accumulatedSteps]);
              } else if (eventName === "brain_tool_result") {
                const toolName = payload.tool_name || "";
                let contentStr =
                  typeof payload.content === "string"
                    ? payload.content
                    : JSON.stringify(payload.content || "");
                if (contentStr.length > 200) {
                  contentStr = contentStr.substring(0, 200) + "...";
                }
                const log = `✅ Tool [${toolName}] returned: ${contentStr}`;
                accumulatedTraceLogs.push(log);
                setActiveTraceLogs([...accumulatedTraceLogs]);

                // Update active steps as completed
                for (let i = 0; i < accumulatedSteps.length; i++) {
                  if (accumulatedSteps[i].worker === toolName) {
                    accumulatedSteps[i].status = "completed";
                    accumulatedSteps[i].message = `Tool ${toolName} completed.`;
                  }
                }
                setActiveSteps([...accumulatedSteps]);
              } else if (eventName === "inbox_agent_event") {
                const status = payload.status || "";
                const message = payload.message || "";

                // Add to trace log
                const logPrefix =
                  status === "connection_error"
                    ? "❌"
                    : status === "tool_call"
                      ? "🔍"
                      : status === "tool_result"
                        ? "📥"
                        : "💭";
                const log = `${logPrefix} [Inbox Agent] ${message}`;
                accumulatedTraceLogs.push(log);
                setActiveTraceLogs([...accumulatedTraceLogs]);

                // Update active steps
                const existingIdx = accumulatedSteps.findIndex(
                  (s) => s.worker === "Inbox Agent",
                );
                const stepStatus =
                  status === "connection_error" ? "failed" : "running";

                if (existingIdx !== -1) {
                  accumulatedSteps[existingIdx] = {
                    worker: "Inbox Agent",
                    status: stepStatus,
                    message: message,
                  };
                } else {
                  accumulatedSteps.push({
                    worker: "Inbox Agent",
                    status: stepStatus,
                    message: message,
                  });
                }
                setActiveSteps([...accumulatedSteps]);
              } else if (eventName === "memory_updated") {
                const status = payload.status || "success";
                if (status === "success") {
                  const facts: string[] = payload.facts || [];
                  console.log("[useBrainChat] Memory successfully updated in DB:", facts);
                  
                  const firstFact = facts[0] || "No facts updated";
                  const extraCount = facts.length - 1;
                  const description = extraCount > 0 ? `• ${firstFact} (+${extraCount} more)` : `• ${firstFact}`;

                  toast.success("🧠 Brain Memory Updated", {
                    id: "brain-memory-update",
                    position: "top-center",
                    description: description,
                    duration: 4000,
                  });

                  accumulatedTraceLogs.push(
                    `🧠 [Memory Updated] Saved: ${facts.join(", ")}`
                  );
                  setActiveTraceLogs([...accumulatedTraceLogs]);
                } else {
                  console.error("[useBrainChat] Memory update FAILED:", payload.error);
                  toast.error("Memory update failed", {
                    description: payload.error || "Unknown database error",
                  });
                }
              } else if (eventName === "hitl_request") {
                const tasks = payload.tasks || [];
                console.log(
                  `[useBrainChat] HITL Task Creation Interrupted. Tasks awaiting approval:`,
                  tasks,
                );
                setPendingTasks(tasks);
                setPendingTasksStatus("pending");
                // Turn off generation loader during HITL wait
                setIsGenerating(false);
                hasHitlRequest = true;
              } else if (eventName === "supervisor_data") {
                setIsStreamingResponse(true);
                // Done event. Can verify final text output.
                if (payload.status === "done" && payload.final_response) {
                  const finalTxt = payload.final_response;
                  updateOrAddAssistantMessage(formatMessageContent(finalTxt), true);
                }

                // Mark supervisor node as completed
                for (let i = 0; i < accumulatedSteps.length; i++) {
                  if (accumulatedSteps[i].worker === "brain_supervisor") {
                    accumulatedSteps[i].status = "completed";
                    accumulatedSteps[i].message = "Aria finished reasoning.";
                  }
                }
                setActiveSteps([...accumulatedSteps]);
              } else if (eventName === "error") {
                hasError = true;
                console.error("Brain SSE error payload:", payload.error);
                accumulatedTraceLogs.push(`❌ Error: ${payload.error}`);
                setActiveTraceLogs([...accumulatedTraceLogs]);
                updateOrAddAssistantMessage(`An error occurred during execution: ${payload.error || "Unknown error"}`, true);
              }
            } catch (err) {
              console.error(
                "Error parsing brain stream event JSON:",
                err,
                dataStr,
              );
            }
          }
        }
      }
    } catch (err: any) {
      hasError = true;
      console.error("Error consuming stream:", err);
      accumulatedTraceLogs.push(
        `❌ Network stream error: ${err.message || err}`,
      );
      setActiveTraceLogs([...accumulatedTraceLogs]);
      updateOrAddAssistantMessage(`An error occurred during execution: ${err.message || err}`, true);
    } finally {
      // Finalize the last assistant message with execution time
      const finalTime = Math.round((Date.now() - startTime) / 1000);

      setMessages((prev) => {
        const list = [...prev];
        
        let lastUserIdx = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].role === "user") {
            lastUserIdx = i;
            break;
          }
        }

        let assistantIdx = -1;
        if (lastUserIdx !== -1) {
          for (let i = list.length - 1; i > lastUserIdx; i--) {
            if (list[i].role === "assistant" && !(list[i] as any).isSystemNotification) {
              assistantIdx = i;
              break;
            }
          }
        }

        if (assistantIdx !== -1) {
          list[assistantIdx] = {
            ...list[assistantIdx],
            executionTime: finalTime,
          };
        } else if (!hasHitlRequest && !hasError) {
          // Fallback if no assistant message was staged yet and it's not a resume/interrupt/error
          list.push({
            role: "assistant",
            content: "Execution completed.",
            executionTime: finalTime,
          });
        }
        return list;
      });
    }
  };

  // ── Send Message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (textToSend: string, file: File | null = null) => {
      if (!textToSend.trim()) return;

      const startTime = Date.now();
      const initialSteps: Array<{ worker: string; status: string; message: string }> = file
        ? [
            {
              worker: "upload_worker",
              status: "running",
              message: "Extracting from file...",
            },
            {
              worker: "brain_supervisor",
              status: "pending",
              message: "Aria is reasoning...",
            },
          ]
        : [
            {
              worker: "brain_supervisor",
              status: "running",
              message: "Aria is reasoning...",
            },
          ];

      // Add user message to state
      setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
      setIsGenerating(true);
      setActiveTraceLogs([]);
      setActiveSteps(initialSteps);
      setPendingTasks(null);
      setPendingTasksStatus(null);

      const convexUserId = user?._id || "";
      const clerkUserName = user?.name || "User";

      let attachment = undefined;
      let updatedSteps: Array<{ worker: string; status: string; message: string }> = [...initialSteps];

      try {
        if (file) {
          // 1. Send file for extraction
          const formData = new FormData();
          formData.append("file", file);

          const extractRes = await fetch("/api/extract", {
            method: "POST",
            body: formData,
          });

          if (!extractRes.ok) {
            const errText = await extractRes.text();
            let parsedError = "";
            try {
              parsedError = JSON.parse(errText).error;
            } catch {
              parsedError = errText;
            }
            throw new Error(parsedError || `Failed to extract file: HTTP ${extractRes.status}`);
          }

          const extractData = await extractRes.json();
          attachment = {
            filename: file.name,
            content: extractData.text,
          };

          // Mark upload completed and supervisor running
          updatedSteps = [
            {
              worker: "upload_worker",
              status: "completed",
              message: `Extracted text from ${file.name}`,
            },
            {
              worker: "brain_supervisor",
              status: "running",
              message: "Aria is reasoning...",
            },
          ];
          setActiveSteps(updatedSteps);
        }

        // 2. Standard chat request
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: textToSend,
            thread_id: threadId,
            mode: "brain",
            userId: convexUserId,
            user_id: convexUserId,
            userName: clerkUserName,
            user_name: clerkUserName,
            attachment,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedError = "";
          try {
            parsedError = JSON.parse(errText).error;
          } catch {
            parsedError = errText;
          }
          throw new Error(parsedError || `HTTP error ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        await consumeStream(reader, startTime, updatedSteps);
      } catch (error: any) {
        console.error("Brain chat fetch failed:", error);

        // If file extraction failed, update steps to show it failed
        if (file && !attachment) {
          setActiveSteps([
            {
              worker: "upload_worker",
              status: "failed",
              message: `Failed to extract: ${error.message || error}`,
            },
            {
              worker: "brain_supervisor",
              status: "failed",
              message: "Aria execution aborted.",
            },
          ]);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `An error occurred: ${error.message || error}`,
          },
        ]);
      } finally {
        setIsGenerating(false);
        setIsStreamingResponse(false);
        setActiveSteps([]);
        setActiveTraceLogs([]);
      }
    },
    [user?._id, user?.name, threadId],
  );

  // ── Approve/Reject Tasks ───────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (approved: boolean) => {
      const startTime = Date.now();
      const initialSteps = [
        {
          worker: "brain_supervisor",
          status: "running",
          message: "Processing tasks confirmation...",
        },
      ];

      setIsGenerating(true);
      setPendingTasksStatus(approved ? "approved" : "rejected");
      setActiveSteps(initialSteps);

      const convexUserId = user?._id || "";
      const clerkUserName = user?.name || "User";

      console.log(
        `[useBrainChat] Sending approval decision: approved=${approved} for thread_id=${threadId}`,
      );

      try {
        const response = await fetch("/api/chat/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            thread_id: threadId,
            approved: approved,
            userId: convexUserId,
            user_id: convexUserId,
            userName: clerkUserName,
            user_name: clerkUserName,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedError = "";
          try {
            parsedError = JSON.parse(errText).error;
          } catch {
            parsedError = errText;
          }
          throw new Error(parsedError || `HTTP error ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        await consumeStream(reader, startTime, initialSteps);
      } catch (error: any) {
        console.error("Failed to send task approval decision:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Failed to confirm tasks: ${error.message || error}`,
          },
        ]);
      } finally {
        setIsGenerating(false);
        setIsStreamingResponse(false);
        setActiveSteps([]);
        setActiveTraceLogs([]);
        setPendingTasks(null);
        setPendingTasksStatus(null);
      }
    },
    [user?._id, user?.name, threadId],
  );

  return {
    messages,
    setMessages,
    isGenerating,
    isStreamingResponse,
    activeTraceLogs,
    activeSteps,
    pendingTasks,
    pendingTasksStatus,
    sendMessage,
    handleApprove,
    isLoadingSession,
  };
}
