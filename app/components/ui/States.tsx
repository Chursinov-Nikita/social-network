import { Loader2 } from "lucide-react";

export const Spinner = ({ label }: { label: string }) => (
  <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
    <Loader2 className="size-4 animate-spin" />
    {label}
  </p>
);

export const EmptyText = ({ children }: { children: React.ReactNode }) => (
  <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>
);

export const RowSkeletons = ({
  count = 4,
  avatar = 48,
}: {
  count?: number;
  avatar?: number;
}) => (
  <div aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <span
          className="shrink-0 rounded-full bg-raised"
          style={{ width: avatar, height: avatar }}
        />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block h-3.5 w-2/5 rounded bg-raised" />
          <span className="block h-3 w-3/5 rounded bg-raised" />
        </span>
      </div>
    ))}
  </div>
);
