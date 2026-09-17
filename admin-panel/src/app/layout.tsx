import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "atmik.ai",
  description: "A premium, editorial Content Management System for atmik.ai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-primary-navy">
        {children}
      </body>
    </html>
  );
}
