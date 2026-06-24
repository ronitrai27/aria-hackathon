"use client";

import * as React from "react";
import { Background, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepPopover } from "@/modules/workflows/components/StepPopover";

export default function FlowPreview() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="w-full h-full relative flex flex-col items-center pt-8">
      {/* Dotted Canvas Background */}
      <div className="absolute inset-0 z-0">
        <ReactFlow
          nodes={[]}
          edges={[]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1.5} color="var(--border)" />
        </ReactFlow>
      </div>

      {/* Trigger Button positioned at the top */}
      <div className="relative z-10">
        <StepPopover
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          trigger={
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-10 w-10 rounded-md bg-linear-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 text-white shadow-md hover:scale-105 transition-all cursor-pointer outline-hidden"
              title="Add step"
            >
              <Plus className="h-5 w-5" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
