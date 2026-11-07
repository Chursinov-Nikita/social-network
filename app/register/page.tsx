"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthField, AuthForm } from "@/app/components/auth/AuthForm";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";

const Register = () => {
  const { lang } = useLang();
  const tr = t[lang];
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(tr.passwordsDoNotMatch);
      return;
    }
    if (password.length < 6) {
      setError(tr.passwordLeast);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      setError(res.status === 409 ? tr.emailTaken : tr.registerFailed);
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <AuthForm
      title={tr.createAccount}
      error={error}
      onSubmit={handleRegister}
      submitLabel={tr.createAccount}
      loading={loading}
      switchPrompt={tr.haveAccount}
      switchLabel={tr.signIn}
      switchHref="/login"
    >
      <AuthField
        label={tr.name}
        type="text"
        autoComplete="name"
        placeholder={tr.name2}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <AuthField
        label={tr.email}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <AuthField
        label={tr.password}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <AuthField
        label={tr.confirmPassword}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={
          confirm && password !== confirm ? tr.passwordsDoNotMatch : undefined
        }
        required
      />
    </AuthForm>
  );
};

export default Register;
