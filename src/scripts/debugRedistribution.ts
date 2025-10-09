/**
 * Скрипт для отладки перераспределения стоимостей
 *
 * Проверяет данные для выяснения причины ошибки "No target items found or total target works cost is zero"
 *
 * Usage: node src/scripts/debugRedistribution.ts <tenderId> <targetCategoryId1> [<targetCategoryId2> ...]
 */

import { supabase } from '../lib/supabase/client';

async function debugRedistribution(tenderId: string, targetCategories: string[]) {
  console.log('🔍 Debugging redistribution for tender:', tenderId);
  console.log('🎯 Target categories:', targetCategories);

  // Получить все BOQ элементы в целевых категориях
  const { data: targetItems, error } = await supabase
    .from('boq_items')
    .select('id, description, item_type, material_type, commercial_cost, total_amount, detail_cost_category_id')
    .eq('tender_id', tenderId)
    .in('detail_cost_category_id', targetCategories);

  if (error) {
    console.error('❌ Error fetching BOQ items:', error);
    return;
  }

  console.log('\n📊 Total items in target categories:', targetItems?.length || 0);

  if (!targetItems || targetItems.length === 0) {
    console.log('⚠️ No items found in target categories!');
    return;
  }

  // Фильтровать по commercial_cost > 0
  const itemsWithCost = targetItems.filter(item => (item.commercial_cost || 0) > 0);
  console.log('💰 Items with commercial_cost > 0:', itemsWithCost.length);

  if (itemsWithCost.length === 0) {
    console.log('⚠️ No items with commercial_cost > 0 in target categories!');
    return;
  }

  // Рассчитать work_portion для каждого элемента
  let totalWorkPortion = 0;
  console.log('\n📋 Items with work portions:');

  itemsWithCost.forEach(item => {
    let workPortion = 0;

    // Логика из calculate_work_portion
    if (item.item_type === 'work' || item.item_type === 'sub_work') {
      workPortion = item.commercial_cost || 0;
    } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
      if (item.material_type === 'main') {
        workPortion = (item.commercial_cost || 0) - (item.total_amount || 0);
      } else if (item.material_type === 'auxiliary') {
        workPortion = item.commercial_cost || 0;
      }
    }

    totalWorkPortion += workPortion;

    console.log(`  - ${item.description?.substring(0, 50)}...`);
    console.log(`    Type: ${item.item_type}, Material: ${item.material_type || 'N/A'}`);
    console.log(`    Commercial: ${item.commercial_cost}, Total: ${item.total_amount}`);
    console.log(`    Work Portion: ${workPortion}`);
  });

  console.log('\n✅ Total work portion:', totalWorkPortion);

  if (totalWorkPortion <= 0) {
    console.log('⚠️ Total work portion is zero or negative!');
    console.log('');
    console.log('Possible reasons:');
    console.log('1. All items are materials with main type where commercial_cost <= total_amount');
    console.log('2. All items have item_type not covered by calculate_work_portion function');
    console.log('3. Items have commercial_cost = 0');
  } else {
    console.log('✅ Redistribution should work! Total work portion is positive.');
  }
}

// Получить аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node src/scripts/debugRedistribution.ts <tenderId> <targetCategoryId1> [<targetCategoryId2> ...]');
  process.exit(1);
}

const [tenderId, ...targetCategories] = args;

debugRedistribution(tenderId, targetCategories)
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
