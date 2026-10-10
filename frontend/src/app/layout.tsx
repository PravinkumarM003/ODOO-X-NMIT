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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-full flex flex-col bg-[#F4F6F5] text-[#202B32] font-sans">
        {children}
      </body>
    </html>
  );
}
