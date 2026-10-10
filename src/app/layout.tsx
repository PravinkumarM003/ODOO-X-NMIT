import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F4F6F5] text-[#202B32]">
        {children}
      </body>
    </html>
  );
}
