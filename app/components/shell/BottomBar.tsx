"use client";

import Avatar from "@/app/components/ui/Avatar";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { LogIn } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  formatCount,
  getNavLinks,
  isActivePath,
  type UnreadCounts,
} from "./navigation";

const TAB_CLASS =
  "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150";

const BottomBar = ({ unread }: { unread: UnreadCounts }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { lang } = useLang();
  const tr = t[lang];
  const user = session?.user;

  const tabs = getNavLinks(tr).filter((link) => link.href !== "/friends");
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      aria-label="NEBL"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, countKey }) => {
        const active = isActivePath(pathname, href);
        const count = countKey ? unread[countKey] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${TAB_CLASS} ${active ? "text-ink" : "text-faint"}`}
          >
            <span className="relative">
              <Icon className="size-6" strokeWidth={active ? 2 : 1.5} />
              {count > 0 && (
                <span className="count absolute -top-1.5 left-3.5 h-4 min-w-4 px-1 text-[11px]">
                  {formatCount(count)}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5 text-[11px] leading-tight">
              {label}
            </span>
          </Link>
        );
      })}

      {user ? (
        <Link
          href="/profile"
          aria-current={profileActive ? "page" : undefined}
          className={`${TAB_CLASS} ${profileActive ? "text-ink" : "text-faint"}`}
        >
          <Avatar name={user.name ?? user.email} image={user.image} size={24} />
          <span className="max-w-full truncate px-0.5 text-[11px] leading-tight">
            {tr.profile}
          </span>
        </Link>
      ) : (
        <Link href="/login" className={`${TAB_CLASS} text-faint`}>
          <LogIn className="size-6" strokeWidth={1.5} />
          <span className="max-w-full truncate px-0.5 text-[11px] leading-tight">
            {tr.signIn}
          </span>
        </Link>
      )}
    </nav>
  );
};

export default BottomBar;
