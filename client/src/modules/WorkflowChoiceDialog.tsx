"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText } from "lucide-react";

interface WorkflowChoiceDialogProps {
  open: boolean;
  workflowTitle: string;
  onEditCurrent: () => void;
  onStartFresh: () => void;
  onClose: () => void;
}

export default function WorkflowChoiceDialog({
  open,
  workflowTitle,
  onEditCurrent,
  onStartFresh,
  onClose,
}: WorkflowChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="
          sm:max-w-md
          rounded-xl
          border
          p-6
          shadow-md
        "
      >
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>

          {/* Heading */}
          <h2 className="max-w-xs text-lg font-semibold tracking-tight">
            Looks like a saved workspace is already opened
          </h2>

          <p className="mt-3 text-muted-foreground">
            Do you want to overwrite this?
          </p>

          {/* Workflow Card */}

          <div className="mt-8 flex w-full items-center gap-4 rounded-md border bg-muted/30 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>

            <div className="text-left min-w-0">
              <p className="truncate font-medium text-xs">{workflowTitle}</p>

              <p className="text-xs text-muted-foreground">
                Currently opened workflow
              </p>
            </div>
          </div>

          {/* Buttons */}

          <div className="mt-8 grid w-full grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="rounded-md h-10 text-xs"
              onClick={onEditCurrent}
            >
              Edit current Workspace
            </Button>

            <Button className="rounded-md h-10 text-xs" onClick={onStartFresh}>
              Start fresh
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
