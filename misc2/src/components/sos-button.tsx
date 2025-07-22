'use client';

import { useState } from 'react';
import { Siren, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { sendSosNotification } from '@/app/actions/notify-discord';

export default function SosButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSosClick = async () => {
    setIsLoading(true);
    try {
      const result = await sendSosNotification();
      if (result.success) {
        toast({
          title: 'Notification Sent',
          description: 'The responsible parties have been notified.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20 hover:text-destructive">
          <Siren className="mr-2 h-4 w-4" />
          SOS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm SOS</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an immediate alert to the responsible parties to check on the prayer room. Please only use this for actual issues with schedule adherence.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSosClick} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Alert'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
