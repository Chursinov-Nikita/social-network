import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const ROW_CLASS =
  "flex h-12 w-full cursor-pointer items-center gap-4 px-4 text-left text-base transition-colors duration-150 hover:bg-raised";

const SettingRow = ({
  icon: Icon,
  label,
  value,
  href,
  danger = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <Icon
        className={`size-5 shrink-0 ${danger ? "" : "text-muted"}`}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value && (
        <span className="min-w-0 max-w-[45%] truncate text-sm text-muted">
          {value}
        </span>
      )}
    </>
  );

  const className = `${ROW_CLASS} ${danger ? "text-danger" : ""}`;

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default SettingRow;
