
'use client';

import { useState } from 'react';
import { Siren, Loader2 } from 'lucide-react';
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
import { sendSosNotification } from '@/app/actions/notify';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function SosButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [isGdprChecked, setIsGdprChecked] = useState(false);
  const { toast } = useToast();

  const handleSosClick = async () => {
    if (!isGdprChecked) {
      toast({
        title: 'Consent Required',
        description: 'You must agree to the data handling policy before sending an alert.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendSosNotification({ name, comment });
      if (result.success) {
        toast({
          title: 'Notification Sent',
          description: 'The responsible parties have been notified.',
          variant: 'default',
        });
        setIsDialogOpen(false); // Close dialog on success
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
  
  const onOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when dialog closes
      setName('');
      setComment('');
      setIsGdprChecked(false);
      setIsLoading(false);
    }
    setIsDialogOpen(open);
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={onOpenChange}>
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
            This will send an immediate alert to the responsible parties. Please only use this for actual issues with schedule adherence. You can optionally provide your name and comments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sos-name">Name (Optional)</Label>
            <Input id="sos-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sos-comments">Comments (Optional)</Label>
            <Textarea id="sos-comments" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Describe the issue, e.g., 'Someone is not leaving the room on time.'" disabled={isLoading} />
          </div>
          <div className="items-top flex space-x-2 pt-2">
            <Checkbox id="gdpr-consent" checked={isGdprChecked} onCheckedChange={(checked) => setIsGdprChecked(Boolean(checked))} disabled={isLoading} />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="gdpr-consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Acknowledge Data Handling
              </label>
              <p className="text-xs text-muted-foreground">
                I understand that this information will be immediately forwarded via Telegram to authorized MHG administrators and will not be stored on this server. This is in accordance with GDPR.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSosClick} disabled={isLoading || !isGdprChecked}>
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
