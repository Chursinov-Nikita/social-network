import { Users } from "lucide-react";
import Image from "next/image";

const GREYS = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
] as const;

const greyFor = (name: string) => {
  const sum = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return GREYS[sum % GREYS.length];
};

const Avatar = ({
  name,
  image,
  size = 40,
  online = false,
  group = false,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
  online?: boolean;
  group?: boolean;
}) => {
  const label = name?.trim() || "?";

  return (
    <span
      className="relative inline-block shrink-0 align-middle"
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image
          src={image}
          width={size}
          height={size}
          alt={label}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          style={{ fontSize: Math.round(size * 0.4) }}
          className={`flex size-full items-center justify-center rounded-full font-medium text-ink ${greyFor(label)}`}
        >
          {group ? (
            <Users style={{ width: size * 0.45, height: size * 0.45 }} />
          ) : (
            label[0].toUpperCase()
          )}
        </span>
      )}
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-panel bg-ink" />
      )}
    </span>
  );
};

export default Avatar;
