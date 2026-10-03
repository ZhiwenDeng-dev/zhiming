"use client";

import { usePathname } from "next/navigation";
import { AppProvider } from "@/components/client";
import { TAB_PATHS, TabBar } from "@/components/TabBar";
import { TaskPill } from "@/components/TaskPill";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = TAB_PATHS.includes(pathname);
  return (
    <AppProvider>
      <main className={showTabs ? "pb-[calc(76px+env(safe-area-inset-bottom))]" : "pb-10"}>{children}</main>
      <TaskPill aboveTabs={showTabs} />
      {showTabs && <TabBar />}
    </AppProvider>
  );
}
