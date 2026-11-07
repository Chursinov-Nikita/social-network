import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import AppShell from "./components/shell/AppShell";
import { LanguageProvider } from "./context/language";
import { SessionProvider } from "next-auth/react";

const roboto = Roboto({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

const RESTORE_THEME = `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export const metadata: Metadata = {
  title: "NEBL",
  icons: "/icon.svg",
  description:
    "NEBL — a social network with a feed, reels, real-time chats and friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${roboto.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: RESTORE_THEME }}
        />
        <SessionProvider>
          <LanguageProvider>
            <AppShell>{children}</AppShell>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
