-- Fix column sizes in candidate_documents table
-- The file_type field needs to be larger to accommodate long MIME types

ALTER TABLE candidate_documents 
ALTER COLUMN file_type TYPE VARCHAR(255);

-- Also increase document_type just to be safe
ALTER TABLE candidate_documents 
ALTER COLUMN document_type TYPE VARCHAR(100);

-- Add comment
COMMENT ON COLUMN candidate_documents.file_type IS 'MIME type of the file (e.g., application/vnd.openxmlformats-officedocument.wordprocessingml.document)';
