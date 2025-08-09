
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import ScheduleClock from '@/components/schedule-clock';
import AddToHomeScreenButton from '@/components/add-to-home-screen-button';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import DirectionsDialog from '@/components/directions-dialog';
import SosButton from '@/components/sos-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function PasswordPrompt() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <form className="bg-card p-6 rounded-lg shadow-md border border-border">
          <h2 className="text-xl font-bold text-card-foreground mb-4">Enter Password</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This page is password protected.
          </p>
          <div className="flex flex-col gap-4">
            <Input 
              name="password" 
              type="password" 
              placeholder="Password" 
              required 
              className="bg-background"
            />
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function PrayerTimesPlaceholder() {
  return (
    <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg text-card-foreground">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-xl sm:text-2xl font-bold">
          Prayer Times
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Placeholder Date
        </CardDescription>
        <CardDescription className="text-xs text-muted-foreground">Placeholder Hijri Date</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col items-center pt-3 pb-4 border-t border-border">
          <p className="text-sm text-muted-foreground font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            This is a placeholder. No data is loaded.
          </p>
      </CardFooter>
    </Card>
  );
}

function DevPageContent() {
    return (
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow flex flex-col items-center justify-start container mx-auto p-4 sm:p-6 md:p-8 text-foreground">
              <header className="my-6 sm:my-8 text-center w-full">
                  <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                      Developer Test Page
                  </h1>
                  <p className="text-md sm:text-lg text-muted-foreground mt-2">
                      Please use for testing purposes only.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center items-center gap-2 sm:gap-4">
                      <AddToHomeScreenButton />
                      <DirectionsDialog /> 
                      <ThemeToggleButton />
                  </div>
              </header>
              
              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="flex justify-center items-start w-full h-full">
                      <ScheduleClock />
                  </div>
                  <div className="flex justify-center items-start w-full h-full">
                      <PrayerTimesPlaceholder />
                  </div>
              </div>
          </main>
          
          <footer className="text-center mt-10 mb-6 py-6">
        <p className="text-xs text-muted-foreground">
          <a className="flex items-center justify-center">
            With 
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" className="mx-2" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1"></path></svg>
            From MHG Erlangen
          </a>        
        </p>
        <p className="text-2xs text-muted-foreground/70 mt-1">
          Please note: Prayer times are scraped from Mawaqit.net and are for informational purposes. Schedule is based on 15-min slots.
        </p>
        <p className="text-sm text-gray-500 mt-6 italic"></p>
        <SosButton />

      </footer>
        </div>
    );
}

// A simple wrapper to handle suspense and client/server component boundaries
function PageWrapper() {
  const searchParams = useSearchParams();
  const showPrompt = searchParams.get('auth') === 'false';

  // The cookie can't be read on the client, so the middleware handles all logic.
  // If `auth=false` is present, it means middleware denied access.
  if (showPrompt) {
    return <PasswordPrompt />;
  }

  return <DevPageContent />;
}

export default function Page() {
    return (
        <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <PageWrapper />
        </React.Suspense>
    )
}
