
import SosButton from '@/components/sos-button';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">Developer Test Page</h1>
        <p className="text-muted-foreground mb-6">
          This page is for testing the SOS notification feature.
        </p>
        <SosButton />
        <p className="text-xs text-muted-foreground mt-6 max-w-sm">
          Clicking the SOS button will send a notification to the configured
          Discord channel. Please use for testing purposes only.
        </p>
      </div>
    </main>
  );
}
