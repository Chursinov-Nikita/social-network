import type { Translation } from "@/app/translation/translation";
import {
  Bell,
  Clapperboard,
  House,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export type UnreadCounts = { messages: number; notifications: number };

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  countKey?: keyof UnreadCounts;
};

export const getNavLinks = (tr: Translation): NavLink[] => [
  { href: "/", label: tr.feed, icon: House },
  { href: "/chat", label: tr.chats, icon: MessageCircle, countKey: "messages" },
  { href: "/reels", label: tr.reels, icon: Clapperboard },
  { href: "/friends", label: tr.friends, icon: Users },
  {
    href: "/notifications",
    label: tr.notifications,
    icon: Bell,
    countKey: "notifications",
  },
];

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export const formatCount = (count: number) =>
  count > 99 ? "99+" : String(count);
