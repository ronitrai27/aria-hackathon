import { useState, useCallback } from "react";
import {
  ChatMessage,
  formatMessageContent,
} from "@/modules/Ai/components/ChatMessage";
import { useAgentStore } from "./useAgentStore";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSteps, setActiveSteps] = useState<
    Array<{ worker: string; status: string; message: string }>
  >([]);
  const [workflowData, setWorkflowData] = useState<{
    nodes: any[];
    edges: any[];
  } | null>(null);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const { activeMode } = useAgentStore();
  const [threadId] = useState(
    () => `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  );
  const user = useQuery(api.user.getCurrentUser);

  const sendMessage = useCallback(
    async (textToSend: string, userDisplayMsg?: string) => {
      if (!textToSend.trim()) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: userDisplayMsg || textToSend },
      ]);
      setIsGenerating(true);
      setActiveSteps([]);

      const accumulatedSteps: Array<{
        worker: string;
        status: string;
        message: string;
      }> = [];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: textToSend,
            thread_id: threadId,
            mode: activeMode,
            userId: user?._id,
          }),
        });

        if (!response.body) {
          throw new Error("No response body received.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResponseText = "";

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
                console.log(
                  `[useAgentChat] Received SSE event: "${eventName}"`,
                  payload,
                );

                if (eventName === "worker_status") {
                  const worker = payload.worker;
                  const status = payload.status;
                  const detailsMsg =
                    payload.details?.message || `${worker} is ${status}...`;

                  const existingIdx = accumulatedSteps.findIndex(
                    (s) => s.worker === worker,
                  );
                  if (existingIdx !== -1) {
                    accumulatedSteps[existingIdx] = {
                      worker,
                      status,
                      message: detailsMsg,
                    };
                  } else {
                    accumulatedSteps.push({
                      worker,
                      status,
                      message: detailsMsg,
                    });
                  }
                  setActiveSteps([...accumulatedSteps]);
                } else if (eventName === "worker_action") {
                  const worker = payload.worker;
                  const action = payload.action;

                  // Skip raw agent thought/text — it shows as the final assistant message, not in the stepper
                  if (action === "thought") continue;

                  let detailsMsg =
                    payload.details?.message ||
                    `${worker} action: ${action}...`;

                  if (action === "fetching_composio_schemas") {
                    detailsMsg =
                      "Loading live API parameter schemas from Composio...";
                  } else if (action === "composio_schema_fetched") {
                    const slug = payload.details?.action_slug || "";
                    detailsMsg = `Schema ready for ${slug}`;
                  } else if (action === "tool_validation") {
                    const slug = payload.details?.action_slug || "";
                    const status = payload.details?.status || "";
                    detailsMsg =
                      status === "ready"
                        ? `${slug}: params validated OK`
                        : `${slug}: ${payload.details?.message || "checking params"}...`;
                  } else if (action === "node_configured") {
                    const nodeId = payload.details?.node_id || "";
                    const nodeType = payload.details?.type || "";
                    const model = payload.details?.model || "";
                    detailsMsg = `AI node [${nodeId}] (${nodeType}) configured with ${model}`;
                  } else if (action === "configuring_ai_nodes") {
                    detailsMsg =
                      payload.details?.message || "Configuring AI nodes...";
                  }

                  const stepKey = `${worker}_${action}`;
                  const existingIdx = accumulatedSteps.findIndex(
                    (s) => s.worker === stepKey,
                  );
                  if (existingIdx !== -1) {
                    accumulatedSteps[existingIdx] = {
                      worker: stepKey,
                      status: "running",
                      message: detailsMsg,
                    };
                  } else {
                    accumulatedSteps.push({
                      worker: stepKey,
                      status: "running",
                      message: detailsMsg,
                    });
                  }
                  setActiveSteps([...accumulatedSteps]);
                } else if (eventName === "worker_response") {
                  const worker = payload.worker;

                  // If it is the workflow builder, update the canvas with the nodes and edges
                  if (worker === "workflow_builder" && payload.output?.nodes) {
                    console.log("=========================================");
                    console.log(
                      "Full JSON Architecture:",
                      JSON.stringify(payload.output, null, 2),
                    );
                    console.log("=========================================");
                    setWorkflowData({
                      nodes: payload.output.nodes,
                      edges: payload.output.edges,
                    });
                    setIsRightOpen(true);
                  }

                  // Mark this worker step as completed
                  for (let i = 0; i < accumulatedSteps.length; i++) {
                    if (
                      accumulatedSteps[i].worker === worker ||
                      accumulatedSteps[i].worker.startsWith(`${worker}_`)
                    ) {
                      accumulatedSteps[i].status = "completed";
                    }
                  }
                  setActiveSteps([...accumulatedSteps]);
                } else if (eventName === "supervisor_data") {
                  if (payload.status === "done" && payload.final_response) {
                    finalResponseText = payload.final_response;
                  }
                } else if (eventName === "error") {
                  console.error("Agent error event:", payload.error);
                  accumulatedSteps.push({
                    worker: "error",
                    status: "error",
                    message: `Error: ${payload.error}`,
                  });
                  setActiveSteps([...accumulatedSteps]);
                }
              } catch (err) {
                console.error("Error parsing data payload:", err, dataStr);
              }
            }
          }
        }

        // Complete execution updates
        const finalSteps = accumulatedSteps.map((s) => ({
          ...s,
          status: s.status === "error" ? "error" : "completed",
        }));

        const textResponse =
          finalResponseText ||
          "I have successfully created the workflow. Feel free to modify it or ask me to add anything else!";

        const cleanTextResponse = formatMessageContent(textResponse);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: cleanTextResponse,
            steps: finalSteps,
          },
        ]);
      } catch (error: any) {
        console.error("Failed to stream chat:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `An error occurred: ${error.message || error}`,
            steps: [
              {
                worker: "error",
                status: "error",
                message: "Failed to establish connection.",
              },
            ],
          },
        ]);
      } finally {
        setIsGenerating(false);
        setActiveSteps([]);
      }
    },
    [activeMode, user?._id, threadId],
  );

  return {
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
    activeSteps,
    setActiveSteps,
    workflowData,
    setWorkflowData,
    isRightOpen,
    setIsRightOpen,
    sendMessage,
  };
}
