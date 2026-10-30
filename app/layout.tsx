import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "AI SOFT STUDIO",
  description: "AI-powered customer support and sales automation platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
