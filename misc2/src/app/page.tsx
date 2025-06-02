
import ScheduleClock from '@/components/schedule-clock';
import PrayerTimesDisplay from '@/components/prayer-times-display';
import AddToHomeScreenButton from '@/components/add-to-home-screen-button';
import { ThemeToggleButton } from '@/components/theme-toggle-button';


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
        <div className="mt-4 flex justify-center items-center gap-4">
          <AddToHomeScreenButton />
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
          &copy; {new Date().getFullYear()} With ♡
        </p>
        <p className="text-2xs text-muted-foreground/70 mt-1">
          Please note: Prayer times are scraped from Mawaqit.net and are for informational purposes. Schedule is based on 15-min slots.
        </p>
        <p className="text-sm text-gray-500 mt-6 italic">
          Heads up: This isn’t an official FAU page—just something put together for helpful guidance.
        </p>
      </footer>
    </main>
  );
}
