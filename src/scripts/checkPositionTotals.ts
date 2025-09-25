import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://lkmgbizyyaaacetllbzr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrbWdiaXp5eWFhYWNldGxsYnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMTU0MDcsImV4cCI6MjA2OTg5MTQwN30.4eG854js7UhMwL9izmGsv14V1_9zHwu5bHwclv-FmRA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPositionTotals() {
  console.log('🔍 Checking position totals for problematic position...\n');

  const positionId = '4d0f7d21-a38d-40f7-b9d4-58f8bdcdfb53';

  try {
    // Get position data
    const { data: position, error: posError } = await supabase
      .from('client_positions')
      .select('id, work_name, total_materials_cost, total_works_cost')
      .eq('id', positionId)
      .single();

    if (posError) {
      console.error('❌ Error fetching position:', posError);
      return;
    }

    console.log('📊 Current position data:');
    console.log('   ID:', position.id);
    console.log('   Name:', position.work_name);
    console.log('   Total materials cost in DB:', position.total_materials_cost);
    console.log('   Total works cost in DB:', position.total_works_cost);
    console.log('   Total in DB:', (parseFloat(position.total_materials_cost) + parseFloat(position.total_works_cost)));

    // Calculate actual totals from BOQ items
    const { data: boqItems, error: boqError } = await supabase
      .from('boq_items')
      .select('item_type, total_amount')
      .eq('client_position_id', positionId);

    if (boqError) {
      console.error('❌ Error fetching BOQ items:', boqError);
      return;
    }

    let actualMaterialsTotal = 0;
    let actualWorksTotal = 0;

    boqItems.forEach(item => {
      const amount = parseFloat(item.total_amount) || 0;
      if (item.item_type === 'material' || item.item_type === 'sub_material') {
        actualMaterialsTotal += amount;
      } else if (item.item_type === 'work' || item.item_type === 'sub_work') {
        actualWorksTotal += amount;
      }
    });

    console.log('\n✅ Actual totals from BOQ items:');
    console.log('   Materials total:', actualMaterialsTotal);
    console.log('   Works total:', actualWorksTotal);
    console.log('   Actual total:', actualMaterialsTotal + actualWorksTotal);

    console.log('\n⚠️ Discrepancy:');
    console.log('   Materials difference:', actualMaterialsTotal - parseFloat(position.total_materials_cost));
    console.log('   Works difference:', actualWorksTotal - parseFloat(position.total_works_cost));
    console.log('   Total difference:', (actualMaterialsTotal + actualWorksTotal) - (parseFloat(position.total_materials_cost) + parseFloat(position.total_works_cost)));

    if (Math.abs((actualMaterialsTotal + actualWorksTotal) - (parseFloat(position.total_materials_cost) + parseFloat(position.total_works_cost))) > 1) {
      console.log('\n❌ PROBLEM CONFIRMED: Database values are incorrect!');
      console.log('📋 Please execute the SQL migration in Supabase Dashboard to fix this.');
      console.log('   File: supabase/migrations/apply_now_position_totals_fix.sql');
    } else {
      console.log('\n✅ Values are correct!');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkPositionTotals();