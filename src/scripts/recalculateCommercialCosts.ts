/**
 * Script to recalculate commercial costs for all positions with correct formula
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

// Функция расчета коммерческой стоимости материалов
function calculateCommercialMaterials(baseCost: number, markups: any): number {
  if (baseCost === 0) return 0;

  const mat1 = baseCost * (1 + markups.materials_cost_growth / 100);
  const mat2 = baseCost * (1 + markups.contingency_costs / 100);
  const mat3 = (mat1 + mat2 - baseCost) * (1 + markups.overhead_own_forces / 100);
  const mat4 = mat3 * (1 + markups.general_costs_without_subcontract / 100);
  const mat5 = mat4 * (1 + markups.profit_own_forces / 100);

  return mat5;
}

// Функция расчета коммерческой стоимости работ
function calculateCommercialWorks(baseCost: number, markups: any): number {
  if (baseCost === 0) return 0;

  const work1 = baseCost * (1 + markups.works_16_markup / 100);
  const work2 = work1 * (1 + markups.works_cost_growth / 100);
  const work3 = baseCost * (1 + markups.contingency_costs / 100);
  const work4 = (work2 + work3 - baseCost) * (1 + markups.overhead_own_forces / 100);
  const work5 = work4 * (1 + markups.general_costs_without_subcontract / 100);
  const work6 = work5 * (1 + markups.profit_own_forces / 100);

  return work6;
}

// Функция расчета коммерческой стоимости субматериалов
function calculateCommercialSubmaterials(baseCost: number, markups: any): number {
  if (baseCost === 0) return 0;

  const submat1 = baseCost * (1 + markups.subcontract_materials_cost_growth / 100);
  const submat2 = submat1 * (1 + markups.overhead_subcontract / 100);
  const submat3 = submat2 * (1 + markups.profit_subcontract / 100);

  return submat3;
}

// Функция расчета коммерческой стоимости субработ
function calculateCommercialSubworks(baseCost: number, markups: any): number {
  if (baseCost === 0) return 0;

  const subwork1 = baseCost * (1 + markups.subcontract_works_cost_growth / 100);
  const subwork2 = subwork1 * (1 + markups.overhead_subcontract / 100);
  const subwork3 = subwork2 * (1 + markups.profit_subcontract / 100);

  return subwork3;
}

async function recalculateCommercialCosts() {
  console.log('🔄 Пересчет коммерческих стоимостей для всех позиций...\n');

  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  // Получаем проценты накруток
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ Ошибка получения процентов накруток:', markupError);
    return;
  }

  console.log('📊 Проценты накруток:');
  console.log(`   Работы 1.6: ${markup.works_16_markup}%`);
  console.log(`   Рост работ: ${markup.works_cost_growth}%`);
  console.log(`   Рост материалов: ${markup.materials_cost_growth}%`);
  console.log(`   Рост субработ: ${markup.subcontract_works_cost_growth}%`);
  console.log(`   Рост субматериалов: ${markup.subcontract_materials_cost_growth}%`);
  console.log(`   Непредвиденные: ${markup.contingency_costs}%`);
  console.log(`   ООЗ собств.: ${markup.overhead_own_forces}%`);
  console.log(`   ООЗ субподряд: ${markup.overhead_subcontract}%`);
  console.log(`   ОФЗ: ${markup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль собств.: ${markup.profit_own_forces}%`);
  console.log(`   Прибыль субподряд: ${markup.profit_subcontract}%\n`);

  // Получаем все позиции с базовыми и коммерческими стоимостями из commercial_costs_by_category
  const { data: categories, error: catError } = await supabase
    .from('commercial_costs_by_category')
    .select('*')
    .eq('tender_id', tenderId);

  if (catError) {
    console.error('❌ Ошибка получения категорий затрат:', catError);
    return;
  }

  console.log(`📋 Найдено ${categories?.length || 0} категорий затрат для пересчета\n`);

  // Получаем все позиции
  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .order('position_number');

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  console.log(`📋 Найдено ${positions?.length || 0} позиций для пересчета\n`);

  let totalBaseMaterials = 0;
  let totalBaseWorks = 0;
  let totalCommercialMaterials = 0;
  let totalCommercialWorks = 0;
  let updatedCount = 0;

  // Пересчитываем для каждой позиции
  for (const position of positions || []) {
    const baseMaterials = parseFloat(position.total_materials_cost || '0');
    const baseWorks = parseFloat(position.total_works_cost || '0');

    if (baseMaterials > 0 || baseWorks > 0) {
      // Разделяем на прямые и субподрядные затраты
      // Для упрощения считаем, что если позиция содержит "субподряд" в названии, то это субподряд
      const isSubcontract = position.work_name?.toLowerCase().includes('субподряд') || false;

      let commercialMaterials = 0;
      let commercialWorks = 0;

      if (isSubcontract) {
        commercialMaterials = calculateCommercialSubmaterials(baseMaterials, markup);
        commercialWorks = calculateCommercialSubworks(baseWorks, markup);
      } else {
        commercialMaterials = calculateCommercialMaterials(baseMaterials, markup);
        commercialWorks = calculateCommercialWorks(baseWorks, markup);
      }

      // Обновляем в базе данных
      const { error: updateError } = await supabase
        .from('client_positions')
        .update({
          total_commercial_materials_cost: commercialMaterials,
          total_commercial_works_cost: commercialWorks
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`❌ Ошибка обновления позиции ${position.position_number}:`, updateError);
      } else {
        if (position.position_number <= 20 || position.position_number % 50 === 0) {
          console.log(`✅ Позиция ${position.position_number}: ${position.work_name?.substring(0, 40)}...`);
          console.log(`   База: М=${baseMaterials.toLocaleString('ru-RU')} Р=${baseWorks.toLocaleString('ru-RU')}`);
          console.log(`   КП: М=${Math.round(commercialMaterials).toLocaleString('ru-RU')} Р=${Math.round(commercialWorks).toLocaleString('ru-RU')}\n`);
        }
        updatedCount++;

        totalBaseMaterials += baseMaterials;
        totalBaseWorks += baseWorks;
        totalCommercialMaterials += commercialMaterials;
        totalCommercialWorks += commercialWorks;
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Обновлено ${updatedCount} позиций\n`);

  console.log('📊 ИТОГОВЫЕ СУММЫ:');
  console.log('   Базовые стоимости (ПЗ):');
  console.log(`      Материалы: ${Math.round(totalBaseMaterials).toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы: ${Math.round(totalBaseWorks).toLocaleString('ru-RU')} ₽`);
  console.log(`      ИТОГО: ${Math.round(totalBaseMaterials + totalBaseWorks).toLocaleString('ru-RU')} ₽\n`);

  console.log('   Коммерческие стоимости (КП):');
  console.log(`      Материалы: ${Math.round(totalCommercialMaterials).toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы: ${Math.round(totalCommercialWorks).toLocaleString('ru-RU')} ₽`);
  console.log(`      ИТОГО: ${Math.round(totalCommercialMaterials + totalCommercialWorks).toLocaleString('ru-RU')} ₽\n`);

  const totalMarkup = ((totalCommercialMaterials + totalCommercialWorks) - (totalBaseMaterials + totalBaseWorks)) / (totalBaseMaterials + totalBaseWorks) * 100;
  console.log(`   Общая наценка: ${totalMarkup.toFixed(1)}%`);

  // Обновляем также базу commercial_costs_by_category
  console.log('\n🔄 Обновление таблицы commercial_costs_by_category...');

  for (const category of categories || []) {
    const baseMaterials = parseFloat(category.total_materials_cost || '0');
    const baseWorks = parseFloat(category.total_works_cost || '0');
    const baseSubmaterials = parseFloat(category.total_submaterials_cost || '0');
    const baseSubworks = parseFloat(category.total_subworks_cost || '0');

    const commercialMaterials = calculateCommercialMaterials(baseMaterials, markup);
    const commercialWorks = calculateCommercialWorks(baseWorks, markup);
    const commercialSubmaterials = calculateCommercialSubmaterials(baseSubmaterials, markup);
    const commercialSubworks = calculateCommercialSubworks(baseSubworks, markup);

    const { error: updateCatError } = await supabase
      .from('commercial_costs_by_category')
      .update({
        total_commercial_materials_cost: commercialMaterials,
        total_commercial_works_cost: commercialWorks,
        total_commercial_submaterials_cost: commercialSubmaterials,
        total_commercial_subworks_cost: commercialSubworks
      })
      .eq('id', category.id);

    if (updateCatError) {
      console.error(`❌ Ошибка обновления категории ${category.detail_category_name}:`, updateCatError);
    }
  }

  console.log('✅ Таблица commercial_costs_by_category обновлена');
}

// Запуск скрипта
recalculateCommercialCosts()
  .then(() => {
    console.log('\n✅ Пересчет завершен успешно');
    console.log('📌 Теперь стоимости должны совпадать на страницах:');
    console.log('   - Финансовые показатели');
    console.log('   - Коммерческие стоимости');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });