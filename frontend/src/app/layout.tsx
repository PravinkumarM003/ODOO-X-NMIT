import type { Metadata } from "next";
import "./globals.css";

import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TexFlow | Everest Textile Mills",
  description: "From Yarn to Delivery, Every Roll Accounted For. Textile Manufacturing System.",
};

import { getSession } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { apiClient } from "@/lib/apiClient";
import { ThemeProvider } from "@/components/ThemeProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let notifications: any[] = [];
  if (session) {
    try {
      notifications = await apiClient.get<any[]>("/notifications");
    } catch {}
  }

  return (
    <html lang="en" className={`h-full ${ibmPlexSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text-primary)] font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {session ? (
            <AppShell user={session} notifications={notifications}>
              {children}
            </AppShell>
          ) : (
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
