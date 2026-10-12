import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function checkJob() {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, company, direct_apply, application_url, apply_email, apply_link')
    .ilike('title', '%PR Associate%');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Jobs found:', JSON.stringify(data, null, 2));
  }
}

checkJob();
