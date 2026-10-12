'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messageService } from '@/lib/messages';
import { Badge } from '@/components/ui/badge';
import { MessageCircleIcon } from 'lucide-react';

const MessageNotificationBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const count = await messageService.getUnreadCount(user.id);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread message count:', error);
      }
    };

    fetchUnreadCount();

    // Set up polling to update the count periodically
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  if (!user || unreadCount <= 0) {
    return null;
  }

  return (
    <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center rounded-full">
      {unreadCount}
    </Badge>
  );
};

export default MessageNotificationBadge;