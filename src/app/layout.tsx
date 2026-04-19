import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/app/providers";

export const metadata: Metadata = { title: "DHiBob | HR Platform", description: "Comprehensive HR management platform" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="font-sans antialiased"><Providers>{children}</Providers></body></html>);
}
