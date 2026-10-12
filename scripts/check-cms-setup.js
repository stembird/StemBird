/**
 * CMS Setup Checker
 * Run this script to verify your CMS is set up correctly
 * 
 * Usage: node scripts/check-cms-setup.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetup() {
  console.log('🔍 Checking CMS Setup...\n');

  // Check 1: Table exists
  console.log('1️⃣  Checking if page_content table exists...');
  const { data: tableData, error: tableError } = await supabase
    .from('page_content')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Table does not exist or cannot be accessed');
    console.error('   Error:', tableError.message);
    console.log('\n📝 Action Required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run the migration from: supabase/migrations/20260210_create_page_content.sql');
    return false;
  }
  console.log('✅ Table exists and is accessible\n');

  // Check 2: Default content exists
  console.log('2️⃣  Checking if default content was inserted...');
  const { data: contentData, error: contentError } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_slug', 'home');

  if (contentError || !contentData || contentData.length === 0) {
    console.log('⚠️  No default content found');
    console.log('   This is okay if you plan to add content manually');
  } else {
    console.log(`✅ Found ${contentData.length} content sections for homepage`);
    console.log('   Sample sections:');
    contentData.slice(0, 3).forEach(item => {
      console.log(`   - ${item.section_key}: "${item.content_value.substring(0, 50)}..."`);
    });
  }
  console.log('');

  // Check 3: RLS policies
  console.log('3️⃣  Checking Row Level Security policies...');
  const { data: readTest, error: readError } = await supabase
    .from('page_content')
    .select('*')
    .limit(1);

  if (readError) {
    console.error('❌ Cannot read from table (RLS issue)');
    console.error('   Error:', readError.message);
    return false;
  }
  console.log('✅ Public read access is working\n');

  // Check 4: Write access (requires auth)
  console.log('4️⃣  Checking write permissions...');
  console.log('   Note: Write access requires authentication');
  console.log('   This will be tested when you log in to /dashboard/content-editor\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CMS Setup Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Next Steps:');
  console.log('   1. Start your dev server: npm run dev');
  console.log('   2. Navigate to: http://localhost:3000/dashboard/content-editor');
  console.log('   3. Log in with your admin account');
  console.log('   4. Start editing content!\n');

  console.log('📚 Documentation:');
  console.log('   - Quick Start: CMS_SETUP_README.md');
  console.log('   - Full Guide: CONTENT_MANAGEMENT_GUIDE.md');
  console.log('   - Architecture: CMS_ARCHITECTURE.md\n');

  return true;
}

checkSetup()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
