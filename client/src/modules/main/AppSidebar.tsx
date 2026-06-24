"use client";

import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Bot,
  Brain,
  Cable,
  CheckSquare,
  ChevronRight,
  Clover,
  Home,
  Link2,
  LogOut,
  Network,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { connectorIcons } from "@/lib/static";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

const mainMenuItems = [
  { name: "Home", url: "/home", icon: Home },
  { name: "Agent", url: "/home/agent", icon: Brain },
  { name: "My Tasks", url: "/home/tasks", icon: CheckSquare },
  { name: "Workflows", url: "/home/workflows", icon: Workflow },
  { name: "Life Graph", url: "/home/life-graph", icon: Network },
];

export function AppSidebar() {
  const user = useQuery(api.user.getCurrentUser);
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const toastId = toast.loading("Logging you out...", {
      position: "top-center",
    });
    try {
      await signOut();
      toast.dismiss(toastId);
      router.push("/");
    } catch {
      toast.error("Failed to log out", { id: toastId });
    }
  };

  const connectedApps = user?.connecters ?? [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-16 flex-row items-center gap-2 px-4 py-3 border-b border-border shrink-0 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 w-full justify-center group-data-[collapsible=icon]:justify-center">
          <Image
            src="/logo.svg"
            alt="Aria Logo"
            width={24}
            height={32}
            className="h-10 w-auto dark:invert-0 invert shrink-0"
          />
          <span className="font-semibold text-2xl tracking-wide text-foreground truncate group-data-[collapsible=icon]:hidden">
            Aria
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainMenuItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "h-10 px-3 transition-all duration-200 hover:bg-sidebar-accent/50",
                        isActive && [
                          "bg-transparent! bg-linear-to-r from-purple-500/20 to-transparent hover:from-purple-500/15",
                          "text-black!",
                          "border-l-4! rounded! border-purple-500!  pl-[10px]!",
                          "group-data-[collapsible=icon]:border-l-0! group-data-[collapsible=icon]:rounded-xl! group-data-[collapsible=icon]:p-2!",
                        ],
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors duration-200",
                            isActive ? "text-black!" : "text-neutral-800",
                          )}
                        />
                        <span
                          className={cn(
                            "transition-colors duration-200 text-neutral-800",
                            isActive && "text-black",
                          )}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Integrations Popover item */}
              <SidebarMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Integrations"
                      className="h-10 px-3 transition-all duration-200 hover:bg-sidebar-accent/50"
                    >
                      <Cable className="h-4 w-4" />
                      <span>Integrations</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-72 p-4 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground z-50"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="font-semibold text-sm leading-none mb-1 text-foreground">
                          Connected Integrations
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Manage your active app integrations.
                        </p>
                      </div>
                      <div className="border-b border-border/60" />

                      {connectedApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                            <Link2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            No integrations active
                          </p>
                          <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1">
                            Connect apps using the plug icon in the top header
                            menu.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1">
                          {connectedApps.map((appName) => {
                            const icon = connectorIcons[appName] || "/logo.svg";
                            return (
                              <div key={appName} className="">
                                <div className="flex items-center justify-center gap-2">
                                  <Image
                                    src={icon}
                                    alt={appName}
                                    width={20}
                                    height={20}
                                    className="w-7 h-7 object-contain"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat History Group */}
        <SidebarGroup className=" group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-foreground flex items-center justify-center uppercase px-3 mb-1.5 select-none">
            Chat History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-6 text-center border border-dashed border-neutral-300 rounded-md bg-muted  mx-1 select-none">
              <p className="text-xs font-semibold text-foreground/80 dark:text-foreground/70">
                No history available
              </p>
              <p className="text-[10px] text-muted-foreground/70 dark:text-muted-foreground/50 mt-1.5 max-w-[160px] mx-auto">
                Recent conversations will display here.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 mt-auto">
        {!user ? (
          <div className="flex items-center gap-2.5 w-full select-none">
            <div className="h-9 w-9 rounded-xl bg-muted animate-pulse shrink-0 group-data-[collapsible=icon]:rounded-full" />
            <div className="flex flex-col gap-1.5 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              <div className="h-2 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              if (user.planType === "free") {
                toast.success("Upgrade billing system is coming soon!");
              } else {
                toast.info("You are already on the Plus plan!");
              }
            }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-6! border bg-linear-to-br from-white via-purple-50 to-purple-500/30 rounded-md",
              "h-9 w-full",
              "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-purple-500/30 group-data-[collapsible=icon]:bg-purple-500/10",
            )}
            title={
              user.planType === "free" ? "Upgrade to Plus" : "Plus Plan active"
            }
          >
            <Clover className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 group-hover/upgrade:scale-110 group-hover/upgrade:rotate-6 transition-all duration-300" />
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="text-xs capitalize leading-none mb-0.5">
                {user.planType} Plan
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-none">
                {user.planType === "free"
                  ? "Upgrade for 10x productivity"
                  : "10x productivity active!"}
              </span>
            </div>
          </div>
        )}

        {user ? (
          <div className="flex items-center justify-between gap-2 w-full border-border border-t pt-2 overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar className="h-9 w-9 border border-border/50 shadow-xs shrink-0 select-none">
                <AvatarImage src={user.avatar} alt={user.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden select-none">
                <span className="text-xs font-semibold text-foreground truncate capitalize">
                  {user.name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors cursor-pointer shrink-0 group-data-[collapsible=icon]:hidden"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full select-none">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-2 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
