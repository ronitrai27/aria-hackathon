import { useState, useCallback } from "react";
import {
  ChatMessage,
  formatMessageContent,
} from "@/modules/Ai/components/ChatMessage";

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

  const sendMessage = useCallback(async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    setIsGenerating(true);
    setActiveSteps([]);

    const accumulatedSteps: Array<{
      worker: string;
      status: string;
      message: string;
    }> = [];

    // 1. Initial status step
    const initialStep = {
      worker: "router",
      status: "running",
      message: "Analyzing query and checking user intent...",
    };
    accumulatedSteps.push(initialStep);
    setActiveSteps([initialStep]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          thread_id: "agent_session_thread",
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

              if (eventName === "worker_status") {
                const worker = payload.worker;
                const status = payload.status;
                let detailsMsg =
                  payload.details?.message || `${worker} is ${status}...`;

                if (worker === "router") {
                  detailsMsg = "Checking User Intent...";
                } else if (worker === "workflow_builder") {
                  detailsMsg = "Designing workflow structure...";
                }

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
                let detailsMsg =
                  payload.details?.message || `${worker} action: ${action}...`;

                if (action === "fetching_composio_schemas") {
                  detailsMsg =
                    "Loading live API parameter schemas from Composio...";
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
  }, []);

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
