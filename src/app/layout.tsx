import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { WorkspaceProvider } from "@/components/continuity/WorkspaceProvider";
import { Toaster } from "@/components/ui/Toast";
import { AppShell } from "@/components/continuity/AppShell";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Continuity — context control for AI work",
  description:
    "Continuity is a creator-controlled Context Pack system. Decide what your AI knows before it writes or builds — and see exactly what's active and why.",
};

export const viewport: Viewport = {
  themeColor: "#F7F8F9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>
        <WorkspaceProvider>
          <Toaster>
            <AppShell>{children}</AppShell>
          </Toaster>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
