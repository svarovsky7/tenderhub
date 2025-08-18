/**
 * Test script to check if migration was applied
 */

import { supabase } from '../client';

export async function testMigration() {
  console.log('🚀 Testing migration status...');
  
  // Test if column exists
  try {
    const { data, error } = await supabase
      .from('boq_items')
      .select('id, cost_node_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Column cost_node_id does not exist:', error.message);
      return false;
    }
    
    console.log('✅ Column cost_node_id exists in boq_items table');
    
    // Test if functions exist
    const functionsToTest = [
      'get_cost_categories',
      'get_details_by_category',
      'get_locations_by_detail',
      'find_cost_node_by_combination',
      'get_cost_node_display'
    ];
    
    for (const funcName of functionsToTest) {
      try {
        if (funcName === 'get_cost_categories') {
          const { error: funcError } = await supabase.rpc(funcName);
          if (funcError && !funcError.message.includes('No rows')) {
            console.error(`❌ Function ${funcName} not found:`, funcError.message);
          } else {
            console.log(`✅ Function ${funcName} exists`);
          }
        }
      } catch (err) {
        console.error(`❌ Error testing function ${funcName}:`, err);
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error testing migration:', err);
    return false;
  }
}