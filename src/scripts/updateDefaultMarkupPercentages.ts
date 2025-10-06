/**
 * Script to update existing markup percentages to new default values
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

async function updateDefaultPercentages() {
  console.log('🔄 Updating existing markup percentages to new defaults...');

  // Получаем все записи
  const { data: markups, error: fetchError } = await supabase
    .from('tender_markup_percentages')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching markups:', fetchError);
    return;
  }

  console.log('📊 Found', markups?.length || 0, 'markup records');

  // Новые значения по умолчанию
  const newDefaults = {
    works_16_markup: 60,                          // Работы 1,6 - 60%
    works_cost_growth: 10.00,                     // Рост стоимости работ - 10%
    materials_cost_growth: 10.00,                 // Рост стоимости материалов - 10%
    subcontract_works_cost_growth: 10.00,         // Рост стоимости работ субподряда - 10%
    subcontract_materials_cost_growth: 10.00,     // Рост стоимости материалов субподряда - 10%
    contingency_costs: 3.00,                      // Непредвиденные затраты - 3%
    overhead_own_forces: 10.00,                   // ООЗ собств. силы - 10%
    overhead_subcontract: 10.00,                  // ООЗ субподряд - 10%
    general_costs_without_subcontract: 20.00,     // ОФЗ (без субподряда) - 20%
    profit_own_forces: 10.00,                     // Прибыль собств. силы - 10%
    profit_subcontract: 16.00                     // Прибыль субподряд - 16%
  };

  let updatedCount = 0;

  for (const markup of markups || []) {
    // Проверяем, нужно ли обновление (если значения равны старым значениям по умолчанию или 0)
    const needsUpdate =
      markup.works_16_markup === 160 || markup.works_16_markup === 0 ||
      markup.works_cost_growth === 5 || markup.works_cost_growth === 0 ||
      markup.materials_cost_growth === 3 || markup.materials_cost_growth === 0 ||
      markup.subcontract_works_cost_growth === 7 || markup.subcontract_works_cost_growth === 0 ||
      markup.subcontract_materials_cost_growth === 4 || markup.subcontract_materials_cost_growth === 0 ||
      markup.contingency_costs === 2 || markup.contingency_costs === 0 ||
      markup.overhead_own_forces === 8 || markup.overhead_own_forces === 0 ||
      markup.overhead_subcontract === 6 || markup.overhead_subcontract === 0 ||
      markup.general_costs_without_subcontract === 5 || markup.general_costs_without_subcontract === 0 ||
      markup.profit_own_forces === 12 || markup.profit_own_forces === 0 ||
      markup.profit_subcontract === 8 || markup.profit_subcontract === 0;

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('tender_markup_percentages')
        .update(newDefaults)
        .eq('id', markup.id);

      if (updateError) {
        console.error('❌ Error updating markup', markup.id, ':', updateError);
      } else {
        console.log('✅ Updated markup for tender:', markup.tender_id);
        updatedCount++;
      }
    } else {
      console.log('⏭️  Skipping markup for tender', markup.tender_id, '- already has custom values');
    }
  }

  console.log('✨ Updated', updatedCount, 'records with new default percentages');
  console.log('📌 New tenders will automatically use these default values');
}

// Run the script
updateDefaultPercentages()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });