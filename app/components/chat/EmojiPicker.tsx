"use client";

import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EMOJI_CATEGORIES } from "./emoji";

const EmojiPicker = ({ onPick }: { onPick: (emoji: string) => void }) => {
  const { lang } = useLang();
  const tr = t[lang];
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={tr.emoji}
        aria-expanded={open}
        className="icon-btn size-11"
      >
        <Smile className="size-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute bottom-13 left-0 z-30 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl bg-raised shadow-xl">
          <div className="flex border-b border-line-strong/40">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label.en}
                onClick={() => setActiveCat(i)}
                aria-label={cat.label[lang]}
                className={`relative flex-1 cursor-pointer py-2 text-base transition-opacity ${
                  activeCat === i
                    ? "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">
            {EMOJI_CATEGORIES[activeCat].label[lang]}
          </p>
          <div className="grid grid-cols-8 px-2 pb-2">
            {EMOJI_CATEGORIES[activeCat].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onPick(emoji);
                  setOpen(false);
                }}
                className="flex aspect-square cursor-pointer items-center justify-center rounded-lg text-xl transition-colors hover:bg-active"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
