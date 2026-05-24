import type {Metadata} from 'next';
import './prayer-schedule.css';
// Note: You might need to adjust this import path
// depending on where you moved the app-providers file.
import { AppProviders } from './app-providers'; 
import { IconPreferenceProvider } from '@/context/icon-preference-context';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Next.js will automatically merge this metadata with your root layout's
export const metadata: Metadata = {
  title: 'FAU Prayer Room',
  description: 'Prayer room schedule and prayer times for FAU Erlangen-Nürnberg, Technische Fakultät.',
  manifest: '/manifest.json', // Default manifest
};

// This is now a nested layout, so no <html>, <head>, or <body> tags
export default function PrayerScheduleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProviders>
      <IconPreferenceProvider>
        {children}
        {/* It's fine to have these here, but if they are
          already in your main root layout, you can remove them 
          from this file to avoid loading them twice.
        */}
        <Analytics />
        <SpeedInsights />
      </IconPreferenceProvider>
    </AppProviders>
  );
}