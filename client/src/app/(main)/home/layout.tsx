import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/modules/main/AppSidebar"
import { BreadCrumbs } from "@/modules/main/BreadCrumbs"
import React from "react"

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border mx-2" />
          <BreadCrumbs />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
