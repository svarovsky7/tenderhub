/**
 * Script to fix incorrect commercial costs in client_positions
 * Resets astronomical values and triggers recalculation
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCommercialCosts() {
  console.log('🔄 Fixing commercial costs in client_positions...');

  // First, let's check current values for the tender
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  // Get positions with problematic commercial costs
  const { data: positions, error: fetchError } = await supabase
    .from('client_positions')
    .select('id, position_number, total_commercial_materials_cost, total_commercial_works_cost')
    .eq('tender_id', tenderId);

  if (fetchError) {
    console.error('❌ Error fetching positions:', fetchError);
    return;
  }

  console.log('📊 Found', positions?.length || 0, 'positions');

  let fixedCount = 0;
  const threshold = 1000000000; // 1 billion - anything above this is clearly wrong

  for (const position of positions || []) {
    const materialsCost = parseFloat(position.total_commercial_materials_cost || '0');
    const worksCost = parseFloat(position.total_commercial_works_cost || '0');

    // Check if values are unreasonably high
    if (materialsCost > threshold || worksCost > threshold) {
      console.log(`🔧 Fixing position ${position.position_number}:`);
      console.log(`  - Materials: ${materialsCost.toExponential(2)} -> 0`);
      console.log(`  - Works: ${worksCost.toExponential(2)} -> 0`);

      // Reset to zero
      const { error: updateError } = await supabase
        .from('client_positions')
        .update({
          total_commercial_materials_cost: 0,
          total_commercial_works_cost: 0
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`❌ Error updating position ${position.id}:`, updateError);
      } else {
        fixedCount++;
      }
    }
  }

  console.log(`✅ Fixed ${fixedCount} positions with incorrect commercial costs`);

  // Now reset ALL commercial costs for this tender to ensure clean state
  console.log('🔄 Resetting all commercial costs for tender to ensure clean recalculation...');

  const { error: resetError } = await supabase
    .from('client_positions')
    .update({
      total_commercial_materials_cost: 0,
      total_commercial_works_cost: 0
    })
    .eq('tender_id', tenderId);

  if (resetError) {
    console.error('❌ Error resetting all commercial costs:', resetError);
  } else {
    console.log('✅ All commercial costs reset to 0 for clean recalculation');
  }

  console.log('\n📌 Next steps:');
  console.log('1. Go to the Commercial Costs page for this tender');
  console.log('2. Click "Обновить расчет" to recalculate with correct formulas');
  console.log('3. The values should now match between Financial Indicators and Commercial Costs pages');
}

// Run the script
fixCommercialCosts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });