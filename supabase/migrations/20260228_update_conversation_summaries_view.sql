-- Drop the existing conversation_summaries view
DROP VIEW IF EXISTS conversation_summaries;

-- Recreate the conversation_summaries view with user profile information
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    m.conversation_id,
    CASE 
        WHEN auth.uid() = m.sender_id THEN m.receiver_id
        WHEN auth.uid() = m.receiver_id THEN m.sender_id
    END AS other_party_id,
    MAX(m.created_at) as last_message_time,
    COUNT(*) as total_messages,
    SUM(CASE WHEN m.is_read = false AND m.receiver_id = auth.uid() THEN 1 ELSE 0 END) as unread_count,
    (SELECT message FROM messages m2 WHERE m2.conversation_id = m.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message,
    -- Join with user_profiles to get the other party's information
    (SELECT up.full_name FROM user_profiles up 
     WHERE up.id = CASE 
         WHEN auth.uid() = m.sender_id THEN m.receiver_id
         WHEN auth.uid() = m.receiver_id THEN m.sender_id
     END) AS other_party_name,
    (SELECT up.avatar_url FROM user_profiles up 
     WHERE up.id = CASE 
         WHEN auth.uid() = m.sender_id THEN m.receiver_id
         WHEN auth.uid() = m.receiver_id THEN m.sender_id
     END) AS other_party_avatar
FROM messages m
WHERE auth.uid() = m.sender_id OR auth.uid() = m.receiver_id
GROUP BY m.conversation_id, 
         CASE 
             WHEN auth.uid() = m.sender_id THEN m.receiver_id
             WHEN auth.uid() = m.receiver_id THEN m.sender_id
         END,
         other_party_name,
         other_party_avatar;