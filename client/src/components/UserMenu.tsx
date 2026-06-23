"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ChevronDown, LogOut, Settings, Sparkles, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function UserMenu() {
  const user = useQuery(api.user.getCurrentUser);
  const { signOut } = useClerk();
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    const toastId = toast.loading("Logging you out...", {
      position: "top-center",
    });
    try {
      await signOut();
      toast.dismiss(toastId);
      router.push("/");
    } catch (error) {
      toast.error("Failed to log out", { id: toastId });
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success("Email copied to clipboard!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-neutral-800/10 dark:hover:bg-neutral-200/10 p-1.5 rounded-full transition-all outline-none group cursor-pointer max-w-[200px] border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800">
        <Avatar className="h-8 w-8 border border-transparent group-hover:border-primary/20 transition-all shrink-0">
          <AvatarImage src={user.avatar} alt={user.name || "User"} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate max-w-[100px] hidden sm:inline">
          {user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-800 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors mr-0.5 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5 shadow-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl"
      >
        <DropdownMenuLabel className="font-normal px-2.5 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-neutral-900 dark:text-neutral-100 capitalize">
              {user.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1.5 bg-neutral-100 dark:bg-neutral-900" />

        {/* Email Copy Item */}
        <DropdownMenuItem
          onClick={handleCopyEmail}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors text-neutral-700 dark:text-neutral-300 focus:bg-neutral-100 dark:focus:bg-neutral-900"
        >
          <Mail className="h-4 w-4 text-neutral-400" />
          <span className="text-sm truncate">Copy Email</span>
        </DropdownMenuItem>

        {/* Plan Info */}
        <DropdownMenuItem className="flex items-center justify-between rounded-lg px-2.5 py-2 cursor-default focus:bg-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Plan
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              user.planType === "plus"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {user.planType}
          </span>
        </DropdownMenuItem>

        {/* Settings */}
        <DropdownMenuItem
          onClick={() => router.push("/home/settings")}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors text-neutral-700 dark:text-neutral-300 focus:bg-neutral-100 dark:focus:bg-neutral-900"
        >
          <Settings className="h-4 w-4 text-neutral-400" />
          <span className="text-sm">Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-neutral-100 dark:bg-neutral-900" />

        {/* Log out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
