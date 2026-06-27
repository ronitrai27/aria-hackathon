import { useState, useCallback } from "react";
import { ChatMessage, formatMessageContent } from "@/modules/Ai/components/ChatMessage";
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
  const [threadId] = useState(
    () => `brain_thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const user = useQuery(api.user.getCurrentUser);

  // Core SSE stream consumer
  const consumeStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = "";
    const accumulatedTraceLogs: string[] = [];

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
                      content: last.content + thought
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
                setActiveSteps((prev) => {
                  const list = [...prev];
                  const existingIdx = list.findIndex((s) => s.worker === toolName);
                  const detailsMsg = `Executing tool: ${toolName}...`;
                  if (existingIdx !== -1) {
                    list[existingIdx] = { worker: toolName, status: "running", message: detailsMsg };
                  } else {
                    list.push({ worker: toolName, status: "running", message: detailsMsg });
                  }
                  return list;
                });
              } else if (eventName === "brain_tool_result") {
                const toolName = payload.tool_name || "";
                let contentStr = typeof payload.content === "string" ? payload.content : JSON.stringify(payload.content || "");
                if (contentStr.length > 200) {
                  contentStr = contentStr.substring(0, 200) + "...";
                }
                const log = `✅ Tool [${toolName}] returned: ${contentStr}`;
                accumulatedTraceLogs.push(log);
                setActiveTraceLogs([...accumulatedTraceLogs]);

                // Update active steps as completed
                setActiveSteps((prev) => {
                  return prev.map((s) => {
                    if (s.worker === toolName) {
                      return { ...s, status: "completed", message: `Tool ${toolName} completed.` };
                    }
                    return s;
                  });
                });
              } else if (eventName === "hitl_request") {
                const tasks = payload.tasks || [];
                console.log(`[useBrainChat] HITL Task Creation Interrupted. Tasks awaiting approval:`, tasks);
                setPendingTasks(tasks);
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
                    return [...list, { role: "assistant", content: formatMessageContent(finalTxt) }];
                  });
                }
                
                // Mark supervisor node as completed
                setActiveSteps((prev) => {
                  return prev.map((s) => {
                    if (s.worker === "brain_supervisor") {
                      return { ...s, status: "completed", message: "Aria finished reasoning." };
                    }
                    return s;
                  });
                });
              } else if (eventName === "error") {
                console.error("Brain SSE error payload:", payload.error);
                accumulatedTraceLogs.push(`❌ Error: ${payload.error}`);
                setActiveTraceLogs([...accumulatedTraceLogs]);
              }
            } catch (err) {
              console.error("Error parsing brain stream event JSON:", err, dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error consuming stream:", err);
      accumulatedTraceLogs.push(`❌ Network stream error: ${err.message || err}`);
      setActiveTraceLogs([...accumulatedTraceLogs]);
    }
  };

  // ── Send Message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (textToSend: string) => {
      if (!textToSend.trim()) return;

      // Add user message to state
      setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
      setIsGenerating(true);
      setActiveTraceLogs([]);
      setActiveSteps([
        {
          worker: "brain_supervisor",
          status: "running",
          message: "Aria is reasoning...",
        },
      ]);
      setPendingTasks(null);

      const clerkUserId = user?.id || "";
      const clerkUserName = user?.name || "User";

      console.log(`[useBrainChat] Send message: "${textToSend}", Clerk ID: "${clerkUserId}", Username: "${clerkUserName}"`);

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
            userId: clerkUserId,      // Clerk unique identifier
            user_id: clerkUserId,
            userName: clerkUserName,  // Display name
            user_name: clerkUserName,
          }),
        });

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        await consumeStream(reader);

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
    [user?.id, user?.name, threadId]
  );

  // ── Approve/Reject Tasks ───────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (approved: boolean) => {
      setIsGenerating(true);
      setPendingTasks(null);
      setActiveSteps([
        {
          worker: "brain_supervisor",
          status: "running",
          message: "Processing tasks confirmation...",
        },
      ]);

      const clerkUserId = user?.id || "";
      const clerkUserName = user?.name || "User";

      console.log(`[useBrainChat] Sending approval decision: approved=${approved} for thread_id=${threadId}`);

      try {
        const response = await fetch("/api/chat/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            thread_id: threadId,
            approved: approved,
            userId: clerkUserId,
            user_id: clerkUserId,
            userName: clerkUserName,
            user_name: clerkUserName,
          }),
        });

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        await consumeStream(reader);

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
      }
    },
    [user?.id, user?.name, threadId]
  );

  return {
    messages,
    setMessages,
    isGenerating,
    activeTraceLogs,
    activeSteps,
    pendingTasks,
    sendMessage,
    handleApprove,
  };
}
