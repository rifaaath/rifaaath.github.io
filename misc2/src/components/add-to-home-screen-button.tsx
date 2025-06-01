
'use client';

import { Smartphone, Info, ImageIcon, CheckCircle, Circle } from 'lucide-react';
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
import { useIconPreference } from '@/context/icon-preference-context';
import Image from 'next/image';

export default function AddToHomeScreenButton() {
  const { iconPreference, setIconPreference } = useIconPreference();

  const handleSelect = (preference: 'default' | 'alternative') => {
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
          <div>
            <h3 className="font-semibold text-primary mb-2 text-md">App Icon Preference</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Choose the icon for the app when added to your home screen.
              (Re-add to home screen for changes to take effect).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={iconPreference === 'default' ? 'default' : 'outline'}
                onClick={() => handleSelect('default')}
                className="flex-1 justify-start items-center p-3 h-auto"
              >
                <div className="relative w-10 h-10 mr-3 rounded-md overflow-hidden border border-border">
                  <Image src={defaultIconPreview} alt="Default Icon Preview" layout="fill" objectFit="cover" data-ai-hint="logo icon" />
                </div>
                <div className="text-left">
                  <span className="block font-semibold">Default Icon</span>
                  <span className="text-xs text-muted-foreground">Standard style</span>
                </div>
                {iconPreference === 'default' ? <CheckCircle className="ml-auto h-5 w-5 text-primary-foreground" /> : <Circle className="ml-auto h-5 w-5 text-muted-foreground" />}
              </Button>
              <Button
                variant={iconPreference === 'alternative' ? 'default' : 'outline'}
                onClick={() => handleSelect('alternative')}
                className="flex-1 justify-start items-center p-3 h-auto"
              >
                <div className="relative w-10 h-10 mr-3 rounded-md overflow-hidden border border-border">
                  <Image src={alternativeIconPreview} alt="Alternative Icon Preview" layout="fill" objectFit="cover" data-ai-hint="logo icon alternative"/>
                </div>
                <div className="text-left">
                  <span className="block font-semibold">Alternative Icon</span>
                  <span className="text-xs text-muted-foreground">Second style</span>
                </div>
                {iconPreference === 'alternative' ? <CheckCircle className="ml-auto h-5 w-5 text-primary-foreground" /> : <Circle className="ml-auto h-5 w-5 text-muted-foreground" />}
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
