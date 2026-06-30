"use client";

import { Cable, ExternalLink, LucideGitBranch } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExtensionDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover trigger container
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Button
        variant="outline"
        className="rounded-md bg-neutral-100 cursor-pointer"
        size="icon-sm"
        onClick={() => setIsOpen(!isOpen)}
        title="Edge Extension Status"
      >
        <Cable className="h-4.5 w-4.5" />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 pt-2 z-50 w-[280px] animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <div className="bg-white border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">
                Microsoft Edge Extension
              </span>
              <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Under Review
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-neutral-500">
              Meanwhile, to power your agents, you can download and install the
              extension straight from GitHub.
            </p>

            <a
              href="https://github.com/ronitrai27/aria-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl py-2 px-3 bg-neutral-950 hover:bg-neutral-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <LucideGitBranch className="w-3.5 h-3.5" />
              <span>Get from GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
