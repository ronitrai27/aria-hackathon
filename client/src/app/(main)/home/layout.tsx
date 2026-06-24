import { Cable, Mail } from "lucide-react";
import type React from "react";
import { ConnectionDialog } from "@/components/ConnectionDialog";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/modules/main/AppSidebar";
import { BreadCrumbs } from "@/modules/main/BreadCrumbs";
import { ConnectorDropdown } from "./ConnectorDropdown";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-neutral-800 mx-2" />
            <BreadCrumbs />
          </div>
          <div className="flex items-center gap-4">
            <ConnectorDropdown />
            <Button
              variant={"outline"}
              className="rounded-md bg-neutral-100"
              size={"icon-sm"}
            >
              <Cable />
            </Button>
            <Button
              variant={"outline"}
              className="rounded-md bg-neutral-100"
              size={"icon-sm"}
            >
              <Mail />
            </Button>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <ConnectionDialog />
    </SidebarProvider>
  );
}
