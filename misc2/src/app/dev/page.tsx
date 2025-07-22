
import SosButton from '@/components/sos-button';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';

function PasswordPrompt() {
  return (
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
  );
}


export default async function Page({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const hasAccess = (await cookies()).has('dev_access_granted');
  const showPrompt = searchParams.auth === 'false' && !hasAccess;

  if (showPrompt) {
    return (
       <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
        <PasswordPrompt />
      </main>
    )
  }

  // If the cookie is set, show the content.
  // This also handles the case where someone hits /dev directly without the `auth=false` param but has a valid cookie.
  if (hasAccess) {
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
  
  // Default to prompt if no cookie and no specific prompt instruction (e.g. initial visit)
   return (
       <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
        <PasswordPrompt />
      </main>
    )

}
