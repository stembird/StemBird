// Quick test to verify CMS setup
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qxuvqrfqkdpfjfwkqatf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8'
);

async function test() {
  console.log('Testing CMS setup...\n');
  
  const { data, error } = await supabase
    .from('page_content')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  You need to run the migration first!');
    console.log('Go to Supabase Dashboard → SQL Editor');
    console.log('Run: supabase/migrations/20260210_create_page_content.sql');
  } else {
    console.log('✅ CMS is working!');
    console.log(`Found ${data.length} content items\n`);
    data.forEach(item => {
      console.log(`- ${item.page_slug} / ${item.section_key}`);
    });
  }
}

test();
