"use client";

import { signOut } from "next-auth/react";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { LogOut } from "lucide-react";
import SettingRow from "./SettingRow";

const LogoutButton = () => {
  const { lang } = useLang();
  const tr = t[lang];

  return (
    <SettingRow
      icon={LogOut}
      label={tr.logOut}
      danger
      onClick={() => signOut({ callbackUrl: "/login" })}
    />
  );
};

export default LogoutButton;
