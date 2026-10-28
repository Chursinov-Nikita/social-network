import type { Translation } from "@/app/translation/translation";

export const getLinks = (tr: Translation) => [
  { href: "/", label: tr.feed },
  { href: "/chat", label: tr.chats },
  { href: "/reels", label: tr.reels },
  { href: "/friends", label: tr.friends },
  { href: "/notifications", label: tr.notifications },
  { href: "/about", label: tr.about },
];
