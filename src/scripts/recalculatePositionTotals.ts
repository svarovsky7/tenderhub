/**
 * Script to recalculate position totals in the database
 * This forces the recalculation of total_materials_cost and total_works_cost
 * for all positions in a tender, accounting for linked materials
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculatePositionTotals(tenderId?: string) {
  console.log('🚀 Starting position totals recalculation...');

  try {
    // Get all positions for the tender (or all if no tender specified)
    let query = supabase
      .from('client_positions')
      .select('id, work_name, tender_id');

    if (tenderId) {
      query = query.eq('tender_id', tenderId);
    }

    const { data: positions, error: posError } = await query;

    if (posError) {
      console.error('❌ Error fetching positions:', posError);
      return;
    }

    if (!positions || positions.length === 0) {
      console.log('No positions found');
      return;
    }

    console.log(`Found ${positions.length} positions to recalculate`);

    for (const position of positions) {
      console.log(`\n📊 Processing position: ${position.work_name}`);

      // Get all BOQ items for this position
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('*')
        .eq('client_position_id', position.id);

      if (boqError) {
        console.error(`❌ Error fetching BOQ items for position ${position.id}:`, boqError);
        continue;
      }

      if (!boqItems || boqItems.length === 0) {
        console.log(`  No BOQ items found, skipping`);
        continue;
      }

      // Trigger recalculation by updating a dummy field
      // This will fire the recalculate_position_totals_trigger
      const firstItem = boqItems[0];
      const { error: updateError } = await supabase
        .from('boq_items')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', firstItem.id);

      if (updateError) {
        console.error(`❌ Error triggering recalculation for position ${position.id}:`, updateError);
      } else {
        console.log(`  ✅ Triggered recalculation for position`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Position totals recalculation completed');

    // Verify the results
    if (tenderId) {
      const { data: updatedPositions, error: verifyError } = await supabase
        .from('client_positions')
        .select('work_name, total_materials_cost, total_works_cost')
        .eq('tender_id', tenderId);

      if (!verifyError && updatedPositions) {
        console.log('\n📊 Updated totals:');
        updatedPositions.forEach(pos => {
          const total = (parseFloat(pos.total_materials_cost) || 0) + (parseFloat(pos.total_works_cost) || 0);
          console.log(`  ${pos.work_name}: ${total.toLocaleString('ru-RU')} ₽`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
const tenderId = process.argv[2]; // Optional tender ID from command line
if (tenderId) {
  console.log(`Recalculating for tender: ${tenderId}`);
} else {
  console.log('Recalculating for all tenders (this may take a while)...');
}

recalculatePositionTotals(tenderId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });