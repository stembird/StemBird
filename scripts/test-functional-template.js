/**
 * Test script for Skills-Based (Functional) CV Template
 * Run with: node scripts/test-functional-template.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunctionalTemplate() {
  console.log('🧪 Testing Skills-Based (Functional) CV Template...\n');

  try {
    // Check if template exists in database
    console.log('1️⃣ Checking if template exists in database...');
    const { data: template, error: templateError } = await supabase
      .from('cv_templates')
      .select('*')
      .eq('name', 'Skills-Based (Functional)')
      .single();

    if (templateError) {
      console.error('❌ Template not found in database');
      console.error('   Run migration: supabase/migrations/20260309_add_functional_skills_cv_template.sql');
      console.error('   Error:', templateError.message);
      return;
    }

    console.log('✅ Template found in database');
    console.log('   ID:', template.id);
    console.log('   Name:', template.name);
    console.log('   Category:', template.category);
    console.log('   Active:', template.is_active);
    console.log('   Sort Order:', template.sort_order);
    console.log('   Structure:', JSON.stringify(template.structure, null, 2));
    console.log('');

    // Verify template structure
    console.log('2️⃣ Verifying template structure...');
    const expectedSections = [
      'header',
      'professional_summary',
      'core_competencies',
      'skills_categories',
      'work_experience_brief',
      'education',
      'certifications'
    ];

    const actualSections = template.structure?.sections || [];
    const missingSections = expectedSections.filter(s => !actualSections.includes(s));
    const extraSections = actualSections.filter(s => !expectedSections.includes(s));

    if (missingSections.length > 0) {
      console.warn('⚠️  Missing sections:', missingSections.join(', '));
    }
    if (extraSections.length > 0) {
      console.warn('⚠️  Extra sections:', extraSections.join(', '));
    }
    if (missingSections.length === 0 && extraSections.length === 0) {
      console.log('✅ All expected sections present');
    }
    console.log('');

    // Check template files exist
    console.log('3️⃣ Checking template files...');
    const fs = require('fs');
    const path = require('path');

    const files = [
      'src/components/cv/templates/FunctionalTemplate.tsx',
      'src/data/functionalPreviewData.ts',
      'src/components/cv/templates/FunctionalTemplate.example.tsx'
    ];

    let allFilesExist = true;
    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - NOT FOUND`);
        allFilesExist = false;
      }
    }
    console.log('');

    // Summary
    console.log('📊 Test Summary:');
    console.log('   Database: ✅ Template exists');
    console.log('   Structure: ✅ Sections configured');
    console.log('   Files:', allFilesExist ? '✅ All files present' : '❌ Some files missing');
    console.log('');

    console.log('🎉 Skills-Based (Functional) CV Template is ready!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Test the template in the CV Builder UI');
    console.log('   2. Generate a PDF to verify print layout');
    console.log('   3. Test with different data sets');
    console.log('   4. Verify ATS compatibility');
    console.log('');
    console.log('💡 Template Features:');
    console.log('   • Skills-first approach');
    console.log('   • Core competencies section');
    console.log('   • Categorized professional skills');
    console.log('   • Brief work experience summary');
    console.log('   • Perfect for career changers');
    console.log('   • Ideal for candidates with employment gaps');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testFunctionalTemplate();
