import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Get Supabase credentials from environment or use defaults
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lkmgbizyyaaacetllbzr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrbWdiaXp5eWFhYWNldGxsYnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMTU0MDcsImV4cCI6MjA2OTg5MTQwN30.4eG854js7UhMwL9izmGsv14V1_9zHwu5bHwclv-FmRA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Starting migration to add position totals trigger...');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20250125_add_position_totals_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (by semicolon followed by newline)
    const statements = migrationSQL
      .split(/;\s*\n/)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--')) continue;

      console.log(`\n📊 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 50)}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();

      if (error) {
        // Try direct execution if RPC doesn't work
        console.log('⚠️ RPC exec_sql failed, trying alternative method...');

        // For now, we'll need to execute these manually in Supabase Dashboard
        console.error('❌ Error executing statement:', error);
        console.log('\n📋 Please execute the following SQL manually in Supabase SQL Editor:');
        console.log('----------------------------------------');
        console.log(statement);
        console.log('----------------------------------------\n');
      } else {
        console.log('✅ Statement executed successfully');
      }
    }

    console.log('\n🎉 Migration process completed!');
    console.log('📌 Note: If some statements failed, please execute them manually in Supabase SQL Editor');

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();