import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Header from "./components/header/Header";
import { LanguageProvider } from "./context/language";
import { SessionProvider } from "next-auth/react";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${nunito.className} antialiased`}>
        <SessionProvider>
          <LanguageProvider>
            <Header />
            <main className="pt-15 bg-(--bg-primary)">{children}</main>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
