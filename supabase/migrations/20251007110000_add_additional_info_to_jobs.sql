-- Add additional_info column to jobs table for rich text content below warning alert
ALTER TABLE public.jobs
ADD COLUMN additional_info TEXT;