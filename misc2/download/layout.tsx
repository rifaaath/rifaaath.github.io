
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import AnimatedBackground from '@/components/animated-background';

export const metadata: Metadata = {
  title: 'Mawaqit Sync - FAU Prayer Room',
  description: 'Prayer room schedule and prayer times for FAU Erlangen-Nürnberg, Technische Fakultät.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <meta name="application-name" content="Mawaqit Sync" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mawaqit Sync" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" data-ai-hint="logo icon" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="hsl(212 19% 14%)" /> {/* Dark theme background for tile */}
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="hsl(0 0% 98%)" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="hsl(212 19% 14%)" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AnimatedBackground />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
