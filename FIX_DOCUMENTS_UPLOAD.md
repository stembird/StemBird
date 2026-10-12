# Fix Documents Upload Issue

## Problem
The `candidate_documents` table has VARCHAR(50) for `file_type` column, which is too small for long MIME types like:
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Solution
Run this SQL in your Supabase SQL Editor:

```sql
-- Fix column sizes in candidate_documents table
ALTER TABLE candidate_documents 
ALTER COLUMN file_type TYPE VARCHAR(255);

ALTER TABLE candidate_documents 
ALTER COLUMN document_type TYPE VARCHAR(100);
```

## Steps
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the SQL above
4. Click "Run"

## Verification
After running the migration, try uploading a document again. It should work without errors.

## What Changed
- `file_type` column increased from VARCHAR(50) to VARCHAR(255)
- `document_type` column increased from VARCHAR(50) to VARCHAR(100)
- Added cleanup logic to remove uploaded files if database insert fails
- Improved error messages for users
