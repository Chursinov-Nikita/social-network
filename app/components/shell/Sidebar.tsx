"use client";

import Avatar from "@/app/components/ui/Avatar";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { Info, LogIn, type LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NeblMark from "./NeblMark";
import PreferenceButtons from "./PreferenceButtons";
import {
  formatCount,
  getNavLinks,
  isActivePath,
  type UnreadCounts,
} from "./navigation";

const NavItem = ({
  href,
  label,
  icon: Icon,
  active,
  count = 0,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  count?: number;
}) => (
  <Link
    href={href}
    title={label}
    aria-current={active ? "page" : undefined}
    className={`relative flex h-11 items-center justify-center gap-3 rounded-xl text-sm transition-colors duration-150 lg:justify-start lg:px-3 ${
      active
        ? "bg-active font-medium text-ink"
        : "text-muted hover:bg-raised hover:text-ink"
    }`}
  >
    <Icon className="size-5 shrink-0" strokeWidth={1.75} />
    <span className="hidden min-w-0 flex-1 truncate lg:block">{label}</span>
    {count > 0 && (
      <span className="count absolute top-1 right-1 lg:static">
        {formatCount(count)}
      </span>
    )}
  </Link>
);

const Sidebar = ({ unread }: { unread: UnreadCounts }) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { lang } = useLang();
  const tr = t[lang];
  const user = session?.user;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col border-r border-line bg-panel md:flex lg:w-60">
      <Link
        href="/"
        aria-label="NEBL"
        className="flex h-14 shrink-0 items-center justify-center gap-2.5 lg:justify-start lg:px-6"
      >
        <NeblMark className="h-[18px] w-6 shrink-0" />
        <span className="hidden text-base font-bold tracking-wide lg:inline">
          NEBL
        </span>
      </Link>

      <nav aria-label="NEBL" className="flex flex-col gap-0.5 px-3 pt-2">
        {getNavLinks(tr).map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={isActivePath(pathname, link.href)}
            count={link.countKey ? unread[link.countKey] : 0}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 px-3 pb-3">
        <NavItem
          href="/about"
          label={tr.about}
          icon={Info}
          active={pathname === "/about"}
        />
        <PreferenceButtons className="flex-col py-1 lg:flex-row lg:px-1" />

        {user ? (
          <Link
            href="/profile"
            title={tr.profile}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`flex h-14 items-center justify-center gap-3 rounded-xl transition-colors duration-150 lg:justify-start lg:px-2 ${
              pathname === "/profile" ? "bg-active" : "hover:bg-raised"
            }`}
          >
            <Avatar
              name={user.name ?? user.email}
              image={user.image}
              size={36}
            />
            <span className="hidden min-w-0 flex-1 lg:block">
              <span className="block truncate text-sm font-medium">
                {user.name ?? tr.profile}
              </span>
              <span className="block truncate text-xs text-faint">
                {tr.profile}
              </span>
            </span>
          </Link>
        ) : status === "loading" ? (
          <div className="h-14" />
        ) : (
          <NavItem
            href="/login"
            label={tr.signIn}
            icon={LogIn}
            active={false}
          />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
