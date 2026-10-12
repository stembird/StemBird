'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messageService } from '@/lib/messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SendIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MessageFormProps {
  recipientId: string;
  conversationId?: string;
  onMessageSent?: () => void;
  className?: string;
}

const MessageForm = ({ recipientId, conversationId, onMessageSent, className }: MessageFormProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to send a message');
      return;
    }

    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setIsSending(true);

    try {
      await messageService.sendMessage({
        sender_id: user.id,
        receiver_id: recipientId,
        conversation_id: conversationId || undefined,
        message: message.trim(),
        subject: '' // We can enhance this later with subject support
      });

      setMessage('');
      
      if (onMessageSent) {
        onMessageSent();
      }
      
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please log in to send a message
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Send Message</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              disabled={isSending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div></div> {/* Spacer */}
          <Button type="submit" disabled={isSending || !message.trim()}>
            {isSending ? (
              <>
                Sending...
              </>
            ) : (
              <>
                <SendIcon className="mr-2 h-4 w-4" /> Send Message
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default MessageForm;