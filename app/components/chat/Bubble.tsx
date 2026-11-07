import type { Message } from "@/app/types/chat";
import { isSameDay } from "date-fns";

export const getRunInfo = (messages: Message[], index: number) => {
  const current = messages[index];
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const startsDay =
    !prev || !isSameDay(new Date(prev.createdAt), new Date(current.createdAt));
  const endsDay =
    !next || !isSameDay(new Date(next.createdAt), new Date(current.createdAt));

  return {
    startsDay,
    startsRun: startsDay || prev.senderId !== current.senderId,
    endsRun: endsDay || next.senderId !== current.senderId,
  };
};

export const DayChip = ({ date, lang }: { date: string; lang: string }) => (
  <p className="sticky top-2 z-10 my-3 self-center rounded-full bg-panel px-3 py-1 text-xs font-medium text-muted">
    {new Date(date).toLocaleDateString(lang, {
      day: "numeric",
      month: "long",
    })}
  </p>
);

const Bubble = ({
  isMe,
  tail,
  time,
  text,
  className = "",
  children,
}: {
  isMe: boolean;
  tail: boolean;
  time: string;
  text?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={`relative min-w-0 rounded-2xl px-3 py-1.5 text-base transition-shadow duration-300 ${
      isMe ? "bg-bubble-out" : "bg-bubble-in"
    } ${tail ? (isMe ? "rounded-br-sm" : "rounded-bl-sm") : ""} ${className}`}
  >
    {children}
    {text !== undefined && (
      <p className="wrap-break-word whitespace-pre-wrap">
        {text}
        <span aria-hidden="true" className="invisible ml-2 text-[11px]">
          {time}
        </span>
      </p>
    )}
    <time className="absolute right-2.5 bottom-1 text-[11px] leading-4 text-bubble-meta tabular-nums">
      {time}
    </time>
  </div>
);

export default Bubble;
