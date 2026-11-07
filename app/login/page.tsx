"use client";

import { AuthField, AuthForm } from "@/app/components/auth/AuthForm";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Login = () => {
  const { lang } = useLang();
  const tr = t[lang];
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(tr.loginError);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <AuthForm
      title={tr.signIn}
      error={error}
      onSubmit={handleLogin}
      submitLabel={tr.signIn}
      loading={loading}
      switchPrompt={tr.noAccount}
      switchLabel={tr.register}
      switchHref="/register"
    >
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
    </AuthForm>
  );
};

export default Login;
