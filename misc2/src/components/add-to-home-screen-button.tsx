
'use client';

import { Smartphone, Info, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useIconPreference, IconPreferenceContext } from '@/context/icon-preference-context'; // Import IconPreferenceContext
import Image from 'next/image';
import { useEffect } from 'react';

export default function AddToHomeScreenButton() {
  // Log the imported context object itself
  console.log('[AddToHomeScreenButton] Imported IconPreferenceContext object:', IconPreferenceContext);
  
  const { iconPreference, setIconPreference } = useIconPreference();
  console.log('[AddToHomeScreenButton] Rendering. Current iconPreference from context:', iconPreference);

  useEffect(() => {
    console.log('[AddToHomeScreenButton] Detected change in iconPreference from context. New value:', iconPreference);
  }, [iconPreference]);

  const handleSelect = (preference: 'default' | 'alternative') => {
    console.log('[AddToHomeScreenButton] handleSelect called with:', preference);
    setIconPreference(preference);
  };

  const defaultIconPreview = '/apple-touch-icon.png';
  const alternativeIconPreview = '/apple-touch-icon-alt.png';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card hover:bg-muted text-card-foreground">
          <Smartphone className="mr-2 h-4 w-4" />
          App Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" /> App Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            Configure app icon and learn how to add to your home screen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 text-sm space-y-6 overflow-y-auto max-h-[calc(85vh-12rem)]">
          <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant={iconPreference === 'default' ? 'default' : 'outline'}
                onClick={() => handleSelect('default')}
                className="w-full sm:flex-1 justify-start items-center p-5 h-auto"
              >
                <div className="relative w-10 h-10 mr-3 rounded-md overflow-hidden border border-border pointer-events-none">
                  <Image src={defaultIconPreview} alt="Default Icon Preview" fill sizes="40px" data-ai-hint="logo icon" />
                </div>
                <div className="text-left pointer-events-none">
                  <span className="block font-semibold">Default Icon</span>
                  <span className="text-xs text-muted-foreground">Standard style</span>
                </div>
                {iconPreference === 'default' ? <CheckCircle className="ml-auto h-6 w-6 text-primary-foreground pointer-events-none" /> : <Circle className="ml-auto h-6 w-6 text-muted-foreground pointer-events-none" />}
              </Button>
              <Button
                type="button"
                variant={iconPreference === 'alternative' ? 'default' : 'outline'}
                onClick={() => handleSelect('alternative')}
                className="w-full sm:flex-1 justify-start items-center p-5 h-auto"
              >
                <div className="relative w-10 h-10 mr-3 rounded-md overflow-hidden border border-border pointer-events-none">
                  <Image src={alternativeIconPreview} alt="Alternative Icon Preview" fill sizes="40px" data-ai-hint="logo icon alternative"/>
                </div>
                <div className="text-left pointer-events-none">
                  <span className="block font-semibold">Alternative Icon</span>
                  <span className="text-xs text-muted-foreground">Second style</span>
                </div>
                {iconPreference === 'alternative' ? <CheckCircle className="ml-auto h-6 w-6 text-primary-foreground pointer-events-none" /> : <Circle className="ml-auto h-6 w-6 text-muted-foreground pointer-events-none" />}
              </Button>
            </div>
          </div>

          <Separator className="my-3 bg-border/50" />

          <div>
            <h3 className="font-semibold text-primary mb-2 text-md">Add to Home Screen Instructions</h3>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium text-primary mb-1.5">iOS (iPhone/iPad)</h4>
                <ol className="list-decimal list-inside space-y-1 pl-2 text-card-foreground">
                  <li>Open this page in <span className="font-semibold">Safari</span>.</li>
                  <li>Tap the <span className="font-semibold">Share</span> button (icon with an arrow pointing up).</li>
                  <li>Scroll down and tap on <span className="font-semibold">"Add to Home Screen"</span>.</li>
                  <li>Confirm by tapping <span className="font-semibold">"Add"</span>.</li>
                </ol>
              </div>
              <Separator className="my-2 bg-border/30 sm:hidden" />
              <div>
                <h4 className="font-medium text-accent mb-1.5">Android</h4>
                <ol className="list-decimal list-inside space-y-1 pl-2 text-card-foreground">
                  <li>Open this page in <span className="font-semibold">Chrome</span> (or your preferred browser).</li>
                  <li>Tap the <span className="font-semibold">Menu</span> button (usually three dots).</li>
                  <li>Tap on <span className="font-semibold">"Add to Home screen"</span> or <span className="font-semibold">"Install app"</span>.</li>
                  <li>Confirm the action.</li>
                </ol>
              </div>
            </div>
          </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
