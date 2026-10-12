'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { messageService } from '@/lib/messages';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  SearchIcon, 
  SendIcon, 
  ClockIcon, 
  MailIcon, 
  UsersIcon,
  XIcon
} from 'lucide-react';

interface Conversation {
  conversation_id: string;
  other_party_id: string;
  last_message_time: string;
  total_messages: number;
  unread_count: number;
  last_message: string;
  other_party_name?: string;
  other_party_avatar?: string;
}

const MessageInbox = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const data = await messageService.getConversations(user.id);
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const filteredConversations = conversations.filter(conv => 
    conv.other_party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Please log in to access messages</div>;
  }

  return (
    <div className="flex h-full w-full max-w-6xl mx-auto bg-background">
      {/* Conversations List */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
          <div className="mt-3 relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <div 
                  key={conv.conversation_id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedConversation === conv.conversation_id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv.conversation_id)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.other_party_avatar} alt={conv.other_party_name} />
                      <AvatarFallback>
                        {conv.other_party_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {conv.other_party_name || 'Unknown User'}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.last_message_time).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="mt-2 h-5 px-1.5">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Thread View */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <MessageThread conversationId={selectedConversation} userId={user.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MailIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
            <p className="text-muted-foreground mb-4">
              Select a conversation from the list to start messaging
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm('')}
              disabled={!searchTerm}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

interface MessageThreadProps {
  conversationId: string;
  userId: string;
}

const MessageThread = ({ conversationId, userId }: MessageThreadProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipientInfo, setRecipientInfo] = useState<{full_name: string, avatar_url?: string} | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await messageService.getMessages(conversationId, userId);
        setMessages(data);
        
        // Get recipient info from the first message
        if (data.length > 0) {
          const firstMsg = data[0];
          const otherUserId = firstMsg.sender_id === userId ? firstMsg.receiver_id : firstMsg.sender_id;
          
          // Fetch user profile for the other party
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('id', otherUserId)
            .single();
          
          if (profile) {
            setRecipientInfo({
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url || undefined
            });
          } else {
            setRecipientInfo({
              full_name: 'Unknown User',
              avatar_url: undefined
            });
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // In a real implementation, we'd need to know the recipient_id
      // For now, we'll simulate sending a message
      console.log('Sending message:', newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b p-4 flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={recipientInfo?.avatar_url} alt={recipientInfo?.full_name} />
          <AvatarFallback>
            {recipientInfo?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{recipientInfo?.full_name || 'Unknown User'}</h3>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender_id === userId 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary'
                }`}
              >
                <p>{msg.message}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_id === userId 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}>
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" className="h-10">
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MessageInbox;