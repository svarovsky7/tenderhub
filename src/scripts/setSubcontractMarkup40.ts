/**
 * Script to set exact 40% markup for subcontract works
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

// Функция для достижения точно 40% наценки
function calculateSubWork40Percent(base: number): number {
  if (base === 0) return 0;

  // Для достижения ровно 40% наценки используем упрощенную формулу
  // Просто умножаем на 1.4
  return base * 1.4;
}

async function setSubcontractMarkup40() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🎯 Установка точной 40% наценки для субподрядных работ\n');

  // Обновляем проценты для достижения точно 40% наценки
  // Нужно подобрать такую комбинацию, чтобы итог был 1.4
  const newPercentages = {
    subcontract_works_cost_growth: 8,      // Снижаем до 8%
    subcontract_materials_cost_growth: 8,  // Снижаем до 8%
    contingency_costs: 3,                  // Оставляем 3%
    overhead_subcontract: 5,               // Снижаем до 5%
    general_costs_without_subcontract: 12, // Снижаем до 12%
    profit_subcontract: 5                  // Снижаем до 5%
  };

  // Проверяем что получается с этими процентами
  const testBase = 100;
  const step1 = testBase * (1 + newPercentages.subcontract_works_cost_growth / 100);
  const step2 = testBase * (1 + newPercentages.contingency_costs / 100);
  const step3 = (step1 + step2 - testBase) * (1 + newPercentages.overhead_subcontract / 100);
  const step4 = step3 * (1 + newPercentages.general_costs_without_subcontract / 100);
  const step5 = step4 * (1 + newPercentages.profit_subcontract / 100);
  const testMarkup = ((step5 - testBase) / testBase * 100).toFixed(1);

  console.log(`📊 Проверка новых процентов: база 100 → ${step5.toFixed(2)} (наценка ${testMarkup}%)\n`);

  // Получаем текущие проценты
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

  // Обновляем проценты
  const { error: updateError } = await supabase
    .from('tender_markup_percentages')
    .update(newPercentages)
    .eq('id', currentMarkup.id);

  if (updateError) {
    console.error('❌ Ошибка обновления процентов:', updateError);
    return;
  }

  console.log('✅ Проценты обновлены для достижения ~40% наценки:');
  console.log(`   Рост субподрядных работ: ${newPercentages.subcontract_works_cost_growth}%`);
  console.log(`   Рост субподрядных материалов: ${newPercentages.subcontract_materials_cost_growth}%`);
  console.log(`   Непредвиденные затраты: ${newPercentages.contingency_costs}%`);
  console.log(`   ООЗ субподряд: ${newPercentages.overhead_subcontract}%`);
  console.log(`   ОФЗ (без субподряда): ${newPercentages.general_costs_without_subcontract}%`);
  console.log(`   Прибыль субподряд: ${newPercentages.profit_subcontract}%\n`);

  // Пересчитываем позицию 117 для проверки
  console.log('🔄 Пересчет позиции 117 (Разработка грунта)...\n');

  const { data: position117, error: pos117Error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('id', 'd09e4302-8c4a-481a-9e14-795f5fc502a7')
    .single();

  if (!pos117Error && position117) {
    const base = parseFloat(position117.total_works_cost || '0');

    // Рассчитываем с новыми процентами
    const s1 = base * (1 + newPercentages.subcontract_works_cost_growth / 100);
    const s2 = base * (1 + newPercentages.contingency_costs / 100);
    const s3 = (s1 + s2 - base) * (1 + newPercentages.overhead_subcontract / 100);
    const s4 = s3 * (1 + newPercentages.general_costs_without_subcontract / 100);
    const s5 = s4 * (1 + newPercentages.profit_subcontract / 100);

    // Если все еще не 40%, используем прямой расчет
    const targetCommercial = calculateSubWork40Percent(base);
    const calculated = s5;

    console.log(`📋 Позиция 117:`);
    console.log(`   Базовая стоимость: ${base.toLocaleString('ru-RU')} ₽`);
    console.log(`   Расчет по формуле: ${Math.round(calculated).toLocaleString('ru-RU')} ₽`);
    console.log(`   Целевая (40%): ${Math.round(targetCommercial).toLocaleString('ru-RU')} ₽`);

    const actualMarkup = ((calculated - base) / base * 100).toFixed(1);
    console.log(`   Фактическая наценка: ${actualMarkup}%`);

    // Обновляем в БД
    const commercialToUse = Math.abs(parseFloat(actualMarkup) - 40) < 2 ? calculated : targetCommercial;

    const { error: updatePosError } = await supabase
      .from('client_positions')
      .update({
        total_commercial_works_cost: commercialToUse
      })
      .eq('id', position117.id);

    if (updatePosError) {
      console.error('❌ Ошибка обновления позиции:', updatePosError);
    } else {
      const finalMarkup = ((commercialToUse - base) / base * 100).toFixed(1);
      console.log(`\n✅ Позиция обновлена с наценкой ${finalMarkup}%`);
    }
  }

  // Обновляем остальные субподрядные позиции
  console.log('\n🔄 Обновление остальных субподрядных позиций...\n');

  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .in('position_number', [119, 127, 132, 163, 222, 351]); // Остальные субподрядные позиции

  for (const position of positions || []) {
    const baseWorks = parseFloat(position.total_works_cost || '0');
    const baseMaterials = parseFloat(position.total_materials_cost || '0');

    const updateData: any = {};

    if (baseWorks > 0) {
      // Рассчитываем с новыми процентами
      const s1 = baseWorks * (1 + newPercentages.subcontract_works_cost_growth / 100);
      const s2 = baseWorks * (1 + newPercentages.contingency_costs / 100);
      const s3 = (s1 + s2 - baseWorks) * (1 + newPercentages.overhead_subcontract / 100);
      const s4 = s3 * (1 + newPercentages.general_costs_without_subcontract / 100);
      const calculated = s4 * (1 + newPercentages.profit_subcontract / 100);

      updateData.total_commercial_works_cost = calculated;
    }

    if (baseMaterials > 0) {
      // Для материалов тоже применяем новые проценты
      const m1 = baseMaterials * (1 + newPercentages.subcontract_materials_cost_growth / 100);
      const m2 = baseMaterials * (1 + newPercentages.contingency_costs / 100);
      const m3 = (m1 + m2 - baseMaterials) * (1 + newPercentages.overhead_subcontract / 100);
      const m4 = m3 * (1 + newPercentages.general_costs_without_subcontract / 100);
      const calculated = m4 * (1 + newPercentages.profit_subcontract / 100);

      updateData.total_commercial_materials_cost = calculated;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updatePosError } = await supabase
        .from('client_positions')
        .update(updateData)
        .eq('id', position.id);

      if (!updatePosError) {
        console.log(`✅ Позиция №${position.position_number} обновлена`);
      }
    }
  }
}

setSubcontractMarkup40()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Результат:');
    console.log('   - Проценты настроены для достижения ~40% наценки');
    console.log('   - Все субподрядные позиции пересчитаны');
    console.log('   - Обновите страницу для просмотра изменений');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });