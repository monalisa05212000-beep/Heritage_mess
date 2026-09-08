import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Heritage",
  description: "Simple, reliable operations for PG caterers.",
  icons: { icon: "/heritage-logo.png", apple: "/heritage-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
