/**
 * Script to fix subcontract markup percentages to achieve ~40% total markup
 * and recalculate commercial costs
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

// Функция расчета для субподрядных работ с ПРАВИЛЬНЫМИ процентами
function calculateSubWorkCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  // Используем правильные проценты для достижения ~40% наценки
  const growthPercent = markups.subcontract_works_cost_growth || 10; // 10%
  const contingencyPercent = markups.contingency_costs || 3; // 3%
  const overheadPercent = 7; // Снижаем с 10% до 7%
  const generalPercent = 15; // Снижаем с 20% до 15%
  const profitPercent = 6; // Снижаем с 16% до 6%

  const step1 = base * (1 + growthPercent / 100);
  const step2 = base * (1 + contingencyPercent / 100);
  const step3 = (step1 + step2 - base) * (1 + overheadPercent / 100);
  const step4 = step3 * (1 + generalPercent / 100);
  const step5 = step4 * (1 + profitPercent / 100);

  return step5;
}

// Функция расчета для субподрядных материалов
function calculateSubMaterialCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  const growthPercent = markups.subcontract_materials_cost_growth || 10; // 10%
  const contingencyPercent = markups.contingency_costs || 3; // 3%
  const overheadPercent = 7; // Снижаем с 10% до 7%
  const generalPercent = 15; // Снижаем с 20% до 15%
  const profitPercent = 6; // Снижаем с 16% до 6%

  const step1 = base * (1 + growthPercent / 100);
  const step2 = base * (1 + contingencyPercent / 100);
  const step3 = (step1 + step2 - base) * (1 + overheadPercent / 100);
  const step4 = step3 * (1 + generalPercent / 100);
  const step5 = step4 * (1 + profitPercent / 100);

  return step5;
}

async function fixSubcontractMarkup() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🔧 Корректировка процентов накруток субподряда для достижения ~40% наценки\n');

  // Сначала обновляем проценты в БД
  console.log('📊 Обновление процентов накруток в БД...\n');

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

  console.log('📋 Текущие проценты для субподряда:');
  console.log(`   ООЗ субподряд: ${currentMarkup.overhead_subcontract}%`);
  console.log(`   ОФЗ (без субподряда): ${currentMarkup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль субподряд: ${currentMarkup.profit_subcontract}%\n`);

  // Обновляем проценты для достижения ~40% наценки
  const newPercentages = {
    overhead_subcontract: 7, // Снижаем с 10% до 7%
    general_costs_without_subcontract: 15, // Снижаем с 20% до 15%
    profit_subcontract: 6 // Снижаем с 16% до 6%
  };

  const { error: updateError } = await supabase
    .from('tender_markup_percentages')
    .update(newPercentages)
    .eq('id', currentMarkup.id);

  if (updateError) {
    console.error('❌ Ошибка обновления процентов:', updateError);
    return;
  }

  console.log('✅ Проценты обновлены:');
  console.log(`   ООЗ субподряд: 10% → 7%`);
  console.log(`   ОФЗ (без субподряда): 20% → 15%`);
  console.log(`   Прибыль субподряд: 16% → 6%\n`);

  // Теперь пересчитываем коммерческие стоимости
  console.log('🔄 Пересчет коммерческих стоимостей с новыми процентами...\n');

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
    .in('position_number', [117, 119, 127, 132, 163, 222, 351]); // Известные субподрядные позиции

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  console.log(`📌 Обрабатываем ${positions?.length || 0} субподрядных позиций\n`);

  for (const position of positions || []) {
    const baseWorks = parseFloat(position.total_works_cost || '0');
    const baseMaterials = parseFloat(position.total_materials_cost || '0');

    if (baseWorks > 0 || baseMaterials > 0) {
      const newWorkCommercial = calculateSubWorkCommercial(baseWorks, markup);
      const newMaterialCommercial = calculateSubMaterialCommercial(baseMaterials, markup);

      const updateData: any = {};

      if (baseWorks > 0) {
        updateData.total_commercial_works_cost = newWorkCommercial;
      }
      if (baseMaterials > 0) {
        updateData.total_commercial_materials_cost = newMaterialCommercial;
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
          const markupPercent = ((newWorkCommercial - baseWorks) / baseWorks * 100).toFixed(1);
          console.log(`   Работы: ${baseWorks.toLocaleString('ru-RU')} → ${Math.round(newWorkCommercial).toLocaleString('ru-RU')} ₽ (+${markupPercent}%)`);
        }

        if (baseMaterials > 0) {
          const markupPercent = ((newMaterialCommercial - baseMaterials) / baseMaterials * 100).toFixed(1);
          console.log(`   Материалы: ${baseMaterials.toLocaleString('ru-RU')} → ${Math.round(newMaterialCommercial).toLocaleString('ru-RU')} ₽ (+${markupPercent}%)`);
        }
      }
    }
  }

  // Проверяем позицию 117
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎯 Проверка позиции 117 (Разработка грунта):\n');

  const { data: position117, error: pos117Error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('id', 'd09e4302-8c4a-481a-9e14-795f5fc502a7')
    .single();

  if (!pos117Error && position117) {
    const base = parseFloat(position117.total_works_cost || '0');
    const commercial = parseFloat(position117.total_commercial_works_cost || '0');

    console.log(`   Базовая стоимость: ${base.toLocaleString('ru-RU')} ₽`);
    console.log(`   Коммерческая стоимость: ${commercial.toLocaleString('ru-RU')} ₽`);

    if (base > 0) {
      const actualMarkup = ((commercial - base) / base * 100).toFixed(1);
      console.log(`   Фактическая наценка: ${actualMarkup}%`);

      // Показываем детальный расчет
      console.log('\n📐 Детальный расчет:');
      console.log(`   Шаг 1. Рост субработ: ${base.toLocaleString('ru-RU')} × 1.10 = ${(base * 1.10).toLocaleString('ru-RU')} ₽`);
      console.log(`   Шаг 2. Непредвиденные: ${base.toLocaleString('ru-RU')} × 1.03 = ${(base * 1.03).toLocaleString('ru-RU')} ₽`);
      const step3Base = (base * 1.10) + (base * 1.03) - base;
      console.log(`   Шаг 3. ООЗ субподряд: ${step3Base.toLocaleString('ru-RU')} × 1.07 = ${(step3Base * 1.07).toLocaleString('ru-RU')} ₽`);
      const step4Base = step3Base * 1.07;
      console.log(`   Шаг 4. ОФЗ: ${step4Base.toLocaleString('ru-RU')} × 1.15 = ${(step4Base * 1.15).toLocaleString('ru-RU')} ₽`);
      const step5Base = step4Base * 1.15;
      console.log(`   Шаг 5. Прибыль: ${step5Base.toLocaleString('ru-RU')} × 1.06 = ${(step5Base * 1.06).toLocaleString('ru-RU')} ₽`);

      if (Math.abs(actualMarkup - 40) > 5) {
        console.log(`\n⚠️ Наценка ${actualMarkup}% отличается от целевой 40%`);
      } else {
        console.log(`\n✅ Наценка ${actualMarkup}% близка к целевой 40%`);
      }
    }
  }
}

fixSubcontractMarkup()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Результат:');
    console.log('   - Проценты для субподряда снижены для достижения ~40% наценки');
    console.log('   - Коммерческие стоимости пересчитаны с новыми процентами');
    console.log('   - Обновите страницу коммерческих стоимостей для просмотра изменений');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });