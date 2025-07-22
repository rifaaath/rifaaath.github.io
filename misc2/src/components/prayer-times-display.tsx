
'use client';

import type { PrayerTimesData } from '@/app/actions/prayer-times';
import { getPrayerTimes } from '@/app/actions/prayer-times';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, ClockIcon, Zap, AlertTriangle } from 'lucide-react';

export default function PrayerTimesDisplay() {
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Client-side error state

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null); // Clear previous client-side errors
      try {
        const data = await getPrayerTimes();
        if (data.error) { // Check for error message from server action
          console.warn("Prayer times fetch error (from server action):", data.error);
          setError(data.error); // Use error from server action
        }
        setPrayerData(data);
      } catch (err) { // Catch client-side errors during fetch call itself
        console.error("Failed to fetch prayer times (client-side):", err);
        if (err instanceof Error) {
          setError(`Could not load prayer times: ${err.message}`);
        } else {
          setError("Could not load prayer times due to an unexpected client-side issue.");
        }
        setPrayerData(null); // Ensure prayerData is null on client-side error
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    const intervalId = setInterval(fetchData, 60 * 1000 * 5); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg">
        <CardHeader className="pb-3">
          <Skeleton className="h-7 w-3/5 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
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
          <Skeleton className="h-5 w-4/5 mb-1.5" />
          <Skeleton className="h-4 w-1/2" />
        </CardFooter>
      </Card>
    );
  }

  // Display error state if client-side error OR server-action returned an error in prayerData
  if (error || (prayerData && prayerData.error && !prayerData.times?.length)) {
    return (
      <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center text-destructive-foreground bg-destructive p-3 rounded-t-md flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 mr-2"/> Prayer Times Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-5">
          <p className="text-card-foreground">{error || prayerData?.error || "Prayer data is not available at the moment."}</p>
          <p className="text-xs text-muted-foreground mt-2">Please try refreshing the page or check back later.</p>
        </CardContent>
      </Card>
    );
  }
  
  // If prayerData is null after loading (should be caught by above, but as a safeguard)
  if (!prayerData) {
     return (
      <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center text-destructive-foreground bg-destructive p-3 rounded-t-md">
             <AlertTriangle className="w-5 h-5 mr-2"/> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-5">
          <p className="text-card-foreground">Could not retrieve prayer times data.</p>
        </CardContent>
      </Card>
    );
  }

  // Display if successfully loaded but times array is empty and no specific error reported in prayerData.error
  if (prayerData.times.length === 0 && !prayerData.error) {
    return (
       <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg text-card-foreground">
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Prayer Times
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {prayerData.date || 'Date not available'}
          </CardDescription>
           {prayerData.hijriDate && <CardDescription className="text-xs text-muted-foreground">{prayerData.hijriDate}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center py-5">
            <p className="text-card-foreground">No prayer times found for today.</p>
            <p className="text-xs text-muted-foreground mt-1">This might be a temporary issue with the data source.</p>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card className="w-full max-w-sm bg-card shadow-xl rounded-lg text-card-foreground">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-xl sm:text-2xl font-bold">
          Prayer Times
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {prayerData.date}
        </CardDescription>
        {prayerData.hijriDate && <CardDescription className="text-xs text-muted-foreground">{prayerData.hijriDate}</CardDescription>}
      </CardHeader>
      <CardContent className="pb-2">
        <ul className="space-y-1 sm:space-y-1.5">
          {prayerData.times.map((pt) => (
            <li 
              key={pt.name} 
              className={`flex justify-between items-center text-sm sm:text-md p-1.5 sm:p-2 rounded-md transition-colors
                          ${prayerData.currentPrayer?.name === pt.name ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
            >
              <span className={`font-medium ${prayerData.currentPrayer?.name === pt.name ? 'text-primary' : 'text-card-foreground'}`}>
                {pt.name}
              </span>
              <span className={`font-semibold ${prayerData.currentPrayer?.name === pt.name ? 'text-primary' : 'text-foreground'}`}>
                {pt.time} 
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      {(prayerData.nextPrayer || prayerData.currentPrayer) && (
        <CardFooter className="flex-col items-center text-center pt-2.5 sm:pt-3 pb-3 sm:pb-4 border-t border-border/50">
          {prayerData.currentPrayer && (
             <div className="mb-1.5 sm:mb-2 text-center w-full">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1 sm:gap-1.5">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Current: 
                  <span className="font-semibold text-primary">{prayerData.currentPrayer.name}</span> 
                  ({prayerData.currentPrayer.time})
                </p>
            </div>
          )}
          {prayerData.nextPrayer && (
            <div className="text-center w-full">
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1 sm:gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" /> Next: 
                <span className="font-semibold text-accent">{prayerData.nextPrayer.name}</span> 
                 at {prayerData.nextPrayer.time}
              </p>
              <p className="text-2xs sm:text-xs text-muted-foreground/80">
                ({prayerData.nextPrayer.timeUntil})
              </p>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}