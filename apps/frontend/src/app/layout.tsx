import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Summary App",
    template: "%s | Smart Summary App",
  },
  description: "AI-powered text summarization with analytics dashboard. Summarize long texts instantly using advanced AI models with real-time streaming and comprehensive analytics.",
  keywords: ["AI", "text summarization", "summary", "analytics", "NLP", "machine learning"],
  authors: [{ name: "Smart Summary App" }],
  creator: "Smart Summary App",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Smart Summary App",
    description: "AI-powered text summarization with analytics dashboard",
    siteName: "Smart Summary App",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Summary App",
    description: "AI-powered text summarization with analytics dashboard",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

