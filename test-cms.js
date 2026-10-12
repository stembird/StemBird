// Quick test to verify CMS setup
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qhfdjccudtqnlkbtsjgg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZmRqY2N1ZHRxbmxrYnRzamdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzYwOTcsImV4cCI6MjEwNzM1MjA5N30.JFdPkbqs4dPOahVmBSS8jGcAlHABrGJVeN4ezvquvLs'
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
