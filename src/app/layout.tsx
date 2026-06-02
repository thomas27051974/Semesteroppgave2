import "./globals.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "Ageri Rekruttering",
  description: "Søk på jobb hos Ageri",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <html lang="nb-NO">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NextIntlClientProvider messages={messages} locale="nb-NO" timeZone="Europe/Oslo">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
