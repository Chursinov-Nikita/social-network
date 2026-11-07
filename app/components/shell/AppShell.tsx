"use client";

import { useUnreadCounts } from "@/app/hooks/useUnreadCounts";
import { usePathname } from "next/navigation";
import BottomBar from "./BottomBar";
import Sidebar from "./Sidebar";

const AUTH_PAGES = ["/login", "/register"];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const unread = useUnreadCounts();

  if (AUTH_PAGES.includes(pathname)) return <main>{children}</main>;

  return (
    <div className="md:flex">
      <Sidebar unread={unread} />
      <main className="min-h-dvh min-w-0 flex-1 pb-(--tabbar)">{children}</main>
      <BottomBar unread={unread} />
    </div>
  );
};

export default AppShell;
