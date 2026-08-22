import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stance | Civic Reporting",
  description: "Report and track local civic issues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
