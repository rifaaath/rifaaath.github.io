
'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import AnimatedBackground from '@/components/animated-background'; 
import { Toaster } from "@/components/ui/toaster"; 

export function AppProviders({ children }: { children: ReactNode }) {
  return (
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
  );
}
