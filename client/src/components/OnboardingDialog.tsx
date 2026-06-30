"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  Globe,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "../../convex/_generated/api";

const appsToShow = [
  { name: "Gmail", src: "/gmail.png" },
  { name: "Slack", src: "/slack.png" },
  { name: "Notion", src: "/notion.webp" },
  { name: "Discord", src: "/discord.png" },
  { name: "Linear", src: "/linear.jpeg" },
  { name: "Jira", src: "/jira.jpeg" },
  { name: "Google Calendar", src: "/calendar.png" },
  { name: "Google Meet", src: "/meet.png" },
  { name: "Google Sheets", src: "/sheets.png" },
];

export function OnboardingDialog() {
  const { user: clerkUser } = useUser();
  const currentUser = useQuery(api.user.getCurrentUser);
  const completeOnboardingMutation = useMutation(api.user.completeOnboarding);

  const [step, setStep] = useState(1);
  const [occupation, setOccupation] = useState("");
  const [age, setAge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Open the dialog if user is loaded and onboarding is false/not complete
  useEffect(() => {
    if (currentUser && currentUser.onbording_dialog === false) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const firstName = clerkUser?.firstName ?? "there";

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const parsedAge = age ? parseInt(age, 10) : undefined;
      await completeOnboardingMutation({
        occupation: occupation.trim() || undefined,
        age: parsedAge,
      });
      localStorage.removeItem("aria_tour_seen");
      toast.success("Welcome aboard! Your setup is complete.");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to complete onboarding:", error);
      toast.error("An error occurred while saving your onboarding state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-[480px] p-6 bg-white text-zinc-800 border-0 rounded-3xl shadow-2xl transition-all duration-300 outline-none"
      >
        <div className="flex flex-col gap-6">
          {/* Card 1 */}
          {step === 1 && (
            <>
              {/* Inner Box */}
              <div className="relative overflow-hidden bg-[#f7f6f0] rounded-2xl p-5 flex justify-between items-center min-h-[160px] border border-neutral-200/40">
                <div className="flex flex-col gap-2 max-w-[65%] z-10">
                  <span className="self-start bg-white text-[11px] font-semibold text-zinc-600 px-3 py-1 rounded-full border border-neutral-100 shadow-xs">
                    Step 1 of 3
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
                    Welcome, {firstName}!
                  </h2>
                  <p className="text-zinc-500 text-xs leading-normal">
                    Aria is an intelligent agent designed to coordinate your
                    workflows and workspace automatically.
                  </p>
                </div>
                {/* SVG on the right */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <Image
                    src="/25.svg"
                    alt="Aria Welcome Graphic"
                    width={150}
                    height={150}
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

              {/* Below Content */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Let's personalize your experience
                </span>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="occupation"
                      className="text-zinc-700 text-xs font-medium"
                    >
                      What is your occupation? (Optional)
                    </Label>
                    <Input
                      id="occupation"
                      placeholder="e.g. Developer, Designer, Student"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 rounded-xl h-10 px-3 focus:ring-zinc-500 focus:border-zinc-500 shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="age"
                      className="text-zinc-700 text-xs font-medium"
                    >
                      How old are you? (Optional)
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="e.g. 25"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 rounded-xl h-10 px-3 focus:ring-zinc-500 focus:border-zinc-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-full px-5 py-2 h-10 text-sm font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Card 2 */}
          {step === 2 && (
            <>
              {/* Inner Box */}
              <div className="relative overflow-hidden bg-[#f7f6f0] rounded-2xl p-5 flex justify-between items-center min-h-[160px] border border-neutral-200/40">
                <div className="flex flex-col gap-2 max-w-[65%] z-10">
                  <span className="self-start bg-white text-[11px] font-semibold text-zinc-600 px-3 py-1 rounded-full border border-neutral-100 shadow-xs">
                    Step 2 of 3
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
                    Aria Web Tracker
                  </h2>
                  <p className="text-zinc-500 text-xs leading-normal">
                    Install browser extension to 10x your agent's capabilities.
                  </p>
                </div>
                {/* SVG on the right */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <Image
                    src="/21.svg"
                    alt="Aria Extension Graphic"
                    width={90}
                    height={90}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {/* Below Content */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  How it works:
                </span>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-600">
                      <strong className="text-zinc-800">
                        10x Productivity:
                      </strong>{" "}
                      Automatically index your web activities so Aria learns
                      your context instantly.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Brain className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-600">
                      <strong className="text-zinc-800">
                        True Intelligence:
                      </strong>{" "}
                      Allows the agent to answer queries based on pages you've
                      visited.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-600">
                      <strong className="text-zinc-800">Privacy First:</strong>{" "}
                      Securely process browsing content locally. You decide what
                      stays.
                    </p>
                  </div>
                </div>

                <a
                  href="https://github.com/ronitrai27/aria-hackathon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#fcfcfa] border border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900/10 dark:border-zinc-800 rounded-xl p-3 flex justify-between items-center mt-1 shadow-xs hover:bg-zinc-50/50 transition-all duration-200 w-full cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 " />
                    <div className="flex flex-col text-left">
                      <span className="text-xs text-zinc-700  flex items-center gap-1.5">
                        <span>Microsoft Edge Extension</span>
                        <span className="text-[9px]  bg-amber-50 border border-amber-200/40 px-1.5 py-0.5 rounded-sm uppercase tracking-wider scale-95">
                          Under Review
                        </span>
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                        To start using it right now, you can install the
                        extension directly from{" "}
                        <span className=" font-semibold group-hover:underline">
                          GitHub
                        </span>
                        .
                      </span>
                    </div>
                  </div>
                </a>
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md px-4 h-8 text-xs font-medium transition-all"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-md px-5 py-2 h-8 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Card 3 */}
          {step === 3 && (
            <>
              {/* Inner Box */}
              <div className="relative overflow-hidden bg-[#f7f6f0] rounded-2xl p-5 flex justify-between items-center min-h-[160px] border border-neutral-200/40">
                <div className="flex flex-col gap-2 max-w-[65%] z-10">
                  <span className="self-start bg-white text-[11px] font-semibold text-zinc-600 px-3 py-1 rounded-full border border-neutral-100 shadow-xs">
                    Step 3 of 3
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
                    Successfully Onboarded!
                  </h2>
                  <p className="text-zinc-500 text-xs leading-normal">
                    You're now ready to connect with 20+ apps that Aria offers.
                  </p>
                </div>
                {/* Visual indicator / multiple icons overlapping on the right */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <div className="relative w-20 h-20">
                    <div className="absolute top-0 left-0 bg-white border border-zinc-200 rounded-xl p-1.5 shadow-sm transform -rotate-12 z-0">
                      <Image
                        src="/gmail.png"
                        alt="Gmail"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-white border border-zinc-200 rounded-xl p-1.5 shadow-sm transform rotate-12 z-0">
                      <Image
                        src="/slack.png"
                        alt="Slack"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-zinc-200 rounded-xl p-2.5 shadow-md z-10">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Below Content */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Connect your favorite tools:
                </span>

                {/* Show apps */}
                <div className="grid grid-cols-5 gap-3 bg-[#fcfcfa] border border-zinc-200/80 p-3.5 rounded-2xl shadow-xs">
                  {appsToShow.map((app) => (
                    <div
                      key={app.name}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-zinc-100 hover:border-zinc-300 transition-all hover:scale-105 duration-200 shadow-2xs"
                    >
                      <div className="h-8 w-8 relative flex items-center justify-center rounded-md">
                        <Image
                          src={app.src}
                          alt={app.name}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md px-4 h-8 text-xs font-medium transition-all"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-md px-6 h-8 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      Saving...
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </>
                  ) : (
                    <>
                      Got It!
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
