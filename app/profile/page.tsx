"use client";

import LogoutButton from "@/app/components/profile/LogoutButton";
import SettingRow from "@/app/components/profile/SettingRow";
import PageHeader from "@/app/components/shell/PageHeader";
import Avatar from "@/app/components/ui/Avatar";
import { Dialog } from "@/app/components/ui/Dialog";
import { Spinner } from "@/app/components/ui/States";
import { useLang } from "@/app/context/language";
import useTheme from "@/app/hooks/useTheme";
import { t } from "@/app/translation/translation";
import {
  Camera,
  Copy,
  Info,
  Languages,
  Loader2,
  Moon,
  Pencil,
  Sun,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POSTS_PER_LEVEL = 5;

const Profile = () => {
  const { data: session, status, update } = useSession();
  const { lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const tr = t[lang];
  const router = useRouter();

  const [stats, setStats] = useState({ posts: 0, reels: 0 });
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const user = session?.user;
  const userId = user?.id;
  const name = nameOverride ?? user?.name ?? user?.email?.split("@")[0] ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/profile/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data));
  }, [userId]);

  if (status === "loading" || !user) {
    return (
      <>
        <PageHeader title={tr.profile} />
        <Spinner label={tr.loading} />
      </>
    );
  }

  const { posts: postsCount, reels: reelsCount } = stats;
  const currentLevel = Math.floor(postsCount / POSTS_PER_LEVEL) + 1;
  const nextLevelAt =
    Math.ceil((postsCount + 1) / POSTS_PER_LEVEL) * POSTS_PER_LEVEL;
  const prevLevelAt = Math.max(nextLevelAt - POSTS_PER_LEVEL, 0);
  const levelProgress = Math.min(
    100,
    Math.round(
      ((postsCount - prevLevelAt) / Math.max(nextLevelAt - prevLevelAt, 1)) *
        100,
    ),
  );
  const achievement =
    postsCount >= 10
      ? tr.achievementCreatorPro
      : postsCount >= 5
        ? tr.achievementRisingVoice
        : postsCount > 0
          ? tr.achievementFirstSteps
          : tr.achievementNewExplorer;

  const handleCopyEmail = async () => {
    if (!user.email) return;
    await navigator.clipboard.writeText(user.email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 1400);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarLoading(true);
    setAvatarError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Avatar upload failed");
      const data = await res.json();
      await update({ image: data.url });
    } catch {
      setAvatarError(tr.avatarUploadFailed);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveName = async () => {
    const next = nameDraft.trim();
    if (next.length < 2) {
      setNameError(tr.nicknameTooShort);
      return;
    }
    if (next.length > 30) {
      setNameError(tr.genericError);
      return;
    }
    if (next === name) {
      setNameMessage(tr.nicknameAlreadyUpToDate);
      return;
    }

    setNameSaving(true);
    setNameError(null);
    setNameMessage(null);

    const res = await fetch("/api/profile/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });

    if (!res.ok) {
      setNameError(tr.genericError);
      setNameSaving(false);
      return;
    }

    setNameOverride(next);
    await update({ name: next });
    setNameMessage(tr.nicknameUpdated);
    setIsModalOpen(false);
    setNameSaving(false);
  };

  return (
    <>
      <PageHeader title={tr.profile} />

      <div className="mx-auto max-w-2xl space-y-2 py-2 sm:space-y-3 sm:px-4 sm:py-4">
        <section className="panel flex flex-col items-center px-4 py-6 text-center">
          <label
            aria-label={tr.changeAvatar}
            title={tr.changeAvatar}
            className="group relative block cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
          >
            <Avatar name={name || user.email} image={user.image} size={96} />
            <span
              className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity duration-150 ${avatarLoading ? "opacity-100" : "opacity-0 [@media(hover:hover)]:group-hover:opacity-100"}`}
            >
              {avatarLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Camera className="size-5" />
              )}
            </span>
            {!avatarLoading && (
              <span className="absolute right-0 bottom-0 hidden size-8 items-center justify-center rounded-full border-2 border-panel bg-active text-ink [@media(hover:none)]:flex">
                <Camera className="size-4" />
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={avatarLoading}
            />
          </label>

          <p className="mt-3 max-w-full truncate text-xl font-medium">
            {name || tr.noName}
          </p>
          <p className="max-w-full truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-sm text-muted">{achievement}</p>
          {avatarError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {avatarError}
            </p>
          )}
        </section>

        <section className="panel grid grid-cols-2 divide-x divide-line py-3">
          {[
            { value: reelsCount, label: tr.reels },
            { value: postsCount, label: tr.posts },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-medium tabular-nums">{value}</p>
              <p className="text-sm text-muted first-letter:uppercase">
                {label}
              </p>
            </div>
          ))}
        </section>

        <section className="panel px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-medium">
              {tr.level} {currentLevel}
            </span>
            <span className="text-sm text-muted tabular-nums">
              {postsCount} / {nextLevelAt} {tr.posts}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-active">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-300"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">{tr.levelDesc}</p>
        </section>

        <section className="panel overflow-hidden py-1.5">
          <SettingRow
            icon={Pencil}
            label={tr.changeNickname}
            value={name}
            onClick={() => {
              setNameDraft(name);
              setNameError(null);
              setNameMessage(null);
              setIsModalOpen(true);
            }}
          />
          <SettingRow
            icon={Copy}
            label={emailCopied ? tr.copied : tr.copyEmail}
            onClick={handleCopyEmail}
          />
          <div className="md:hidden">
            <SettingRow icon={Users} label={tr.friends} href="/friends" />
            <SettingRow
              icon={Languages}
              label={tr.language}
              value={tr.languageName}
              onClick={toggleLang}
            />
            <SettingRow
              icon={theme === "dark" ? Moon : Sun}
              label={tr.theme}
              value={theme === "dark" ? tr.themeDark : tr.themeLight}
              onClick={toggleTheme}
            />
            <SettingRow icon={Info} label={tr.about} href="/about" />
          </div>
        </section>

        <section className="panel overflow-hidden py-1.5">
          <LogoutButton />
        </section>
      </div>

      {isModalOpen && (
        <Dialog
          title={tr.changeNicknameTitle}
          onClose={() => {
            if (!nameSaving) setIsModalOpen(false);
          }}
        >
          <p className="mt-1 text-sm text-muted">{tr.changeNicknameDesc}</p>
          <input
            type="text"
            value={nameDraft}
            maxLength={30}
            placeholder={tr.enterNickname}
            aria-label={tr.enterNickname}
            autoFocus
            onChange={(e) => {
              setNameDraft(e.target.value);
              setNameError(null);
              setNameMessage(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            className="field mt-4"
          />
          {nameError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {nameError}
            </p>
          )}
          {!nameError && nameMessage && (
            <p className="mt-2 text-sm text-muted">{nameMessage}</p>
          )}
          <div className="mt-5 flex justify-end gap-1">
            <button
              disabled={nameSaving}
              onClick={() => setIsModalOpen(false)}
              className="btn btn-ghost"
            >
              {tr.cancel}
            </button>
            <button
              onClick={handleSaveName}
              disabled={nameSaving}
              className="btn btn-primary"
            >
              {nameSaving ? tr.saving : tr.save}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default Profile;
