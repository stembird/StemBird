-- Fix messages table to reference user_profiles instead of auth.users
-- First, drop the existing foreign key constraints to auth.users
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

-- Add foreign key constraints to user_profiles
ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
    ADD CONSTRAINT messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
