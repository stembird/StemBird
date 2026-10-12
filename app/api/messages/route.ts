import { NextRequest } from 'next/server';
import { messageService } from '@/lib/messages';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let data;
    if (conversationId) {
      // Get messages for a specific conversation
      data = await messageService.getMessages(conversationId, userId);
    } else {
      // Get conversation summaries for the user
      data = await messageService.getConversations(userId);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch messages' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender_id, receiver_id, message, subject, conversation_id } = body;

    if (!sender_id || !receiver_id || !message) {
      return new Response(
        JSON.stringify({ error: 'sender_id, receiver_id, and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newMessage = await messageService.sendMessage({
      sender_id,
      receiver_id,
      message,
      subject: subject || '',
      conversation_id
    });

    return new Response(JSON.stringify(newMessage), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageIds, userId } = body;

    if (!messageIds || !userId) {
      return new Response(
        JSON.stringify({ error: 'messageIds and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await messageService.markAsRead(messageIds, userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to mark messages as read' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}