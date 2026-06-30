"use client";

import { HelpCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { ConnectionDialog } from "@/components/ConnectionDialog";
import { HelpDialog } from "@/components/HelpDialog";
import { NavigationGuide } from "@/components/NavigationGuide";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/modules/main/AppSidebar";
import { BreadCrumbs } from "@/modules/main/BreadCrumbs";
import { ConnectorDropdown } from "./ConnectorDropdown";
import { ExtensionDropdown } from "./ExtensionDropdown";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <SidebarProvider>
      <Suspense
        fallback={
          <div className="w-64 bg-zinc-950 border-r border-zinc-800 animate-pulse h-full" />
        }
      >
        <AppSidebar />
      </Suspense>
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SidebarTrigger id="tour-sidebar-trigger" className="-ml-1" />
            <div className="h-4 w-px bg-neutral-800 mx-2" />
            <BreadCrumbs />
          </div>
          <div className="flex items-center gap-4">
            <ConnectorDropdown />
            <ExtensionDropdown />

            <Button
              id="tour-help-btn"
              variant={"outline"}
              className="rounded-md bg-neutral-100 hover:text-blue-600 transition-all cursor-pointer"
              size={"icon-sm"}
              onClick={() => setIsHelpOpen(true)}
              title="Help & Guides"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </Button>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <ConnectionDialog />
      <OnboardingDialog />
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <NavigationGuide />
    </SidebarProvider>
  );
}
