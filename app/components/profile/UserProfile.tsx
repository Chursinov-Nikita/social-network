"use client";

import PageHeader from "@/app/components/shell/PageHeader";
import Avatar from "@/app/components/ui/Avatar";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import type { PublicProfile } from "@/app/types/profile";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const UserProfile = ({ user }: { user: PublicProfile }) => {
  const { lang } = useLang();
  const tr = t[lang];
  const router = useRouter();

  const displayName = user.name || tr.noName;

  return (
    <>
      <PageHeader
        title={<span className="truncate">{displayName}</span>}
        leading={
          <button
            onClick={() => router.back()}
            aria-label={tr.back}
            className="icon-btn -ml-2"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
        }
      />

      <div className="mx-auto max-w-2xl space-y-2 py-2 sm:space-y-3 sm:px-4 sm:py-4">
        <section className="panel flex flex-col items-center px-4 py-6 text-center">
          <Avatar name={user.name} image={user.image} size={96} />
          <p className="mt-3 max-w-full truncate text-xl font-medium">
            {displayName}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {tr.memberSince}{" "}
            {new Date(user.createdAt).toLocaleDateString(lang, {
              month: "long",
              year: "numeric",
            })}
          </p>
        </section>

        <section className="panel grid grid-cols-2 divide-x divide-line py-3">
          {[
            { value: user._count.reels, label: tr.reels },
            { value: user._count.posts, label: tr.posts },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-medium tabular-nums">{value}</p>
              <p className="text-sm text-muted first-letter:uppercase">
                {label}
              </p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
};

export default UserProfile;
