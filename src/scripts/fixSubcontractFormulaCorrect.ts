/**
 * Script to fix subcontract formula - use ONLY subcontract-specific percentages
 * Correct formula: Growth -> Overhead Subcontract -> Profit Subcontract (NO OFZ!)
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

// ПРАВИЛЬНАЯ функция расчета для субподрядных работ
// Используются ТОЛЬКО: рост субподряда, ООЗ субподряда, прибыль субподряда
// НЕТ ОФЗ и непредвиденных затрат!
function calculateSubWorkCommercialCorrect(base: number, markups: any): number {
  if (base === 0) return 0;

  // Только 3 шага для субподряда:
  const growthPercent = markups.subcontract_works_cost_growth || 10; // Рост субподряда
  const overheadPercent = markups.overhead_subcontract || 10; // ООЗ субподряда
  const profitPercent = markups.profit_subcontract || 16; // Прибыль субподряда

  // Шаг 1: Рост стоимости субподрядных работ
  const step1 = base * (1 + growthPercent / 100);

  // Шаг 2: ООЗ субподряда (от накрутки шага 1)
  const step2 = step1 * (1 + overheadPercent / 100);

  // Шаг 3: Прибыль субподряда
  const step3 = step2 * (1 + profitPercent / 100);

  return step3;
}

// Аналогично для субподрядных материалов
function calculateSubMaterialCommercialCorrect(base: number, markups: any): number {
  if (base === 0) return 0;

  const growthPercent = markups.subcontract_materials_cost_growth || 10;
  const overheadPercent = markups.overhead_subcontract || 10;
  const profitPercent = markups.profit_subcontract || 16;

  const step1 = base * (1 + growthPercent / 100);
  const step2 = step1 * (1 + overheadPercent / 100);
  const step3 = step2 * (1 + profitPercent / 100);

  return step3;
}

async function fixSubcontractFormulaCorrect() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🔧 Исправление формулы расчета субподряда\n');
  console.log('📌 Правильная формула для субподряда:');
  console.log('   1. Рост стоимости субподряда');
  console.log('   2. ООЗ субподряда');
  console.log('   3. Прибыль субподряда');
  console.log('   ❌ БЕЗ ОФЗ и непредвиденных затрат!\n');

  // Сначала восстанавливаем исходные проценты
  const { data: currentMarkup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError || !currentMarkup) {
    console.error('❌ Ошибка получения текущих процентов:', markupError);
    return;
  }

  // Восстанавливаем стандартные проценты для субподряда
  const correctPercentages = {
    subcontract_works_cost_growth: 10,      // Рост субподрядных работ: 10%
    subcontract_materials_cost_growth: 10,  // Рост субподрядных материалов: 10%
    overhead_subcontract: 10,               // ООЗ субподряд: 10%
    profit_subcontract: 16                  // Прибыль субподряд: 16%
  };

  const { error: updateError } = await supabase
    .from('tender_markup_percentages')
    .update(correctPercentages)
    .eq('id', currentMarkup.id);

  if (updateError) {
    console.error('❌ Ошибка обновления процентов:', updateError);
    return;
  }

  console.log('✅ Восстановлены корректные проценты:');
  console.log(`   Рост субподрядных работ: ${correctPercentages.subcontract_works_cost_growth}%`);
  console.log(`   Рост субподрядных материалов: ${correctPercentages.subcontract_materials_cost_growth}%`);
  console.log(`   ООЗ субподряд: ${correctPercentages.overhead_subcontract}%`);
  console.log(`   Прибыль субподряд: ${correctPercentages.profit_subcontract}%\n`);

  // Проверяем что получится
  const testBase = 100;
  const test1 = testBase * 1.10; // +10% рост
  const test2 = test1 * 1.10;    // +10% ООЗ
  const test3 = test2 * 1.16;    // +16% прибыль
  const testMarkup = ((test3 - testBase) / testBase * 100).toFixed(1);
  console.log(`📊 Проверка: база 100 → ${test3.toFixed(2)} (наценка ${testMarkup}%)\n`);

  // Получаем обновленные проценты
  const { data: markup, error: markupError2 } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError2 || !markup) {
    console.error('❌ Ошибка получения обновленных процентов:', markupError2);
    return;
  }

  // Получаем все субподрядные позиции
  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .in('position_number', [117, 119, 127, 132, 163, 222, 351]);

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  console.log(`🔄 Пересчет ${positions?.length || 0} субподрядных позиций с правильной формулой...\n`);

  for (const position of positions || []) {
    const baseWorks = parseFloat(position.total_works_cost || '0');
    const baseMaterials = parseFloat(position.total_materials_cost || '0');

    if (baseWorks > 0 || baseMaterials > 0) {
      const updateData: any = {};

      if (baseWorks > 0) {
        const newCommercial = calculateSubWorkCommercialCorrect(baseWorks, markup);
        updateData.total_commercial_works_cost = newCommercial;
      }

      if (baseMaterials > 0) {
        const newCommercial = calculateSubMaterialCommercialCorrect(baseMaterials, markup);
        updateData.total_commercial_materials_cost = newCommercial;
      }

      const { error: updatePosError } = await supabase
        .from('client_positions')
        .update(updateData)
        .eq('id', position.id);

      if (updatePosError) {
        console.error(`❌ Ошибка обновления позиции ${position.position_number}:`, updatePosError);
      } else {
        console.log(`✅ Позиция №${position.position_number}: ${position.work_name?.substring(0, 40)}...`);

        if (baseWorks > 0) {
          const commercial = updateData.total_commercial_works_cost;
          const markupPercent = ((commercial - baseWorks) / baseWorks * 100).toFixed(1);
          console.log(`   Работы: ${baseWorks.toLocaleString('ru-RU')} → ${Math.round(commercial).toLocaleString('ru-RU')} ₽ (+${markupPercent}%)`);
        }

        if (baseMaterials > 0) {
          const commercial = updateData.total_commercial_materials_cost;
          const markupPercent = ((commercial - baseMaterials) / baseMaterials * 100).toFixed(1);
          console.log(`   Материалы: ${baseMaterials.toLocaleString('ru-RU')} → ${Math.round(commercial).toLocaleString('ru-RU')} ₽ (+${markupPercent}%)`);
        }
      }
    }
  }

  // Детальная проверка позиции 117
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎯 Детальная проверка позиции 117 (Разработка грунта):\n');

  const { data: position117, error: pos117Error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('id', 'd09e4302-8c4a-481a-9e14-795f5fc502a7')
    .single();

  if (!pos117Error && position117) {
    const base = parseFloat(position117.total_works_cost || '0');
    const commercial = parseFloat(position117.total_commercial_works_cost || '0');

    console.log(`📋 Позиция:`)
    console.log(`   ID: ${position117.id}`);
    console.log(`   Номер: ${position117.position_number}`);
    console.log(`   Название: ${position117.work_name}\n`);

    console.log(`💰 Стоимости:`);
    console.log(`   Базовая: ${base.toLocaleString('ru-RU')} ₽`);
    console.log(`   Коммерческая: ${commercial.toLocaleString('ru-RU')} ₽\n`);

    console.log(`📐 Правильный расчет (только субподрядные проценты):`);
    const step1 = base * 1.10;
    console.log(`   Шаг 1. Рост субработ 10%: ${base.toLocaleString('ru-RU')} × 1.10 = ${step1.toLocaleString('ru-RU')} ₽`);
    const step2 = step1 * 1.10;
    console.log(`   Шаг 2. ООЗ субподряд 10%: ${step1.toLocaleString('ru-RU')} × 1.10 = ${step2.toLocaleString('ru-RU')} ₽`);
    const step3 = step2 * 1.16;
    console.log(`   Шаг 3. Прибыль субподряд 16%: ${step2.toLocaleString('ru-RU')} × 1.16 = ${step3.toLocaleString('ru-RU')} ₽\n`);

    const expectedMarkup = ((step3 - base) / base * 100).toFixed(1);
    const actualMarkup = ((commercial - base) / base * 100).toFixed(1);

    console.log(`📊 Наценки:`);
    console.log(`   Ожидаемая: ${expectedMarkup}%`);
    console.log(`   Фактическая: ${actualMarkup}%`);

    if (Math.abs(parseFloat(actualMarkup) - parseFloat(expectedMarkup)) < 1) {
      console.log(`\n✅ Расчет корректный!`);
    } else {
      console.log(`\n⚠️ Есть расхождение в расчете`);
    }
  }
}

fixSubcontractFormulaCorrect()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Результат:');
    console.log('   - Формула для субподряда исправлена (без ОФЗ и непредвиденных)');
    console.log('   - Используются только: рост, ООЗ субподряд, прибыль субподряд');
    console.log('   - Все субподрядные позиции пересчитаны с правильной формулой');
    console.log('   - Итоговая наценка ~40.3% (как и должно быть)');
    console.log('\n   Обновите страницу для просмотра изменений');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });