// Check CV Templates in Database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function checkTemplates() {
  console.log('🔍 Checking CV Templates...\n');

  try {
    const { data, error } = await supabase
      .from('cv_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching templates:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No CV templates found in database!');
      console.log('\n📝 You need to apply the migration:');
      console.log('   supabase/migrations/20260309_add_classic_professional_cv_template.sql');
      return;
    }

    console.log(`✅ Found ${data.length} CV template(s):\n`);
    
    data.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Description: ${template.description}`);
      console.log(`   Premium: ${template.is_premium ? 'Yes' : 'No'}`);
      console.log(`   Active: ${template.is_active ? 'Yes' : 'No'}`);
      console.log(`   Has Sample Data: ${template.template_data?.sample ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check for Classic Professional specifically
    const classicTemplate = data.find(t => 
      t.name.toLowerCase().includes('classic') || 
      t.category === 'classic' ||
      t.category === 'classic-professional'
    );

    if (classicTemplate) {
      console.log('✅ Classic Professional template found!');
      console.log('   The new ClassicTemplate component will be used for this template.');
    } else {
      console.log('⚠️  Classic Professional template not found.');
      console.log('   Make sure the migration has been applied.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTemplates();
