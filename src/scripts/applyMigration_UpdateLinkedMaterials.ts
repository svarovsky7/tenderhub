import { supabase } from '../lib/supabase/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Applies the migration to add trigger for updating linked materials when work quantity changes
 * This fixes the issue where collapsed position cards show outdated totals
 */
async function applyMigration() {
  console.log('🚀 Starting migration: update_linked_materials_on_work_change');

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '../../supabase/migrations/20251008_update_linked_materials_on_work_change.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL loaded');
    console.log('📊 Executing migration...');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️ RPC method not available, trying direct execution...');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await (supabase as any).rpc('query', {
            query: statement
          });

          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError);
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log('  - Added function: update_linked_materials_on_work_change()');
    console.log('  - Added trigger: update_linked_materials_trigger on boq_items');
    console.log('  - Now when work quantity changes, linked materials update automatically');
    console.log('');
    console.log('🎯 This fixes the issue where collapsed position cards show outdated totals.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('💡 Manual application required:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Copy content from: supabase/migrations/20251008_update_linked_materials_on_work_change.sql');
    console.log('3. Execute the SQL');
    process.exit(1);
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
