'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import MessageInbox from '@/components/MessageInbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircleIcon, 
  MailIcon, 
  BellIcon,
  UsersIcon,
  SearchIcon
} from 'lucide-react';

const MessagesPage = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-6 max-w-2xl mx-auto text-center">
          <MailIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to access your messages
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircleIcon className="h-8 w-8" />
          Messages
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} unread
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          Communicate with employers and other users
        </p>
      </div>

      <Card className="overflow-hidden">
        <MessageInbox />
      </Card>
    </div>
  );
};

export default MessagesPage;