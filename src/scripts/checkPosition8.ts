/**
 * Script to check position 8 calculation details
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

async function checkPosition8() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694';

  // Get position 8 details
  const { data: position, error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('position_number', 8)
    .single();

  if (error) {
    console.error('❌ Error fetching position:', error);
    return;
  }

  console.log('\n📋 Позиция 8: Кладочные планы. Разрезы. Лестницы. Подземная часть');
  console.log('═════════════════════════════════════════════════════════════════');

  console.log('\n🔹 Базовые стоимости:');
  console.log(`   Материалы ПЗ: ${position.total_materials_cost?.toLocaleString('ru-RU') || 0} ₽`);
  console.log(`   Работы ПЗ: ${position.total_works_cost?.toLocaleString('ru-RU') || 0} ₽`);
  console.log(`   ИТОГО ПЗ: ${((position.total_materials_cost || 0) + (position.total_works_cost || 0)).toLocaleString('ru-RU')} ₽`);

  console.log('\n🔹 Коммерческие стоимости (в БД):');
  console.log(`   Материалы КП: ${position.total_commercial_materials_cost?.toLocaleString('ru-RU') || 0} ₽`);
  console.log(`   Работы КП: ${position.total_commercial_works_cost?.toLocaleString('ru-RU') || 0} ₽`);
  console.log(`   ИТОГО КП: ${((position.total_commercial_materials_cost || 0) + (position.total_commercial_works_cost || 0)).toLocaleString('ru-RU')} ₽`);

  // Get markup percentages
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ Error fetching markup:', markupError);
    return;
  }

  console.log('\n📊 Проценты накруток:');
  console.log(`   Работы 1.6: ${markup.works_16_markup}%`);
  console.log(`   Рост стоимости работ: ${markup.works_cost_growth}%`);
  console.log(`   Рост стоимости материалов: ${markup.materials_cost_growth}%`);
  console.log(`   Непредвиденные затраты: ${markup.contingency_costs}%`);
  console.log(`   ООЗ собств. силы: ${markup.overhead_own_forces}%`);
  console.log(`   ОФЗ (без субподряда): ${markup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль собств. силы: ${markup.profit_own_forces}%`);

  // Calculate commercial cost using the formula from TenderCommercialManager
  const baseMaterials = position.total_materials_cost || 0;
  const baseWorks = position.total_works_cost || 0;

  console.log('\n📐 Расчет коммерческой стоимости МАТЕРИАЛОВ:');

  // Materials calculation
  const mat1 = baseMaterials * (1 + markup.materials_cost_growth / 100);
  console.log(`   1. Материалы РОСТ = ${baseMaterials.toLocaleString('ru-RU')} × ${(1 + markup.materials_cost_growth / 100).toFixed(2)} = ${mat1.toLocaleString('ru-RU')} ₽`);

  const mat2 = baseMaterials * (1 + markup.contingency_costs / 100);
  console.log(`   2. Непредвиденные мат = ${baseMaterials.toLocaleString('ru-RU')} × ${(1 + markup.contingency_costs / 100).toFixed(2)} = ${mat2.toLocaleString('ru-RU')} ₽`);

  const mat3 = (mat1 + mat2 - baseMaterials) * (1 + markup.overhead_own_forces / 100);
  console.log(`   3. ООЗ мат = (${mat1.toLocaleString('ru-RU')} + ${mat2.toLocaleString('ru-RU')} - ${baseMaterials.toLocaleString('ru-RU')}) × ${(1 + markup.overhead_own_forces / 100).toFixed(2)} = ${mat3.toLocaleString('ru-RU')} ₽`);

  const mat4 = mat3 * (1 + markup.general_costs_without_subcontract / 100);
  console.log(`   4. ОФЗ мат = ${mat3.toLocaleString('ru-RU')} × ${(1 + markup.general_costs_without_subcontract / 100).toFixed(2)} = ${mat4.toLocaleString('ru-RU')} ₽`);

  const mat5 = mat4 * (1 + markup.profit_own_forces / 100);
  console.log(`   5. Прибыль мат = ${mat4.toLocaleString('ru-RU')} × ${(1 + markup.profit_own_forces / 100).toFixed(2)} = ${mat5.toLocaleString('ru-RU')} ₽`);

  console.log(`   📍 ИТОГО материалы КП: ${mat5.toLocaleString('ru-RU')} ₽`);

  console.log('\n📐 Расчет коммерческой стоимости РАБОТ:');

  // Works calculation - more complex with works_16_markup
  const work1 = baseWorks * (1 + markup.works_16_markup / 100);
  console.log(`   1. Работы 1.6 = ${baseWorks.toLocaleString('ru-RU')} × ${(1 + markup.works_16_markup / 100).toFixed(2)} = ${work1.toLocaleString('ru-RU')} ₽`);

  const work2 = work1 * (1 + markup.works_cost_growth / 100);
  console.log(`   2. Работы РОСТ = ${work1.toLocaleString('ru-RU')} × ${(1 + markup.works_cost_growth / 100).toFixed(2)} = ${work2.toLocaleString('ru-RU')} ₽`);

  const work3 = baseWorks * (1 + markup.contingency_costs / 100);
  console.log(`   3. Непредвиденные раб = ${baseWorks.toLocaleString('ru-RU')} × ${(1 + markup.contingency_costs / 100).toFixed(2)} = ${work3.toLocaleString('ru-RU')} ₽`);

  const work4 = (work2 + work3 - baseWorks) * (1 + markup.overhead_own_forces / 100);
  console.log(`   4. ООЗ раб = (${work2.toLocaleString('ru-RU')} + ${work3.toLocaleString('ru-RU')} - ${baseWorks.toLocaleString('ru-RU')}) × ${(1 + markup.overhead_own_forces / 100).toFixed(2)} = ${work4.toLocaleString('ru-RU')} ₽`);

  const work5 = work4 * (1 + markup.general_costs_without_subcontract / 100);
  console.log(`   5. ОФЗ раб = ${work4.toLocaleString('ru-RU')} × ${(1 + markup.general_costs_without_subcontract / 100).toFixed(2)} = ${work5.toLocaleString('ru-RU')} ₽`);

  const work6 = work5 * (1 + markup.profit_own_forces / 100);
  console.log(`   6. Прибыль раб = ${work5.toLocaleString('ru-RU')} × ${(1 + markup.profit_own_forces / 100).toFixed(2)} = ${work6.toLocaleString('ru-RU')} ₽`);

  console.log(`   📍 ИТОГО работы КП: ${work6.toLocaleString('ru-RU')} ₽`);

  console.log('\n🎯 ИТОГОВАЯ КОММЕРЧЕСКАЯ СТОИМОСТЬ:');
  const totalCommercial = mat5 + work6;
  console.log(`   Материалы КП: ${mat5.toLocaleString('ru-RU')} ₽`);
  console.log(`   Работы КП: ${work6.toLocaleString('ru-RU')} ₽`);
  console.log(`   ═══════════════════════════════════`);
  console.log(`   ВСЕГО КП: ${totalCommercial.toLocaleString('ru-RU')} ₽`);

  const markup_percent = ((totalCommercial - (baseMaterials + baseWorks)) / (baseMaterials + baseWorks) * 100).toFixed(1);
  console.log(`   Наценка: ${markup_percent}%`);
}

// Run the script
checkPosition8()
  .then(() => {
    console.log('\n✅ Анализ завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });