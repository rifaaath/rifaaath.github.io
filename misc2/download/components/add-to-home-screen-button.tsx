
'use client';

import { Smartphone, Info } from 'lucide-react';
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

export default function AddToHomeScreenButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card hover:bg-muted text-card-foreground">
          <Smartphone className="mr-2 h-4 w-4" />
          Add to Home Screen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" /> Add to Home Screen
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            Follow these steps to add this app to your home screen for quick access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div>
            <h3 className="font-semibold text-primary mb-1.5">iOS (iPhone/iPad)</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2 text-card-foreground">
              <li>Open this page in <span className="font-semibold">Safari</span>.</li>
              <li>Tap the <span className="font-semibold">Share</span> button (usually an icon with an arrow pointing up).</li>
              <li>Scroll down and tap on <span className="font-semibold">"Add to Home Screen"</span>.</li>
              <li>Confirm by tapping <span className="font-semibold">"Add"</span>.</li>
            </ol>
          </div>
          <Separator className="my-2 bg-border/50" />
          <div>
            <h3 className="font-semibold text-accent mb-1.5">Android</h3>
            <ol className="list-decimal list-inside space-y-1 pl-2 text-card-foreground">
              <li>Open this page in <span className="font-semibold">Chrome</span> (or your preferred browser).</li>
              <li>Tap the <span className="font-semibold">Menu</span> button (usually three dots).</li>
              <li>Tap on <span className="font-semibold">"Add to Home screen"</span> or <span className="font-semibold">"Install app"</span>.</li>
              <li>Confirm the action.</li>
            </ol>
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
