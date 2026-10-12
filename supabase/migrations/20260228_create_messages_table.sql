-- Create messages table for employer-candidate communication
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    conversation_id UUID DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    subject VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'message' CHECK (message_type IN ('message', 'notification', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages to other users" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at column
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create conversations view to get conversation summaries
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    conversation_id,
    CASE 
        WHEN auth.uid() = sender_id THEN receiver_id
        WHEN auth.uid() = receiver_id THEN sender_id
    END AS other_party_id,
    MAX(created_at) as last_message_time,
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_read = false AND receiver_id = auth.uid() THEN 1 ELSE 0 END) as unread_count,
    (SELECT message FROM messages m2 WHERE m2.conversation_id = messages.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message
FROM messages
WHERE auth.uid() = sender_id OR auth.uid() = receiver_id
GROUP BY conversation_id, other_party_id;