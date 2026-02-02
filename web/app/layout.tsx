import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { GlobalErrorBoundary } from "@/components/ui/error-boundary";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { ScreenReaderAnnouncer } from "@/lib/accessibility";
import { ThemeProvider, ThemeScript } from "@/lib/theme/theme-provider";
import { ConsentBanner } from "@/components/enterprise/ConsentBanner";
import "./globals.css";

import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Continuum | Modern HR for Startups",
  description: "The AI-powered HR platform startups deserve. Leave management, attendance, and team organization in one beautiful platform. Free for your first year.",
  keywords: ["HR software", "leave management", "attendance tracking", "startup HR", "HRIS", "employee management"],
  openGraph: {
    title: "Continuum | Modern HR for Startups",
    description: "The AI-powered HR platform startups deserve. Free for your first year.",
    url: "https://continuum.hr",
    siteName: "Continuum",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Continuum | Modern HR for Startups",
    description: "The AI-powered HR platform startups deserve. Free for your first year."
  }
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <meta name="theme-color" content="#030305" />
      </head>
      <body className={`${inter.variable} antialiased selection:bg-primary/40 selection:text-white`}>
        <ThemeProvider defaultTheme="system" enableTransitions>
          <GlobalErrorBoundary>
            <ConfirmProvider>
              {children}
              <ScrollToTop />
              <ScreenReaderAnnouncer />
              <ConsentBanner />
            </ConfirmProvider>
          </GlobalErrorBoundary>
          <Analytics />
          <SpeedInsights />
          <Toaster 
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              className: 'toast-theme-adaptive',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}


