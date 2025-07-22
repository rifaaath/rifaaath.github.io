
import ScheduleClock from '@/components/schedule-clock';
import PrayerTimesDisplay from '@/components/prayer-times-display';
import AddToHomeScreenButton from '@/components/add-to-home-screen-button';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import DirectionsDialog from '@/components/directions-dialog'; // Import the new dialog

export default async function HomePage() {
  return (
    <main className="flex-grow flex flex-col items-center justify-start container mx-auto p-4 sm:p-6 md:p-8 text-foreground min-h-screen">
      <header className="my-6 sm:my-8 text-center w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          FAU Erlangen-Nürnberg Prayer Room
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground mt-2">
          Technische Fakultät | Slots & Prayer Times
        </p>
        <div className="mt-4 flex flex-wrap justify-center items-center gap-2 sm:gap-4">
          <AddToHomeScreenButton />
          <DirectionsDialog /> {/* Add the new DirectionsDialog button */}
          <ThemeToggleButton />
        </div>
      </header>
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex justify-center items-start w-full h-full">
          <ScheduleClock />
        </div>
        <div className="flex justify-center items-start w-full h-full">
          <PrayerTimesDisplay />
        </div>
      </div>
      
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
        <p className="text-sm text-gray-500 mt-6 italic">
          Heads up: This isn't an official FAU page—just something put together for helpful guidance.
        </p>

      </footer>
    </main>
  );
}