"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface StepConfig {
  id: number;
  targetId: string;
  title: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    targetId: "tour-open-preview-btn",
    title: "Open Preview Panel",
    description: "Toggle the Workflow Preview Panel on the right side of the screen to view active nodes, run simulations, and monitor active workflows.",
  },
  {
    id: 2,
    targetId: "tour-connectors-btn",
    title: "Available Connectors",
    description: "Connect external integrations like Gmail, Slack, and Google Calendar to supercharge your AI workflows.",
  },
  {
    id: 3,
    targetId: "tour-chat-agent-toggle",
    title: "AI Agent Toggle",
    description: "Switch between Ask Brain for general assistance and Agent mode to run complex multi-app workflows.",
  },
  {
    id: 4,
    targetId: "tour-help-btn",
    title: "Help & Guides",
    description: "Need help? Click this icon anytime to view platform documentation, guides, or contact support.",
  },
  {
    id: 5,
    targetId: "tour-sidebar-my-tasks",
    title: "My Tasks Page",
    description: "View and manage all automated tasks, to-do lists, and execution logs in one central hub.",
  },
];

const DynamicArrowOverlay = ({ pos }: { pos: any }) => {
  if (!pos || pos.top === -1000 || !pos.targetX) return null;

  let startX = 0;
  let startY = 0;
  let endX = pos.targetX;
  let endY = pos.targetY;

  if (pos.placement === "top") {
    startX = pos.left + pos.arrowX;
    startY = pos.top + pos.boxHeight + 5;
    endY -= pos.targetHeight / 2 + 5;
  } else if (pos.placement === "bottom") {
    startX = pos.left + pos.arrowX;
    startY = pos.top - 5;
    endY += pos.targetHeight / 2 + 5;
  } else if (pos.placement === "left") {
    startX = pos.left + pos.boxWidth + 5;
    startY = pos.top + pos.arrowY;
    endX -= pos.targetWidth / 2 + 5;
  } else if (pos.placement === "right") {
    startX = pos.left - 5;
    startY = pos.top + pos.arrowY;
    endX += pos.targetWidth / 2 + 5;
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const getP = (val: number) => (val / 70) * dist;

  let f1 = 0, s1 = 0, f2 = 0, s2 = 0;
  switch (pos.arrowType) {
    case 1: f1 = getP(25); s1 = getP(-15); f2 = getP(25); s2 = getP(15); break;
    case 2: f1 = getP(25); s1 = getP(15);  f2 = getP(25); s2 = getP(-15); break;
    case 3: f1 = getP(20); s1 = getP(-10); f2 = getP(30); s2 = getP(20); break;
    case 4: f1 = getP(20); s1 = getP(10);  f2 = getP(30); s2 = getP(-20); break;
    case 5: f1 = getP(35); s1 = getP(-20); f2 = getP(15); s2 = getP(20); break;
    default: f1 = getP(25); s1 = getP(-15); f2 = getP(25); s2 = getP(15); break;
  }

  let cp1x = startX, cp1y = startY, cp2x = endX, cp2y = endY;

  if (pos.placement === "top") {
    cp1y += f1; cp1x += s1;
    cp2y -= f2; cp2x += s2;
  } else if (pos.placement === "bottom") {
    cp1y -= f1; cp1x += s1;
    cp2y += f2; cp2x += s2;
  } else if (pos.placement === "left") {
    cp1x += f1; cp1y += s1;
    cp2x -= f2; cp2y += s2;
  } else if (pos.placement === "right") {
    cp1x -= f1; cp1y += s1;
    cp2x += f2; cp2y += s2;
  }

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-[190]"
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="20"
          markerHeight="20"
          refX="7"
          refY="10"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 3 4 L 11 10 L 3 16"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <path
        d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
};

export function NavigationGuide() {
  const currentUser = useQuery(api.user.getCurrentUser);
  const [show, setShow] = useState(false);
  const [tourStep, setTourStep] = useState<number>(0); // 0 = welcome, 1-5 = steps
  const [pos, setPos] = useState<any>({
    top: -1000,
    left: -1000,
    arrowX: 160,
    arrowY: 90,
    placement: "top",
    arrowType: 1,
  });

  const pathname = usePathname();
  const router = useRouter();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const elementsStateRef = useRef<Array<{ el: HTMLElement; pos: string; z: string }>>([]);

  // Check if tour should run
  useEffect(() => {
    if (currentUser === undefined) return;
    // Show tour if onboarding is complete and they haven't seen the tour yet
    if (currentUser?.onbording_dialog === true) {
      const tourSeen = localStorage.getItem("aria_tour_seen");
      if (!tourSeen) {
        setTourStep(0);
        setShow(true);
      }
    }
  }, [currentUser]);

  // Listener to trigger tour manually
  useEffect(() => {
    const handleStartTour = () => {
      localStorage.removeItem("aria_tour_seen");
      setTourStep(0);
      setShow(true);
    };
    window.addEventListener("start-quick-tour", handleStartTour);
    return () => window.removeEventListener("start-quick-tour", handleStartTour);
  }, []);

  // Position and highlight target elements dynamically
  useEffect(() => {
    if (!show || tourStep === 0) {
      // Clean up any high-index elements when tour is closed or on welcome card
      elementsStateRef.current.forEach(({ el, pos: origPos, z: origZ }) => {
        el.style.position = origPos;
        el.style.zIndex = origZ;
        el.removeAttribute("data-tour-active");
      });
      elementsStateRef.current = [];
      return;
    }

    const currentStepConfig = STEPS[tourStep - 1];
    if (!currentStepConfig) return;

    // Check if we need to redirect to the agent page for step 1 or step 3
    if ((tourStep === 1 || tourStep === 3) && pathname !== "/home/agent") {
      router.push("/home/agent");
      // Wait for navigation and DOM update before finding element
      return;
    }

    const el = document.getElementById(currentStepConfig.targetId);
    let animationFrameId = 0;

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Save original styles if not already saved for this element
      if (!elementsStateRef.current.some(item => item.el === el)) {
        const origPos = el.style.position;
        const origZ = el.style.zIndex;
        elementsStateRef.current.push({ el, pos: origPos, z: origZ });
      }

      // Highlight target element
      el.style.position = "relative";
      el.style.zIndex = "201";
      el.setAttribute("data-tour-active", "true");

      const updatePos = () => {
        const rect = el.getBoundingClientRect();
        const boxWidth = tooltipRef.current?.offsetWidth || 320;
        const boxHeight = tooltipRef.current?.offsetHeight || 180;
        const margin = 24;

        // Deciding placement
        let currentPlacement = "bottom";
        if (currentStepConfig.targetId === "tour-sidebar-trigger") {
          currentPlacement = "right";
        } else if (currentStepConfig.targetId === "tour-sidebar-my-tasks") {
          currentPlacement = "right";
        } else if (currentStepConfig.targetId === "tour-chat-agent-toggle") {
          currentPlacement = "top";
        }

        const gap = 70; // gap perfectly fitting the arrow length
        let top = 0;
        let left = 0;

        switch (currentPlacement) {
          case "top":
            top = rect.top - boxHeight - gap;
            left = rect.left + rect.width / 2 - boxWidth / 2;
            break;
          case "right":
            top = rect.top + rect.height / 2 - boxHeight / 2;
            left = rect.right + gap;
            break;
          case "bottom":
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2 - boxWidth / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - boxHeight / 2;
            left = rect.left - boxWidth - gap;
            break;
        }

        // Clamp to screen bounds
        left = Math.round(Math.max(margin, Math.min(window.innerWidth - boxWidth - margin, left)));
        top = Math.round(Math.max(margin, Math.min(window.innerHeight - boxHeight - margin, top)));

        const targetCenterX = Math.round(rect.left + rect.width / 2);
        const targetCenterY = Math.round(rect.top + rect.height / 2);

        let arrowX = 160;
        let arrowY = 90;

        if (currentPlacement === "top" || currentPlacement === "bottom") {
          arrowX = targetCenterX - left;
          arrowX = Math.round(Math.max(40, Math.min(boxWidth - 40, arrowX)));
        } else {
          arrowY = targetCenterY - top;
          arrowY = Math.round(Math.max(40, Math.min(boxHeight - 40, arrowY)));
        }

        setPos({
          top,
          left,
          arrowX,
          arrowY,
          placement: currentPlacement,
          arrowType: ((tourStep - 1) % 5) + 1,
          targetX: targetCenterX,
          targetY: targetCenterY,
          targetWidth: rect.width,
          targetHeight: rect.height,
          boxWidth,
          boxHeight,
        });

        animationFrameId = requestAnimationFrame(updatePos);
      };

      updatePos();
    } else {
      // Fallback centering if element is temporarily missing
      setPos({
        top: window.innerHeight / 2 - 90,
        left: window.innerWidth / 2 - 160,
        arrowX: 160,
        arrowY: 90,
        placement: "bottom",
        arrowType: 1,
        targetX: 0,
        targetY: 0,
      });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [tourStep, show, pathname, router]);

  const handleSkip = () => {
    localStorage.setItem("aria_tour_seen", "true");
    setShow(false);
    setTourStep(0);
  };

  const handleNext = () => {
    if (tourStep < STEPS.length) {
      setTourStep(tourStep + 1);
    } else {
      handleSkip();
    }
  };

  const handleBack = () => {
    if (tourStep > 1) {
      setTourStep(tourStep - 1);
    } else {
      setTourStep(0);
    }
  };

  if (!show) return null;

  // Render step tooltip cards
  if (tourStep > 0) {
    const step = STEPS[tourStep - 1];
    return (
      <div className="fixed inset-0 z-[200] pointer-events-none">
        {/* Backdrop focusing the element */}
        <div
          className="absolute inset-0 bg-black/15 backdrop-blur-[0.5px] pointer-events-auto transition-opacity duration-300"
          onClick={handleSkip}
        />

        {pos.top !== -1000 && (
          <>
            <DynamicArrowOverlay pos={pos} />
            <div
              className="absolute z-[202] pointer-events-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
              style={{ top: pos.top, left: pos.left, width: 320 }}
            >
              <div
                ref={tooltipRef}
                className="bg-white text-zinc-800 border border-zinc-200/80 shadow-2xl rounded-3xl p-5 flex flex-col gap-3 w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center bg-zinc-100 text-zinc-700 border border-zinc-200/80 text-[10px] font-bold w-5 h-5 rounded-full">
                      {tourStep}
                    </span>
                    <h3 className="text-sm font-bold tracking-tight text-zinc-900">
                      {step.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="h-[1px] w-full bg-zinc-100" />

                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  {step.description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-1">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="h-8 px-3 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg font-medium"
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="h-8 px-3 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg font-medium"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="h-8 px-4 text-xs bg-zinc-950 text-white hover:bg-zinc-900 font-semibold rounded-xl shadow-sm"
                    >
                      {tourStep === STEPS.length ? "Done" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Welcome Step (Step 0)
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4 transition-all duration-300 animate-in fade-in">
      <div className="bg-white border border-zinc-200/80 text-zinc-800 rounded-3xl max-w-[420px] w-full shadow-2xl flex flex-col p-6 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 w-fit">
            Aria Guide
          </span>

          <div className="relative overflow-hidden bg-zinc-50 rounded-2xl border border-zinc-150 p-5 min-h-[120px] flex flex-col justify-center">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 leading-snug">
              Welcome to Aria!
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-normal font-medium">
              Let's take a quick 1-minute tour to get you familiarized with the key areas of your platform.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 mt-2 px-1">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              What we'll cover
            </h3>
            <ul className="grid grid-cols-1 gap-2 text-xs text-zinc-600 font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Navigating the sidebar & workspace</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Connecting integrations & apps</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Switching between Brain & Agent modes</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Managing tasks & getting support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-6 pt-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 font-medium"
          >
            Skip Tour
          </Button>
          <Button
            onClick={() => setTourStep(1)}
            className="text-xs bg-zinc-950 hover:bg-zinc-900 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm"
          >
            Start Tour
          </Button>
        </div>
      </div>
    </div>
  );
}
