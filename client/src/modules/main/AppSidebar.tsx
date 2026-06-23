"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import Image from "next/image"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-16 flex-row items-center gap-2 px-4 py-3 border-b border-sidebar-border shrink-0 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 w-full justify-start group-data-[collapsible=icon]:justify-center">
          <Image
            src="/logo.svg"
            alt="Aria Logo"
            width={24}
            height={32}
            className="h-8 w-auto dark:invert-0 invert shrink-0"
          />
          <span className="font-semibold text-lg tracking-wide text-foreground truncate group-data-[collapsible=icon]:hidden">
            Aria
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Rest all sidebar empty */}
      </SidebarContent>

      <SidebarFooter>
        {/* Footer empty */}
      </SidebarFooter>
    </Sidebar>
  )
}
