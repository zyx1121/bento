import HeaderBar from "@/components/header-bar";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bento",
    template: "Bento",
  },
  description: "Bento is a platform for ordering meeting food.",

  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    shortcut: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://bento.winlab.tw",
    siteName: "Bento",
    title: "Bento - Meeting Food Ordering System",
    description: "Bento is a platform for ordering meeting food.",
  },

  twitter: {
    card: "summary",
    title: "Bento - Meeting Food Ordering System",
    description: "Bento is a platform for ordering meeting food.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  manifest: "/manifest.json",
  keywords: ["訂餐", "bento", "food ordering"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <div className="flex flex-col min-h-dvh">
              <HeaderBar />
              <main className="flex-1">{children}</main>
            </div>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
