import { useState, useCallback } from "react";
import {
  ChatMessage,
  formatMessageContent,
} from "@/modules/Ai/components/ChatMessage";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useBrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTraceLogs, setActiveTraceLogs] = useState<string[]>([]);
  const [activeSteps, setActiveSteps] = useState<
    Array<{ worker: string; status: string; message: string }>
  >([]);
  const [pendingTasks, setPendingTasks] = useState<any[] | null>(null);
  const [pendingTasksStatus, setPendingTasksStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [threadId] = useState(
    () =>
      `brain_thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  );

  const user = useQuery(api.user.getCurrentUser);

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

    // Ensure we start with an assistant message block staged if we receive thoughts
    let hasStagedAssistant = false;

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

                // Append the streamed thoughts to the assistant message in real-time without mutation
                setMessages((prev) => {
                  const list = [...prev];
                  const last = list[list.length - 1];
                  if (last && last.role === "assistant" && hasStagedAssistant) {
                    list[list.length - 1] = {
                      ...last,
                      content: last.content + thought,
                    };
                    return list;
                  } else {
                    hasStagedAssistant = true;
                    return [...list, { role: "assistant", content: thought }];
                  }
                });
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
              } else if (eventName === "supervisor_data") {
                // Done event. Can verify final text output.
                if (payload.status === "done" && payload.final_response) {
                  const finalTxt = payload.final_response;
                  setMessages((prev) => {
                    const list = [...prev];
                    const last = list[list.length - 1];
                    if (last && last.role === "assistant") {
                      last.content = formatMessageContent(finalTxt);
                      return list;
                    }
                    return [
                      ...list,
                      {
                        role: "assistant",
                        content: formatMessageContent(finalTxt),
                      },
                    ];
                  });
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
                console.error("Brain SSE error payload:", payload.error);
                accumulatedTraceLogs.push(`❌ Error: ${payload.error}`);
                setActiveTraceLogs([...accumulatedTraceLogs]);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `An error occurred during execution: ${payload.error || "Unknown error"}`,
                  },
                ]);
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
      console.error("Error consuming stream:", err);
      accumulatedTraceLogs.push(
        `❌ Network stream error: ${err.message || err}`,
      );
      setActiveTraceLogs([...accumulatedTraceLogs]);
    } finally {
      // Finalize the last assistant message with execution time
      const finalTime = Math.round((Date.now() - startTime) / 1000);

      setMessages((prev) => {
        const list = [...prev];
        const last = list[list.length - 1];
        if (last && last.role === "assistant") {
          list[list.length - 1] = {
            ...last,
            executionTime: finalTime,
          };
        } else {
          // Fallback if no assistant message was staged yet
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
    async (textToSend: string) => {
      if (!textToSend.trim()) return;

      const startTime = Date.now();
      const initialSteps = [
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

      console.log(
        `[useBrainChat] Send message: "${textToSend}", Convex ID: "${convexUserId}", Username: "${clerkUserName}"`,
      );

      try {
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
          }),
        });

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        await consumeStream(reader, startTime, initialSteps);
      } catch (error: any) {
        console.error("Brain chat fetch failed:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `An error occurred: ${error.message || error}`,
          },
        ]);
      } finally {
        setIsGenerating(false);
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
    activeTraceLogs,
    activeSteps,
    pendingTasks,
    pendingTasksStatus,
    sendMessage,
    handleApprove,
  };
}
