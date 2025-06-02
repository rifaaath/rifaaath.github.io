
'use client';

import Image from 'next/image';
import { MapPin, Navigation } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DirectionsDialog() {
  const mapImageUrl = "https://placehold.co/800x600.png"; // Replace with your actual image path if available locally e.g. /images/prayer_room_map.png

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card hover:bg-muted text-card-foreground">
          <Navigation className="mr-2 h-4 w-4" />
          Directions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> How to Find the Prayer Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            Follow these visual and textual directions to reach the prayer room at Technische Fakultät.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-10rem)]">
          <div className="py-4 pr-6 space-y-6">
            <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden border border-border shadow-sm">
              <Image 
                src={mapImageUrl} 
                alt="Map to FAU Prayer Room" 
                layout="fill" 
                objectFit="contain" 
                data-ai-hint="campus map" 
              />
            </div>

            <div>
              <h3 className="font-semibold text-primary mb-2 text-lg">Directions:</h3>
              <ol className="list-decimal list-inside space-y-2 pl-2 text-card-foreground text-sm sm:text-base">
                <li>
                  Start from the area near <span className="font-semibold">Hörsaal 1 (H1) [Heinz]</span> and <span className="font-semibold">Hörsaal 2 (H2)</span>, on the path marked <span className="font-semibold">"Bunte-Zebra-Weg"</span>.
                </li>
                <li>
                  Follow <span className="font-semibold">"Bunte-Zebra-Weg"</span> as it curves, heading towards the main <span className="font-semibold">"Technische Fakultät"</span> building complex.
                </li>
                <li>
                  Continue along the path. You will pass the main entrance/area of <span className="font-semibold">"Technische Fakultät"</span> on your left.
                </li>
                <li>
                  The path will then lead you alongside the <span className="font-semibold">"FAU FabLab"</span> building (on your right).
                </li>
                <li>
                  Keep going straight. You'll approach the <span className="font-semibold">"Department Mathematik"</span> and <span className="font-semibold">"NMI - Felix-Klein-Gebäude"</span>.
                </li>
                <li>
                  The Prayer Room (marked as <span className="font-semibold text-green-600">P.R</span> on the map, near the green square) is located in this vicinity, close to the <span className="font-semibold">"Department Mathematik"</span>. Look for signs or the specific entrance indicated by the red path on the map.
                </li>
                <li>
                  <span className="italic">Tip: The prayer room might be on an upper floor or tucked in a corner. The red line on the map shows the direct walking route.</span>
                </li>
              </ol>
            </div>
            
            <div className="text-xs text-muted-foreground">
                <p>This map and directions are based on the provided image. Building layouts can change. If lost, ask for directions to the "Department Mathematik" area.</p>
                <p>The Prayer Room is usually accessible during university opening hours.</p>
            </div>
          </div>
        </ScrollArea>
        
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
